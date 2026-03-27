// chrome.storage.sync helpers
// Token-based auth is scaffolded here but not active yet.
// The extension currently uses session-based auth via the content script.

export interface ExtensionSettings {
  canvasToken: string | null
  institutionUrl: string | null
}

export async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['canvasToken', 'institutionUrl'], (result) => {
      resolve({
        canvasToken: (result.canvasToken as string) ?? null,
        institutionUrl: (result.institutionUrl as string) ?? null,
      })
    })
  })
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, resolve)
  })
}

export async function clearSettings(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.remove(['canvasToken', 'institutionUrl'], resolve)
  })
}

// Convenience stubs for future token-based auth
export async function getToken(): Promise<string | null> {
  const { canvasToken } = await getSettings()
  return canvasToken
}

export async function saveToken(token: string): Promise<void> {
  await saveSettings({ canvasToken: token })
}

export async function clearToken(): Promise<void> {
  await saveSettings({ canvasToken: null })
}
