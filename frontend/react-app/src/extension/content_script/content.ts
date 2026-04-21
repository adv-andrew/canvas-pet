const PANEL_URL = chrome.runtime.getURL('panel.html')
const NAV_WIDTH = 62 // Canvas global nav column width in px
const DEFAULT_WIDTH = 760
const MIN_WIDTH = 160
const STORAGE_MODE_KEY = 'cp_mode'
const STORAGE_WIDTH_KEY = 'cp_width'

let iframe: HTMLIFrameElement | null = null
let container: HTMLDivElement | null = null
let restoreTab: HTMLButtonElement | null = null
let panelWidth = DEFAULT_WIDTH
let lastSavedWidth = DEFAULT_WIDTH

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

// --- Canvas data fetching (same origin) ---

function getSemesterDateRange(): { startDate: string; endDate: string } {
  const d = new Date()
  const month = d.getMonth() // 0-indexed; Aug=7
  const year = d.getFullYear()
  const start = month >= 7
    ? new Date(year, 7, 1)    // Aug 1 — fall semester start
    : new Date(year, 0, 1)    // Jan 1 — spring semester start
  const end = month >= 7
    ? new Date(year, 11, 31)  // Dec 31 — fall semester end
    : new Date(year, 6, 31)   // Jul 31 — spring semester end
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

async function fetchCanvasData() {
  const { startDate, endDate } = getSemesterDateRange()
  const today = new Date().toISOString().split('T')[0]

  // Canvas caps per_page at 50. Fetching the full semester in one ascending request
  // fills all 50 slots with past items before any upcoming ones appear.
  // Two requests guarantee both past (most recent 50) and upcoming (next 50) are present.
  const plannerFetch = (params: string) =>
    fetch(`/api/v1/planner/items?per_page=50&${params}`, { credentials: 'include' }).then((r) => {
      if (!r.ok) throw new Error(`Canvas planner error: ${r.status}`)
      return r.json() as Promise<unknown[]>
    })

  const [pastItems, upcomingItems, user, stream] = await Promise.all([
    // Most recent 50 past items — desc so Canvas gives us the closest-to-today ones first
    plannerFetch(`order=desc&start_date=${startDate}&end_date=${today}`),
    // Next 50 upcoming items from today onwards
    plannerFetch(`order=asc&start_date=${today}&end_date=${endDate}`),
    fetch('/api/v1/users/self', { credentials: 'include' }).then((r) => {
      if (!r.ok) throw new Error(`Canvas API error: ${r.status}`)
      return r.json()
    }),
    fetch('/api/v1/users/self/activity_stream?only_active_courses=true&per_page=50', {
      credentials: 'include',
    }).then((r) => {
      if (!r.ok) throw new Error(`Canvas API error: ${r.status}`)
      return r.json()
    }),
  ])
  const origin = globalThis.location.origin

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const announcements = (stream as any[]).filter((a) => a.type === 'Announcement').map((a: any) => {
    const url: string | undefined = a.html_url
    if (url && !url.startsWith('http')) {
      return { ...a, html_url: `${origin}${url}` }
    }
    return a
  })

  // Merge past (reversed to restore chronological order) + upcoming, deduplicating
  // items that fall on today and therefore appear in both fetches.
  const seenIds = new Set<number>()
  const mergedItems: unknown[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of [...(pastItems as any[]).reverse(), ...(upcomingItems as any[])]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = (item as any).plannable_id
    if (!seenIds.has(id)) {
      seenIds.add(id)
      mergedItems.push(item)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log(`[CP] past:${(pastItems as any[]).length} upcoming:${(upcomingItems as any[]).length} merged:${mergedItems.length}`)

  // Strip announcement-type planner items and ensure every item has an absolute html_url.
  // The Canvas planner API sometimes omits plannable.html_url or returns a relative path;
  // in either case we construct a canonical absolute URL from the known course/item IDs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredItems = mergedItems.filter((item: any) => item.plannable_type !== 'announcement').map((item: any) => {
    let url: string | undefined = item.plannable?.html_url
    if (url && !url.startsWith('http')) {
      url = `${origin}${url}`
    } else if (!url && item.course_id != null) {
      // Canvas didn't provide html_url — construct one from known identifiers
      let typePath: string
      if (item.plannable_type === 'quiz') typePath = 'quizzes'
      else if (item.plannable_type === 'discussion_topic') typePath = 'discussion_topics'
      else typePath = 'assignments'
      url = `${origin}/courses/${item.course_id}/${typePath}/${item.plannable_id}`
    }
    if (url !== item.plannable?.html_url) {
      return { ...item, plannable: { ...item.plannable, html_url: url ?? '' } }
    }
    return item
  })
  const data = {
    items: filteredItems,
    announcements,
    userId: String((user as { id: number }).id),
    institutionUrl: window.location.origin,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayName: (user as any).name ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    email: (user as any).primary_email ?? (user as any).email ?? (user as any).login_id ?? null,
  }
  // Route the write through the background service worker — direct chrome.storage.session
  // access is unreliable from content scripts and silently fails on some origins.
  chrome.runtime.sendMessage({ type: 'SAVE_CANVAS_CACHE', data })
  return data
}

// chrome.storage.session is blocked on HTTP origins (e.g. localhost dev server).
// Route the read through the background service worker which always has access.
function getCanvasDataFromCache(): Promise<Awaited<ReturnType<typeof fetchCanvasData>> | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_CANVAS_CACHE' }, (response: { data: unknown } | undefined) => {
      if (chrome.runtime.lastError) {
        resolve(null)
      } else {
        resolve((response?.data as Awaited<ReturnType<typeof fetchCanvasData>>) ?? null)
      }
    })
  })
}

