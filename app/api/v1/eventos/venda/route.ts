import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Mapeamento HTTP definitivo do Gate 1 (PILOT-0007). Sucesso é síncrono
// nesta versão — 202 fica reservado para uma futura arquitetura
// assíncrona (filas/workers), fora do escopo deste piloto.
const STATUS_HTTP: Record<string, number> = {
  aceito: 200,
  duplicado: 200,
  rejeitado: 400,
  pendente_mapeamento: 422,
  pendente_vendedor: 422,
  pendente_produto: 422,
  nao_suportado_sem_telefone: 422,
  erro_parcial: 500,
  recebido: 409,
}

type RpcResultado = {
  sucesso: boolean
  status: string
  evento_id: string | null
  venda_f5_id: string | null
  motivo: string | null
  etapa: string | null
  pode_reprocessar: boolean
  contrato_versao: string | null
}

// Lê o corpo em blocos, abortando assim que ultrapassar maxBytes — não
// depende de Content-Length (que o cliente controla e pode omitir ou
// subestimar, ex. chunked encoding), corrigindo o achado do Codex de que
// a checagem por header sozinha pode ser contornada.
class PayloadTooLargeError extends Error {}

async function lerCorpoLimitado(request: Request, maxBytes: number): Promise<string> {
  const reader = request.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new PayloadTooLargeError()
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf-8')
}

// identidade_evento é a referência oficial deste endpoint para logs,
// suporte e auditoria — não se cria correlation_id/request_id paralelo.
function identidadeEvento(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return '(payload ausente)'
  }
  const p = payload as Record<string, unknown>
  const origem = p.origem
  const evento = p.evento
  const sistema =
    typeof origem === 'object' && origem !== null && !Array.isArray(origem)
      ? (origem as Record<string, unknown>).sistema
      : undefined
  const eventoExternoId =
    typeof evento === 'object' && evento !== null && !Array.isArray(evento)
      ? (evento as Record<string, unknown>).evento_externo_id
      : undefined
  return `${typeof sistema === 'string' ? sistema : '(ausente)'}:${
    typeof eventoExternoId === 'string' ? eventoExternoId : '(ausente)'
  }`
}

export async function POST(request: Request) {
  const expectedKey = process.env.F5_INTEGRATION_KEY
  if (!expectedKey) {
    console.error('[POST /api/v1/eventos/venda] F5_INTEGRATION_KEY não configurada')
    return NextResponse.json(
      { sucesso: false, status: 'erro_interno', motivo: 'Configuração do servidor indisponível.' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json(
      { sucesso: false, status: 'nao_autenticado', motivo: 'Autenticação inválida.' },
      { status: 401 }
    )
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { sucesso: false, status: 'requisicao_invalida', motivo: 'Content-Type deve ser application/json.' },
      { status: 400 }
    )
  }

  // Achado do Codex (PILOT-0007): rejeita corpos grandes ANTES de terminar
  // de ler o corpo — não confia só no header Content-Length.
  const MAX_PAYLOAD_BYTES = 256 * 1024

  let payload: unknown
  try {
    const corpoTexto = await lerCorpoLimitado(request, MAX_PAYLOAD_BYTES)
    payload = JSON.parse(corpoTexto)
  } catch (erro) {
    if (erro instanceof PayloadTooLargeError) {
      return NextResponse.json(
        { sucesso: false, status: 'requisicao_invalida', motivo: 'Payload excede o tamanho máximo permitido.' },
        { status: 413 }
      )
    }
    return NextResponse.json(
      { sucesso: false, status: 'requisicao_invalida', motivo: 'JSON inválido.' },
      { status: 400 }
    )
  }

  const idEvento = identidadeEvento(payload)

  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    console.error(`[POST /api/v1/eventos/venda] corpo não é objeto — identidade_evento=${idEvento}`)
    return NextResponse.json(
      {
        sucesso: false,
        status: 'requisicao_invalida',
        motivo: 'Corpo da requisição deve ser um objeto JSON.',
        identidade_evento: idEvento,
      },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('processar_evento_venda_externa_v1', { payload })

  if (error) {
    console.error(
      `[POST /api/v1/eventos/venda] erro ao chamar a RPC — identidade_evento=${idEvento}`,
      error.message
    )
    return NextResponse.json(
      {
        sucesso: false,
        status: 'erro_interno',
        motivo: 'Erro interno ao processar o evento.',
        identidade_evento: idEvento,
      },
      { status: 500 }
    )
  }

  const resultado = data as RpcResultado
  const httpStatus = STATUS_HTTP[resultado.status] ?? 500

  console.log(
    `[POST /api/v1/eventos/venda] identidade_evento=${idEvento} status=${resultado.status} http=${httpStatus}`
  )

  return NextResponse.json({ ...resultado, identidade_evento: idEvento }, { status: httpStatus })
}
