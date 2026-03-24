// Passive content script — only responds to messages from the popup.
// Does not inject anything into the Canvas page DOM.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'FETCH_PLANNER_ITEMS') {
    Promise.all([
      fetch('/api/v1/planner/items?per_page=50&order=asc', {
        credentials: 'include',
      }).then((r) => {
        if (!r.ok) throw new Error(`Canvas API error: ${r.status}`)
        return r.json()
      }),
      fetch('/api/v1/users/self', {
        credentials: 'include',
      }).then((r) => {
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
      .then(([items, user, activityStream]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const announcements = (activityStream as any[]).filter(
          (a) => a.type === 'Announcement',
        )
        sendResponse({
          success: true,
          items,
          announcements,
          userId: String(user.id),
          institutionUrl: window.location.origin,
        })
      })
      .catch((err: Error) => {
        sendResponse({ success: false, error: err.message })
      })
    return true // keep channel open for async response
  }
})
