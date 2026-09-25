// @ts-nocheck
/** Acepta x-cron-secret válido (verificado por RPC) o JWT de super admin. */
export async function isCronOrSuperAdmin(req: Request, supabase: any): Promise<boolean> {
  const secret = req.headers.get('x-cron-secret')
  if (secret) {
    const { data, error } = await supabase.rpc('verify_cron_secret', { p_secret: secret })
    if (!error && data === true) return true
  }
  const authHeader = req.headers.get('Authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) {
      const { data: isAdmin } = await supabase.rpc('is_super_admin', { _user_id: user.id })
      if (isAdmin) return true
    }
  }
  return false
}
