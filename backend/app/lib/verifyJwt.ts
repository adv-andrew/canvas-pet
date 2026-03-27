import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

// Validates the Bearer JWT sent by the client and returns the Supabase Auth
// user ID. Uses supabase.auth.getUser() so expiry, signature, and revocation
// are all checked server-side without managing the JWT secret locally.
export async function verifyJwt(authHeader: string | null): Promise<{ userId: string }> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header')
  }
  const token = authHeader.slice(7)
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    throw new Error('Invalid or expired JWT')
  }
  return { userId: data.user.id }
}
