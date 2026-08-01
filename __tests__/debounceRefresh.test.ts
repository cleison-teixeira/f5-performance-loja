import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { criarAgendadorDebounce } from '../lib/avisos/debounceRefresh'

describe('criarAgendadorDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('agrupa uma rajada de eventos num único callback', () => {
    const callback = vi.fn()
    const { agendar } = criarAgendadorDebounce(callback, 700)

    // uma venda gerando 5 avisos = 5 eventos em rajada
    agendar()
    agendar()
    agendar()
    agendar()
    agendar()

    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(700)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('dispara callbacks separados quando os eventos são espaçados além da janela', () => {
    const callback = vi.fn()
    const { agendar } = criarAgendadorDebounce(callback, 700)

    agendar()
    vi.advanceTimersByTime(700)
    expect(callback).toHaveBeenCalledTimes(1)

    agendar()
    vi.advanceTimersByTime(700)
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('cancelar impede o callback pendente de disparar', () => {
    const callback = vi.fn()
    const { agendar, cancelar } = criarAgendadorDebounce(callback, 700)

    agendar()
    cancelar()
    vi.advanceTimersByTime(700)

    expect(callback).not.toHaveBeenCalled()
  })
})
