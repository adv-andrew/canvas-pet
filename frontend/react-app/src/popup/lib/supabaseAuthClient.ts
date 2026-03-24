import { createClient } from '@supabase/supabase-js'

// This client is used ONLY for Supabase Auth (anonymous sign-in, getSession,
// token refresh). All database operations go through the Next.js backend —
// never through this client directly.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// chrome.storage.local adapter so the Supabase Auth session persists across
// popup open/close cycles (the popup window is destroyed each time it closes).
const chromeStorageAdapter = {
  getItem: (key: string): Promise<string | null> =>
    new Promise((resolve) =>
      chrome.storage.local.get(key, (result) =>
        resolve((result[key] as string) ?? null),
      ),
    ),
  setItem: (key: string, value: string): Promise<void> =>
    new Promise((resolve) =>
      chrome.storage.local.set({ [key]: value }, resolve),
    ),
  removeItem: (key: string): Promise<void> =>
    new Promise((resolve) =>
      chrome.storage.local.remove(key, resolve),
    ),
}

export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: chromeStorageAdapter },
})
