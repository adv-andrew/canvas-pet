chrome.runtime.onInstalled.addListener(() => {
  console.log('Canvas Pet installed')
})

// Runs inside the page's main world — must be self-contained (no closure references).
// chrome.scripting.executeScript serializes this function and injects it into the tab,
// bypassing the extension's isolated world and any CSP restrictions on inline scripts.
// password is passed via args — must be a plain parameter, no closures.
async function generateCanvasTokenInPage(password?: string): Promise<{
  token?: string
  blocked?: boolean
  error?: string
}> {
  const metaCsrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  const cookieEntry = document.cookie.split('; ').find((r) => r.startsWith('_csrf_token='))
  const cookieCsrf = cookieEntry ? decodeURIComponent(cookieEntry.split('=')[1]) : null
  const csrf = metaCsrf ?? cookieCsrf

  if (!csrf) return { error: 'Could not read Canvas CSRF token' }

  const params: Record<string, string> = {
    'token[purpose]': 'Canvas Pet',
    //Max token expiration date is 120 days so set to 1 day early to avoid invalid token
    'token[expires_at]': new Date(Date.now() + 119 * 24 * 60 * 60 * 1000).toISOString(),
  }
  if (password) params['pseudonym[password]'] = password

  const res = await fetch('/api/v1/users/self/tokens', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-Token': csrf,
    },
    body: new URLSearchParams(params).toString(),
  })

  if (res.status === 401 || res.status === 403) return { blocked: true }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { error: `Canvas API error: ${res.status} — ${body.slice(0, 200)}` }
  }

  const data = (await res.json()) as { token?: string }
  return data.token ? { token: data.token } : { error: 'No token in response' }
}

// Centralises chrome.storage.session access so content scripts on any origin
// (including HTTP localhost) can read and write the canvas data cache.
chrome.runtime.onMessage.addListener(
  (
    msg: { type: string; data?: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (r: { ok?: boolean; data?: unknown | null }) => void,
  ) => {
    if (msg.type === 'GET_CANVAS_CACHE') {
      chrome.storage.session.get('cp_canvas_cache').then((result) => {
        sendResponse({ data: result['cp_canvas_cache'] ?? null })
      })
      return true
    }
    if (msg.type === 'SAVE_CANVAS_CACHE') {
      chrome.storage.session.set({ cp_canvas_cache: msg.data }).then(() => {
        sendResponse({ ok: true })
      })
      return true
    }
    return false
  },
)

chrome.runtime.onMessage.addListener(
  (
    msg: { type: string; password?: string },
    sender: chrome.runtime.MessageSender,
    sendResponse: (r: { result: { token?: string; blocked?: boolean; error?: string } }) => void,
  ) => {
    if (msg.type !== 'GENERATE_CANVAS_TOKEN') return false

    const resolveTabId = (): Promise<number | undefined> => {
      if (sender.tab?.id !== undefined) return Promise.resolve(sender.tab.id)
      // Called from popup — find the active Canvas tab
      return chrome.tabs.query({ active: true, currentWindow: true }).then(
        (tabs) => tabs.find((t) => t.url?.includes('.instructure.com'))?.id,
      )
    }

    resolveTabId()
      .then((tabId) => {
        console.log('[CP background] GENERATE_CANVAS_TOKEN received — tabId:', tabId)

        if (!tabId) {
          console.error('[CP background] No Canvas tab found')
          sendResponse({ result: { error: 'No Canvas tab open. Navigate to Canvas first.' } })
          return
        }

        return chrome.scripting
          .executeScript({
            target: { tabId },
            world: 'MAIN',
            func: generateCanvasTokenInPage,
            args: msg.password ? [msg.password] : [],
          })
          .then((results) => {
            const result = results[0]?.result as { token?: string; blocked?: boolean; error?: string } | undefined
            console.log('[CP background] executeScript result:', result)
            sendResponse({ result: result ?? { error: 'No result from page' } })
          })
      })
      .catch((err: Error) => {
        console.error('[CP background] executeScript threw:', err.message)
        sendResponse({ result: { error: err.message } })
      })

    return true // keep message channel open for async response
  },
)