// --- Canvas token generation ---

// --- Canvas token generation ---
// Delegates to the background service worker which uses chrome.scripting.executeScript
// with world: 'MAIN' to run the fetch inside the page's real JS context.
// This avoids two problems that affect content scripts directly:
//   1. Chrome sets Origin: chrome-extension://... on content-script POSTs,
//      causing Canvas's CSRF check to reject the request with 401.
//   2. Injected <script> tags are blocked by Canvas's Content-Security-Policy.
function generateCanvasToken(password?: string): Promise<{ token?: string; blocked?: boolean; error?: string }> {
  console.log('[CP content] sending GENERATE_CANVAS_TOKEN to background')
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'GENERATE_CANVAS_TOKEN', password },
        (response: { result: { token?: string; blocked?: boolean; error?: string } }) => {
          if (chrome.runtime.lastError) {
            const msg = chrome.runtime.lastError.message ?? 'Background error'
            console.error('[CP content] runtime.lastError:', msg)
            const isInvalidated = msg.toLowerCase().includes('invalidated') || msg.toLowerCase().includes('context')
            resolve({ error: isInvalidated ? 'RELOAD_PAGE' : msg })
          } else {
            console.log('[CP content] response from background:', response)
            resolve(response?.result ?? { error: 'No response from background' })
          }
        },
      )
    } catch (err) {
      // chrome.runtime.sendMessage itself throws when context is invalidated
      console.error('[CP content] sendMessage threw:', err)
      resolve({ error: 'RELOAD_PAGE' })
    }
  })
}

// --- Canvas To Do hiding ---

function hideTodoElements() {
  ;['#right-side-wrapper', '.right-side', '#todo-list', '.todo-list-header'].forEach((sel) => {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.style.display = 'none'
    })
  })
}

// --- Body margin (shifts Canvas content left to make room for panel) ---

function applyBodyMargin(width: number) {
  const wrapper = document.querySelector<HTMLElement>('#wrapper') ?? document.body
  wrapper.style.marginRight = `${width}px`
  wrapper.style.transition = 'margin-right 0.15s'
}

function clearBodyMargin() {
  const wrapper = document.querySelector<HTMLElement>('#wrapper') ?? document.body
  wrapper.style.marginRight = ''
}

// --- Mode management ---

