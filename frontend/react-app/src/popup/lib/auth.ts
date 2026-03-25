import { supabaseAuth } from './supabaseAuthClient'

// Links a Google account to the current Canvas Pet account using Chrome's
// identity API (extension popups cannot receive standard OAuth redirects).
// After linking, signing in with Google on the web app will access the same
// account and all associated data.
//
// Prerequisites (set up manually in Supabase dashboard):
//   1. Authentication → Providers → Google: enable, add Client ID + Secret
//   2. Authentication → URL Configuration → Redirect URLs:
//      add https://<extension-id>.chromiumapp.org/
//      (find extension ID at chrome://extensions in developer mode)
export async function linkGoogleAccount(): Promise<void> {
  const redirectTo = chrome.identity.getRedirectURL()

  const { data, error } = await supabaseAuth.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error || !data.url) throw new Error(error?.message ?? 'Failed to start Google link')

  const redirectUrl = await new Promise<string>((resolve, reject) =>
    chrome.identity.launchWebAuthFlow({ url: data.url, interactive: true }, (url) => {
      if (chrome.runtime.lastError || !url) {
        reject(new Error(chrome.runtime.lastError?.message ?? 'Auth cancelled'))
      } else {
        resolve(url)
      }
    }),
  )

  const code = new URL(redirectUrl).searchParams.get('code')
  if (!code) throw new Error('No authorization code in redirect URL')

  const { error: sessionError } = await supabaseAuth.auth.exchangeCodeForSession(code)
  if (sessionError) throw new Error(sessionError.message)
}
