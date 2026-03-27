const PANEL_URL = chrome.runtime.getURL('panel.html')
const NAV_WIDTH = 62 // Canvas global nav column width in px
const DEFAULT_WIDTH = 760
const MIN_WIDTH = 280

let iframe: HTMLIFrameElement | null = null
let container: HTMLDivElement | null = null
let restoreTab: HTMLButtonElement | null = null
let panelWidth = DEFAULT_WIDTH
let lastSavedWidth = DEFAULT_WIDTH

function isDashboard() {
  return ['/', '/dashboard', '/dashboard-sidebar'].some(
    (p) => window.location.pathname === p || window.location.pathname.startsWith(p + '#'),
  )
}

// --- Canvas data fetching (same origin) ---
async function fetchCanvasData() {
  const [items, user, stream] = await Promise.all([
    fetch('/api/v1/planner/items?per_page=50&order=asc', { credentials: 'include' }).then((r) => {
      if (!r.ok) throw new Error(`Canvas API error: ${r.status}`)
      return r.json()
    }),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const announcements = (stream as any[]).filter((a) => a.type === 'Announcement')
  return {
    items,
    announcements,
    userId: String((user as { id: number }).id),
    institutionUrl: window.location.origin,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayName: (user as any).name ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    email: (user as any).primary_email ?? (user as any).email ?? (user as any).login_id ?? null,
  }
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
      width: '380px',
      height: '100vh',
      zIndex: '9999',
    })
    restoreTab.style.display = 'none'
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
  } else {
    container.style.display = 'none'
    restoreTab.style.display = 'flex'
  }
}

/**
 * Called from the content script side (e.g. restore tab click).
 * Applies DOM styles AND notifies the iframe so it can update its button state.
 */
function applyMode(mode: 'sidebar' | 'fullscreen' | 'minimized') {
  applyModeStyles(mode)
  if (mode !== 'minimized') {
    iframe?.contentWindow?.postMessage({ type: 'SET_MODE', mode }, '*')
  }
}

function waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector)
    if (el) return resolve(el)
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector)
      if (found) {
        observer.disconnect()
        resolve(found)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)
  })
}

// --- Init ---
async function init() {
  // Create container + iframe
  container = document.createElement('div')
  container.id = 'cp-container'
  container.style.cssText = 'box-sizing:border-box;'

  iframe = document.createElement('iframe')
  iframe.src = PANEL_URL
  iframe.id = 'cp-frame'
  iframe.style.cssText = 'width:100%;height:100%;border:none;'
  container.appendChild(iframe)

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

  // On dashboard: hide Canvas's tasks column so our panel takes its place visually
  if (isDashboard()) {
    void waitForElement('#right-side-wrapper, .right-side').then((el) => {
      if (el) (el as HTMLElement).style.display = 'none'
    })
  }

  // Start in sidebar mode
  applyMode('sidebar')
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
      // iframe already updated its own state — just apply DOM styles without notifying it back
      applyModeStyles(e.data.mode as 'sidebar' | 'fullscreen' | 'minimized')
    } else if (e.data?.type === 'REFETCH') {
      fetchCanvasData()
        .then((data) => {
          iframe?.contentWindow?.postMessage({ type: 'CANVAS_DATA', payload: data }, '*')
        })
        .catch((err: Error) => {
          iframe?.contentWindow?.postMessage({ type: 'CANVAS_ERROR', error: err.message }, '*')
        })
    } else if (e.data?.type === 'GENERATE_CANVAS_TOKEN') {
      console.log('[CP content] GENERATE_CANVAS_TOKEN received from panel iframe')
      generateCanvasToken(e.data.password as string | undefined).then((result) => {
        console.log('[CP content] forwarding CANVAS_TOKEN_RESULT to panel:', result)
        iframe?.contentWindow?.postMessage({ type: 'CANVAS_TOKEN_RESULT', result }, '*')
      })
    }
  })
}

void init()