/** Applies DOM styles for the given mode. Does not notify the iframe. */
function applyModeStyles(mode: 'sidebar' | 'fullscreen' | 'minimized') {
  if (!container || !restoreTab) return

  if (mode === 'sidebar') {
    Object.assign(container.style, {
      display: 'block',
      position: 'fixed',
      top: '0',
      right: '0',
      left: 'auto',
      width: `min(${panelWidth}px, 100vw)`,
      height: '100vh',
      zIndex: '9999',
      overflow: 'hidden',
    })
    restoreTab.style.display = 'none'
    applyBodyMargin(panelWidth)
  } else if (mode === 'fullscreen') {
    Object.assign(container.style, {
      display: 'block',
      position: 'fixed',
      top: '0',
      left: `${NAV_WIDTH}px`,
      right: '0',
      width: `calc(100vw - ${NAV_WIDTH}px)`,
      height: '100vh',
      zIndex: '9999',
    })
    restoreTab.style.display = 'none'
    clearBodyMargin()
  } else {
    container.style.display = 'none'
    restoreTab.style.display = 'flex'
    clearBodyMargin()
  }
}

/**
 * Called from the content script side (e.g. restore tab click).
 * Applies DOM styles AND notifies the iframe so it can update its button state.
 */
function applyMode(mode: 'sidebar' | 'fullscreen' | 'minimized') {
  if (mode === 'fullscreen') {
    lastSavedWidth = panelWidth
  } else if (mode === 'sidebar') {
    panelWidth = lastSavedWidth
  }
  applyModeStyles(mode)
  sessionStorage.setItem(STORAGE_MODE_KEY, mode)
  if (mode !== 'minimized') {
    iframe?.contentWindow?.postMessage({ type: 'SET_MODE', mode }, '*')
  }
}

