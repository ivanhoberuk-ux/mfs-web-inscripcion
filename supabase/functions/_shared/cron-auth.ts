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

/**
 * Cron, super admin, o coordinador (pueblo_admin/co_admin_pueblo) del pueblo indicado.
 * Devuelve { ok, tipo: 'cron'|'super'|'coordinador' }.
 */
export async function isCronAdminOrCoordinador(req: Request, supabase: any, puebloId?: string | null) {
  const secret = req.headers.get('x-cron-secret')
  if (secret) {
    const { data, error } = await supabase.rpc('verify_cron_secret', { p_secret: secret })
    if (!error && data === true) return { ok: true, tipo: 'cron' }
  }
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { ok: false }
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (!user) return { ok: false }
  const { data: isAdmin } = await supabase.rpc('is_super_admin', { _user_id: user.id })
  if (isAdmin) return { ok: true, tipo: 'super' }
  if (!puebloId) return { ok: false }
  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id)
  const esCoord = (roles ?? []).some((r: any) => r.role === 'pueblo_admin' || r.role === 'co_admin_pueblo')
  if (!esCoord) return { ok: false }
  const { data: prof } = await supabase.from('profiles').select('pueblo_id').eq('id', user.id).maybeSingle()
  return prof?.pueblo_id === puebloId ? { ok: true, tipo: 'coordinador' } : { ok: false }
}
