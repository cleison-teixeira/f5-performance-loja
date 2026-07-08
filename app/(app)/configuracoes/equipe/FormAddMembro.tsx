'use client'
import { useState, useRef } from 'react'
import { addMembro } from './actions'
import { createClient } from '@/lib/supabase/client'
import { formatarWhatsapp, normalizarWhatsapp } from '@/lib/whatsapp/mask'
import { Loader2, Camera, ImageIcon } from 'lucide-react'

interface Props {
  loja_id: string
  onSucesso: () => void
  onCancelar: () => void
}

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

const inputCls = 'rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full'

export function FormAddMembro({ loja_id, onSucesso, onCancelar }: Props) {
  // ── Dados ─────────────────────────────────────────────────────────────────
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [role, setRole] = useState<'dono' | 'gerente' | 'vendedora'>('vendedora')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // ── Foto ──────────────────────────────────────────────────────────────────
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const [urlManual, setUrlManual] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const galeriaRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  // ── PIN ───────────────────────────────────────────────────────────────────
  const [pin, setPin] = useState('')
  const [pinConfirma, setPinConfirma] = useState('')

  // ── Foto handlers ─────────────────────────────────────────────────────────
  async function processarArquivo(file: File) {
    if (!TIPOS_ACEITOS.includes(file.type)) { setErroFoto('Formato inválido. Use JPG, PNG ou WEBP.'); return }
    if (file.size > MAX_BYTES) { setErroFoto('Imagem muito grande. Máximo 5 MB.'); return }

    const reader = new FileReader()
    reader.onload = e => setAvatarPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setUploadingFoto(true)
    setErroFoto(null)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `avatars/new-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const supabase = createClient()
    const { error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true, contentType: file.type })

    setUploadingFoto(false)

    if (uploadErr) {
      setErroFoto('Erro ao enviar imagem. Tente novamente.')
      setAvatarPreview(null)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    setAvatarUrl(publicUrl)
    setAvatarPreview(publicUrl)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processarArquivo(file)
    e.target.value = ''
  }

  function handleUrlConfirm() {
    const url = urlInput.trim()
    if (!url) return
    setAvatarUrl(url)
    setAvatarPreview(url)
    setUrlManual(false)
    setUrlInput('')
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return

    const digits = normalizarWhatsapp(telefone)
    if (digits.length < 10 || digits.length > 11) {
      setErro('Informe um WhatsApp válido para cadastrar o membro.')
      return
    }

    if (pin && pin.length > 0 && pin.length < 4) {
      setErro('PIN deve ter exatamente 4 dígitos ou deixe em branco.')
      return
    }
    if (pin && pin !== pinConfirma) {
      setErro('Os PINs não coincidem.')
      return
    }

    setSalvando(true)
    setErro(null)
    const res = await addMembro({
      loja_id,
      nome: nome.trim(),
      telefone: digits,
      role,
      comissao: 0,
      avatar_url: avatarUrl,
      pin: pin.length === 4 ? pin : undefined,
    })
    setSalvando(false)
    if (res.ok) {
      onSucesso()
    } else {
      setErro(res.erro ?? 'Erro ao adicionar membro')
    }
  }

  const pinInputCls = 'w-full rounded-md border border-input bg-background px-3 py-1.5 text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-ring/50'

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border bg-card p-4 mt-2">
      <p className="text-sm font-semibold">Adicionar membro</p>

      {/* ── SEÇÃO: Dados ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="add-nome">Nome *</label>
            <input id="add-nome" type="text" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="add-telefone">WhatsApp *</label>
            <input id="add-telefone" type="tel" inputMode="numeric"
              value={formatarWhatsapp(normalizarWhatsapp(telefone))}
              onChange={e => setTelefone(normalizarWhatsapp(e.target.value))}
              placeholder="(48) 99999-9999" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="add-role">Função</label>
            <select id="add-role" value={role} onChange={e => setRole(e.target.value as 'dono' | 'gerente' | 'vendedora')} className={inputCls}>
              <option value="vendedora">Vendedora</option>
              <option value="gerente">Gerente</option>
              <option value="dono">Dono</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO: Foto ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Foto <span className="font-normal normal-case">(opcional)</span></p>
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 flex-none">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
              </div>
            )}
            {uploadingFoto && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => galeriaRef.current?.click()} disabled={uploadingFoto}
                className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50 transition-colors touch-manipulation">
                <ImageIcon className="h-3 w-3" /> Galeria
              </button>
              <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploadingFoto}
                className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50 transition-colors touch-manipulation">
                <Camera className="h-3 w-3" /> Câmera
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setUrlManual(v => !v)} disabled={uploadingFoto}
                className="text-[11px] text-muted-foreground hover:text-foreground hover:underline transition-colors">
                Usar link
              </button>
              {avatarPreview && (
                <>
                  <span className="text-muted-foreground/30 text-[11px] select-none">·</span>
                  <button type="button" onClick={() => { setAvatarUrl(null); setAvatarPreview(null) }} disabled={uploadingFoto}
                    className="text-[11px] text-destructive hover:underline transition-colors">
                    Remover
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {urlManual && (
          <div className="flex gap-2 max-w-sm">
            <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://..."
              className="flex-1 min-w-0 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <button type="button" onClick={handleUrlConfirm} disabled={!urlInput.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              OK
            </button>
          </div>
        )}
        {erroFoto && <p className="text-[11px] text-destructive">{erroFoto}</p>}
        <input ref={galeriaRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
        <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handleFileChange} />
      </div>

      {/* ── SEÇÃO: PIN ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acesso rápido (PIN) <span className="font-normal normal-case">(opcional)</span></p>
        <div className="grid grid-cols-2 gap-2 max-w-xs">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">PIN</label>
            <input type="password" inputMode="numeric" maxLength={4}
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••" className={pinInputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Confirmar</label>
            <input type="password" inputMode="numeric" maxLength={4}
              value={pinConfirma} onChange={e => setPinConfirma(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••" className={pinInputCls} />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">4 dígitos. Deixe em branco para cadastrar sem PIN.</p>
      </div>

      {/* ── Botões ────────────────────────────────────────────────── */}
      {erro && <p className="text-sm font-medium text-destructive">{erro}</p>}
      <div className="flex gap-2 pt-1 border-t border-border/50">
        <button type="submit" disabled={salvando || uploadingFoto}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors">
          {salvando ? 'Adicionando…' : 'Adicionar'}
        </button>
        <button type="button" onClick={onCancelar} disabled={salvando}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}
