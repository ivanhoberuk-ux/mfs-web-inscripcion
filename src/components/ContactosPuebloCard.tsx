import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, Linking } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { colors, spacing, radius, shadows } from '../lib/designSystem'

type Contacto = {
  nombres: string
  apellidos: string
  telefono: string
  email: string
  rol: string
}

type PuebloGroup = {
  puebloId: string
  puebloNombre: string
  contactos: Contacto[]
}

export function ContactosPuebloCard() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<PuebloGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user?.email) { setLoading(false); return }
      try {
        const { data: regs } = await supabase
          .from('registros')
          .select('pueblo_id, pueblos:pueblo_id(nombre)')
          .ilike('email', user.email)
          .is('deleted_at', null)

        const pueblosMap = new Map<string, string>()
        ;(regs || []).forEach((r: any) => {
          if (r.pueblo_id && !pueblosMap.has(r.pueblo_id)) {
            pueblosMap.set(r.pueblo_id, r.pueblos?.nombre || 'Pueblo')
          }
        })

        const results: PuebloGroup[] = []
        for (const [pid, pnombre] of pueblosMap.entries()) {
          const { data } = await supabase.rpc('get_pueblo_contacts', { p_pueblo_id: pid })
          results.push({ puebloId: pid, puebloNombre: pnombre, contactos: (data as Contacto[]) || [] })
        }
        if (mounted) setGroups(results)
      } catch (e) {
        console.error('Error fetching contactos pueblo:', e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [user?.email])

  if (loading || groups.length === 0) return null

  const cleanPhone = (t: string) => t.replace(/[^\d+]/g, '')
  const waLink = (t: string) => {
    let p = cleanPhone(t)
    if (!p) return null
    if (p.startsWith('+')) p = p.slice(1)
    if (p.startsWith('0')) p = '595' + p.slice(1)
    return `https://wa.me/${p}`
  }

  return (
    <View style={{
      width: '100%',
      backgroundColor: colors.surface.light,
      borderRadius: radius.lg,
      padding: spacing.lg,
      ...shadows.md,
      borderWidth: 2,
      borderColor: colors.primary[200],
      gap: 12,
    }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary[700] }}>
        📞 Contactos para informes del pueblo
      </Text>
      {groups.map((g) => (
        <View key={g.puebloId} style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary[600] }}>
            🏠 {g.puebloNombre}
          </Text>
          {g.contactos.length === 0 ? (
            <Text style={{ fontSize: 12, color: colors.text.tertiary.light, fontStyle: 'italic' }}>
              Aún no hay contactos cargados.
            </Text>
          ) : (
            g.contactos.map((c, i) => {
              const nombre = `${c.nombres} ${c.apellidos}`.trim() || c.email
              const wa = c.telefono ? waLink(c.telefono) : null
              return (
                <View key={i} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: colors.primary[50],
                  borderRadius: radius.md,
                  padding: 10,
                  gap: 8,
                  flexWrap: 'wrap',
                }}>
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary[800] }}>
                      {nombre}
                    </Text>
                    {c.telefono ? (
                      <Text style={{ fontSize: 12, color: colors.text.secondary.light, marginTop: 2 }}>
                        📱 {c.telefono}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 11, color: colors.text.tertiary.light, fontStyle: 'italic', marginTop: 2 }}>
                        Sin teléfono cargado
                      </Text>
                    )}
                  </View>
                  {c.telefono ? (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable
                        onPress={() => Linking.openURL(`tel:${cleanPhone(c.telefono)}`)}
                        style={({ pressed }) => ({
                          backgroundColor: colors.primary[600],
                          paddingHorizontal: 12, paddingVertical: 8,
                          borderRadius: radius.md,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>📞 Llamar</Text>
                      </Pressable>
                      {wa && (
                        <Pressable
                          onPress={() => Linking.openURL(wa)}
                          style={({ pressed }) => ({
                            backgroundColor: '#25D366',
                            paddingHorizontal: 12, paddingVertical: 8,
                            borderRadius: radius.md,
                            opacity: pressed ? 0.8 : 1,
                          })}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>💬 WhatsApp</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : null}
                </View>
              )
            })
          )}
        </View>
      ))}
    </View>
  )
}
