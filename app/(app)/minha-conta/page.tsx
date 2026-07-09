export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { normalizarNicho } from '@/lib/config/produtos-segmentos'
import { getContextoLoja } from '@/lib/loja/contexto'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { FormMinhaConta } from './FormMinhaConta'
import { PinGestaoGuard } from '@/components/pin/PinGestaoGuard'

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
  logo_url: string | null
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
  loja_id: string | null
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

  // membros e liberações não dependem um do outro — executar em paralelo
  const [{ data: membrosData }, { data: libData }] = await Promise.all([
    admin
      .from('membros_loja')
      .select('role, loja_id, lojas(id, nome, documento, email, whatsapp, cidade, endereco, cep, rua, numero, bairro, estado, complemento, nichos, logo_url)')
      .eq('perfil_id', user.id)
      .eq('ativo', true),
    admin
      .from('liberacoes_acesso')
      .select('id, tipo, status, valor_pago, prazo_acesso, criado_em, aplicado_em, loja_id')
      .eq('email', (user.email ?? '').toLowerCase())
      .order('criado_em', { ascending: false }),
  ])

  if (!membrosData || membrosData.length === 0) redirect('/sem-acesso')

  const role = membrosData.reduce((best: string, m) => {
    const mRole = m.role as string
    return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
  }, membrosData[0].role as string)

  if (role === 'vendedora') redirect('/dashboard')

  const podeEditar = ['dono', 'gerente', 'admin_f5'].includes(role)

  // isRede is determined solely by whether this email has an active tipo='rede' liberação.
  const isRede = (libData ?? []).some(
    l => l.tipo === 'rede' && ['aplicado', 'ativo'].includes(l.status as string)
  )

  const multiLoja = !isAcessoLoja(role)
  const ctx = await getContextoLoja(user.id, multiLoja)
  const mostrarVisaoRede = isRede && ctx.escopo === 'rede'

  // Build deduplicated lojas
  const seen = new Set<string>()
  const todasLojas: LojaData[] = []

  for (const m of membrosData) {
    type LojaRaw = {
      id: string; nome: string; documento: string | null; email: string | null
      whatsapp: string | null; cidade: string | null; endereco: string | null
      cep: string | null; rua: string | null; numero: string | null
      bairro: string | null; estado: string | null; complemento: string | null
      nichos: string[] | null; logo_url: string | null
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
      logo_url: lojaItem.logo_url ?? null,
    })
  }

  // When rede user has a specific loja selected (via cookie), show that loja; otherwise first loja.
  const lojaParaEditar: LojaData | null = mostrarVisaoRede
    ? (todasLojas[0] ?? null)
    : (ctx.lojaId ? (todasLojas.find(l => l.id === ctx.lojaId) ?? todasLojas[0] ?? null) : (todasLojas[0] ?? null))

  // ctx.lojas é a fonte autoritativa: usa Set() para dedup de loja_id e busca direta na tabela lojas
  // (não depende do JOIN ORM que pode falhar quando a FK não resolve corretamente)
  const lojaNameMap: Record<string, string> = {}
  ctx.lojas.forEach(l => { lojaNameMap[l.id] = l.nome })

  // Deduplica redeItems por loja_id: libData pode ter linhas duplicadas para o mesmo loja_id
  const seenRedeLojaIds = new Set<string>()
  const assinatura: AssinaturaItem[] = (libData ?? []).reduce<AssinaturaItem[]>((acc, l) => {
    const lid = (l.loja_id as string | null) ?? null
    const tipo: 'loja' | 'rede' = (l.tipo as string) === 'rede' ? 'rede' : 'loja'
    if (tipo === 'rede' && lid) {
      if (seenRedeLojaIds.has(lid)) return acc
      seenRedeLojaIds.add(lid)
    }
    acc.push({
      id: l.id as string,
      tipo,
      status: l.status as string,
      valor_pago: l.valor_pago as number | null,
      prazo_acesso: l.prazo_acesso as string | null,
      criado_em: l.criado_em as string,
      aplicado_em: l.aplicado_em as string | null,
      loja_nome: lid ? (lojaNameMap[lid] ?? null) : null,
      loja_id: lid,
    })
    return acc
  }, [])

  // lojasVinculadas vem de ctx.lojas (dedupado via Set, ordenado por nome) — não de todasLojas
  const lojasVinculadas: LojaVinculada[] = ctx.lojas.map(l => ({ id: l.id, nome: l.nome }))


  // Guard: somente Acesso Loja (single-loja). Rede e admin_f5 passam direto.
  const guardLojaId = (role === 'admin_f5' || isRede) ? null : (lojaParaEditar?.id ?? null)

  return (
    <PinGestaoGuard lojaId={guardLojaId} scope="minha_conta">
      <FormMinhaConta
        emailConta={user.email ?? ''}
        loja={lojaParaEditar}
        todasLojas={todasLojas}
        podeEditar={podeEditar}
        assinatura={assinatura}
        lojasVinculadas={lojasVinculadas}
        isRede={mostrarVisaoRede}
      />
    </PinGestaoGuard>
  )
}
