// Ativo somente com PERFORMANCE_LOGS=true no .env.local
const enabled = process.env.PERFORMANCE_LOGS === 'true'

export async function measureAsync<T>(
  label: string,
  fn: () => PromiseLike<T> | Promise<T>
): Promise<T> {
  if (!enabled) return fn()
  const start = performance.now()
  try {
    const result = await fn()
    const ms = Math.round(performance.now() - start)
    console.log(`[PERF] ${label}: ${ms}ms`)
    return result
  } catch (err) {
    const ms = Math.round(performance.now() - start)
    console.log(`[PERF] ${label} ERRO: ${ms}ms`)
    throw err
  }
}

export function startTimer(label: string): () => void {
  if (!enabled) return () => {}
  const start = performance.now()
  return () => {
    const ms = Math.round(performance.now() - start)
    console.log(`[PERF] ${label}: ${ms}ms`)
  }
}
