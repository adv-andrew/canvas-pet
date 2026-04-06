import { verifyJwt } from './verifyJwt'
import { getSupabaseAdmin } from './supabaseAdmin'

export async function requireAdmin(authHeader: string | null): Promise<{ userId: string }> {
  const { userId } = await verifyJwt(authHeader)
  const { data } = await getSupabaseAdmin()
    .from('canvas_users')
    .select('role')
    .or(`id.eq.${userId},web_user_id.eq.${userId}`)
    .maybeSingle()
  if (!data || data.role !== 'admin') {
    throw new Error('Admin access required')
  }
  return { userId }
}