// --- Init ---
async function init() {
  // Create container + iframe
  container = document.createElement('div')
  container.id = 'cp-container'
  container.style.cssText = 'box-sizing:border-box;position:relative;'

  iframe = document.createElement('iframe')
  iframe.src = PANEL_URL
  iframe.id = 'cp-frame'
  iframe.allow = 'popups'  // required for target="_blank" links inside the chrome-extension iframe
  iframe.style.cssText = 'width:100%;height:100%;border:none;'
  container.appendChild(iframe)

  // Drag handle on the left edge
  const dragHandle = document.createElement('div')
  dragHandle.id = 'cp-drag'
  dragHandle.style.cssText = [
    'position:absolute',
    'left:0',
    'top:0',
    'width:6px',
    'height:100%',
    'cursor:ew-resize',
    'z-index:10001',
    'background:transparent',
  ].join(';')
  container.appendChild(dragHandle)

  dragHandle.addEventListener('mousedown', (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = panelWidth

    // Disable pointer events on iframe so mouse events aren't captured by it during drag
    if (iframe) iframe.style.pointerEvents = 'none'

    function onMouseMove(ev: MouseEvent) {
      panelWidth = Math.max(MIN_WIDTH, startWidth + (startX - ev.clientX))
      container!.style.width = `${panelWidth}px`
      applyBodyMargin(panelWidth)
    }
    function onMouseUp() {
      if (iframe) iframe.style.pointerEvents = ''
      lastSavedWidth = panelWidth
      sessionStorage.setItem(STORAGE_WIDTH_KEY, String(panelWidth))
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  })

  // Create restore tab (visible only when minimized)
  restoreTab = document.createElement('button')
  restoreTab.id = 'cp-restore'
  restoreTab.textContent = '◀ Canvas Pet'
  restoreTab.style.cssText = [
    'display:none',
    'position:fixed',
    'right:-32px',
    'top:50%',
    'transform:translateY(-50%) rotate(-90deg) translateX(50%)',
    'transform-origin:center center',
    'background:#e53e3e',
    'color:white',
    'border:none',
    'padding:6px 14px',
    'border-radius:4px 4px 0 0',
    'cursor:pointer',
    'font-size:13px',
    'font-weight:600',
    'z-index:9999',
    'white-space:nowrap',
    'align-items:center',
    'justify-content:center',
  ].join(';')
  restoreTab.onclick = () => applyMode('sidebar')
  document.body.appendChild(restoreTab)

  // Continuously hide Canvas's To Do column on any page (handles SPA re-renders)
  hideTodoElements()
  const todoObserver = new MutationObserver(hideTodoElements)
  todoObserver.observe(document.body, { childList: true, subtree: true })

  // Restore saved state (persists across Canvas page navigations within the same tab)
  const savedWidth = parseInt(sessionStorage.getItem(STORAGE_WIDTH_KEY) ?? '', 10)
  if (!isNaN(savedWidth) && savedWidth >= MIN_WIDTH) {
    panelWidth = savedWidth
    lastSavedWidth = savedWidth
  }
  const savedMode = (sessionStorage.getItem(STORAGE_MODE_KEY) ?? 'sidebar') as 'sidebar' | 'fullscreen' | 'minimized'
  applyModeStyles(savedMode)
  document.body.appendChild(container)

  // Send Canvas data once iframe has loaded
  iframe.addEventListener('load', () => {
    fetchCanvasData()
      .then((data) => {
        iframe!.contentWindow?.postMessage({ type: 'CANVAS_DATA', payload: data }, '*')
      })
      .catch((err: Error) => {
        iframe!.contentWindow?.postMessage({ type: 'CANVAS_ERROR', error: err.message }, '*')
      })
  })

  // Handle messages from iframe
  window.addEventListener('message', (e) => {
    if (e.source !== iframe?.contentWindow) return
    if (e.data?.type === 'SET_MODE') {
      const newMode = e.data.mode as 'sidebar' | 'fullscreen' | 'minimized'
      if (newMode === 'fullscreen') lastSavedWidth = panelWidth
      else if (newMode === 'sidebar') panelWidth = lastSavedWidth
      // iframe already updated its own state — just apply DOM styles without notifying it back
      applyModeStyles(newMode)
      sessionStorage.setItem(STORAGE_MODE_KEY, newMode)
    } else if (e.data?.type === 'REFETCH') {
      fetchCanvasData()
        .then((data) => {
          iframe?.contentWindow?.postMessage({ type: 'CANVAS_DATA', payload: data }, '*')
        })
        .catch((err: Error) => {
          iframe?.contentWindow?.postMessage({ type: 'CANVAS_ERROR', error: err.message }, '*')
        })
    } else if (e.data?.type === 'OPEN_URL') {
      const rawUrl = e.data.url as string
      if (!rawUrl) return
      // Resolve relative paths using the Canvas page origin so chrome.tabs.create always
      // receives an absolute URL (the panel iframe has a chrome-extension:// base URL
      // which makes browser-resolved anchor.href incorrect for Canvas relative paths).
      const url = rawUrl.startsWith('http') ? rawUrl : `${location.origin}${rawUrl}`
      chrome.tabs.create({ url }).catch(() => {})
    } else if (e.data?.type === 'GENERATE_CANVAS_TOKEN') {
      console.log('[CP content] GENERATE_CANVAS_TOKEN received from panel iframe')
      generateCanvasToken(e.data.password as string | undefined).then((result) => {
        console.log('[CP content] forwarding CANVAS_TOKEN_RESULT to panel:', result)
        iframe?.contentWindow?.postMessage({ type: 'CANVAS_TOKEN_RESULT', result }, '*')
      })
    }
  })
}

// On localhost: skip panel injection, act as a silent data bridge only.
// Reads cached Canvas data from chrome.storage.session and posts it to the
// page via window.postMessage so the webapp can consume it natively.
async function initBridge() {
  const data = await getCanvasDataFromCache()
  if (data) {
    window.postMessage({ type: 'CP_CANVAS_DATA', payload: data }, '*')
  }
  // Also respond to explicit requests from the webapp (handles the race where
  // the webapp's useEffect registered its listener before this function ran)
  window.addEventListener('message', (e) => {
    if (e.origin !== window.location.origin) return
    if (e.data?.type !== 'CP_REQUEST_DATA') return
    getCanvasDataFromCache().then((cached) => {
      if (cached) window.postMessage({ type: 'CP_CANVAS_DATA', payload: cached }, '*')
    })
  })
}

if (isLocalhost) {
  void initBridge()
} else {
  void init()
}
