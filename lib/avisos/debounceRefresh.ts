// Agrupa uma rajada de eventos (ex.: uma venda gerando vários avisos de uma
// vez) numa única chamada de callback, disparada só depois que os eventos
// pararem de chegar por `ms` milissegundos.
export function criarAgendadorDebounce(callback: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null

  function agendar() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      callback()
    }, ms)
  }

  function cancelar() {
    if (timer) clearTimeout(timer)
    timer = null
  }

  return { agendar, cancelar }
}
