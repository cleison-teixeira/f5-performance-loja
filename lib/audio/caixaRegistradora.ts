const SOUND_PATH = '/sounds/cash-register.mp3'

type AudioContextType = typeof AudioContext

function getAudioContext(): AudioContext | null {
  try {
    const Ctx = (window.AudioContext ?? (window as unknown as { webkitAudioContext: AudioContextType }).webkitAudioContext)
    return new Ctx()
  } catch {
    return null
  }
}

function ping(ctx: AudioContext, freq: number, delay: number, duration: number, vol: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  const t = ctx.currentTime + delay
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

function tocarFallback() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    ping(ctx, 880, 0, 0.08, 0.28)
    ping(ctx, 1760, 0.07, 0.18, 0.22)
    ping(ctx, 2640, 0.07, 0.12, 0.08)
    setTimeout(() => ctx.close(), 600)
  } catch {}
}

export function tocarCaixaRegistradora() {
  let fallbackDisparado = false

  function dispararFallback() {
    if (fallbackDisparado) return
    fallbackDisparado = true
    tocarFallback()
  }

  try {
    const audio = new Audio(SOUND_PATH)
    audio.volume = 0.7
    audio.onerror = dispararFallback
    const p = audio.play()
    p?.catch(dispararFallback)
  } catch {
    dispararFallback()
  }
}
