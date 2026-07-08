import 'server-only'

export type AsaasConfig = {
  apiKey: string
  baseUrl: string
  env: string
}

function getAsaasConfig(): AsaasConfig {
  const apiKey = process.env.ASAAS_API_KEY
  const baseUrl = process.env.ASAAS_BASE_URL ?? 'https://api.asaas.com/v3'
  const env = process.env.ASAAS_ENV ?? 'production'

  if (!apiKey) {
    throw new Error('ASAAS_API_KEY não configurada. Configure a variável de ambiente antes de usar o cliente Asaas.')
  }

  return { apiKey, baseUrl, env }
}

export async function asaasRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<T> {
  const { apiKey, baseUrl } = getAsaasConfig()

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Asaas ${method} ${path} → ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

export function asaasGet<T = unknown>(path: string): Promise<T> {
  return asaasRequest<T>('GET', path)
}

export function asaasPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return asaasRequest<T>('POST', path, body)
}
