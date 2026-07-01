export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { normalizarNicho } from '@/lib/config/produtos-segmentos'
import { FormMinhaConta } from './FormMinhaConta'

export type LojaData = {
  id: string
  nome: string
  documento: string | null
  email: string | null
  whatsapp: string | null
  cidade: string | null
  endereco: string | null
  cep: string | null
  rua: string | null
  numero: string | null
  bairro: string | null
  estado: string | null
  complemento: string | null
  nicho: string
}

export type AssinaturaItem = {
  id: string
  tipo: 'loja' | 'rede'
  status: string
  valor_pago: number | null
  prazo_acesso: string | null
  criado_em: string
  aplicado_em: string | null
  loja_nome: string | null
}

export type LojaVinculada = {
  id: string
  nome: string
}

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export default async function MinhaContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: membrosData } = await admin
    .from('membros_loja')
    .select('role, loja_id, lojas(id, nome, documento, email, whatsapp, cidade, endereco, cep, rua, numero, bairro, estado, complemento, nichos)')
    .eq('perfil_id', user.id)
    .eq('ativo', true)

  if (!membrosData || membrosData.length === 0) redirect('/sem-acesso')

  const role = membrosData.reduce((best: string, m) => {
    const mRole = m.role as string
    return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
  }, membrosData[0].role as string)

  const podeEditar = ['dono', 'gerente', 'admin_f5'].includes(role)

  // Fetch liberações before building lojas — isRede depends on this
  const { data: libData } = await admin
    .from('liberacoes_acesso')
    .select('id, tipo, status, valor_pago, prazo_acesso, criado_em, aplicado_em, loja_id')
    .eq('email', (user.email ?? '').toLowerCase())
    .order('criado_em', { ascending: false })

  // isRede is determined solely by whether this email has an active tipo='rede' liberação.
  // Role/multi-loja access is irrelevant here — a dono with +Acesso to extra lojas is still a loja user.
  const isRede = (libData ?? []).some(
    l => l.tipo === 'rede' && ['aplicado', 'ativo'].includes(l.status as string)
  )

  // Build deduplicated lojas
  const seen = new Set<string>()
  const todasLojas: LojaData[] = []

  for (const m of membrosData) {
    type LojaRaw = {
      id: string; nome: string; documento: string | null; email: string | null
      whatsapp: string | null; cidade: string | null; endereco: string | null
      cep: string | null; rua: string | null; numero: string | null
      bairro: string | null; estado: string | null; complemento: string | null
      nichos: string[] | null
    }
    const lojaRaw = m.lojas as unknown as LojaRaw | LojaRaw[] | null
    const lojaItem = Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw
    if (!lojaItem || seen.has(lojaItem.id)) continue
    seen.add(lojaItem.id)

    const rawNicho = Array.isArray(lojaItem.nichos) ? (lojaItem.nichos[0] ?? '') : ''

    todasLojas.push({
      id: lojaItem.id,
      nome: lojaItem.nome,
      documento: lojaItem.documento,
      email: lojaItem.email,
      whatsapp: lojaItem.whatsapp,
      cidade: lojaItem.cidade,
      endereco: lojaItem.endereco,
      cep: lojaItem.cep,
      rua: lojaItem.rua,
      numero: lojaItem.numero,
      bairro: lojaItem.bairro,
      estado: lojaItem.estado,
      complemento: lojaItem.complemento,
      nicho: normalizarNicho(rawNicho),
    })
  }

  const loja = todasLojas[0] ?? null

  // Build name map for assinatura
  const lojaNameMap: Record<string, string> = {}
  todasLojas.forEach(l => { lojaNameMap[l.id] = l.nome })

  const assinatura: AssinaturaItem[] = (libData ?? []).map(l => ({
    id: l.id as string,
    tipo: (l.tipo as string) === 'rede' ? 'rede' : 'loja',
    status: l.status as string,
    valor_pago: l.valor_pago as number | null,
    prazo_acesso: l.prazo_acesso as string | null,
    criado_em: l.criado_em as string,
    aplicado_em: l.aplicado_em as string | null,
    loja_nome: l.loja_id ? (lojaNameMap[l.loja_id as string] ?? null) : null,
  }))

  const lojasVinculadas: LojaVinculada[] = todasLojas.map(l => ({ id: l.id, nome: l.nome }))

  return (
    <FormMinhaConta
      emailConta={user.email ?? ''}
      loja={loja}
      todasLojas={todasLojas}
      podeEditar={podeEditar}
      assinatura={assinatura}
      lojasVinculadas={lojasVinculadas}
      isRede={isRede}
    />
  )
}
