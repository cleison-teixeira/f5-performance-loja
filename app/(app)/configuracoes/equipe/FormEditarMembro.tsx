'use client'
import { useState, useRef, useTransition } from 'react'
import { editarMembro, salvarPinMembro, togglePinMembro } from './actions'
import { createClient } from '@/lib/supabase/client'
import type { MembroExibido } from './page'
import { formatarWhatsapp, normalizarWhatsapp } from '@/lib/whatsapp/mask'
import { Loader2, Camera, ImageIcon } from 'lucide-react'

interface Props {
  membro: MembroExibido
  loja_id: string
  callerRole: string
  onSalvo: (atualizado: MembroExibido) => void
  onCancelar: () => void
}

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

const inputCls = 'w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const ROLES: { value: 'dono' | 'gerente' | 'lider' | 'vendedora'; label: string }[] = [
  { value: 'vendedora', label: 'Vendedora' },
  { value: 'lider', label: 'Líder' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'dono', label: 'Gestor(a)' },
]

function iniciais(nome: string): string {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
}

export function FormEditarMembro({ membro, loja_id, onSalvo, onCancelar }: Props) {
  // ── Dados ────────────────────────────────────────────────────────────────────
  const [nome, setNome] = useState(membro.nome)
  const [telefone, setTelefone] = useState(membro.telefone)
  const [role, setRole] = useState<'dono' | 'gerente' | 'lider' | 'vendedora'>(membro.role as 'dono' | 'gerente' | 'lider' | 'vendedora')
  const [ativo, setAtivo] = useState(membro.ativo)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // ── Foto ─────────────────────────────────────────────────────────────────────
  const [avatarUrl, setAvatarUrl] = useState<string | null>(membro.avatar_url)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(membro.avatar_url)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const [urlManual, setUrlManual] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const galeriaRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  // ── PIN ──────────────────────────────────────────────────────────────────────
  const [pin, setPin] = useState('')
  const [pinConfirma, setPinConfirma] = useState('')
  const [pinAtivo, setPinAtivo] = useState(membro.pin_ativo)
  const [temPinHash, setTemPinHash] = useState(membro.tem_pin_hash)
  const [pinPending, startPinTransition] = useTransition()
  const [msgPin, setMsgPin] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  // ── Foto handlers ─────────────────────────────────────────────────────────────
  async function processarArquivo(file: File) {
    if (!TIPOS_ACEITOS.includes(file.type)) { setErroFoto('Formato inválido. Use JPG, PNG ou WEBP.'); return }
    if (file.size > MAX_BYTES) { setErroFoto('Imagem muito grande. Máximo 5 MB.'); return }

    const reader = new FileReader()
    reader.onload = e => setAvatarPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setUploadingFoto(true)
    setErroFoto(null)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `avatars/${membro.perfil_id}-${Date.now()}.${ext}`
    const supabase = createClient()
    const { error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true, contentType: file.type })

    setUploadingFoto(false)

    if (uploadErr) {
      setErroFoto('Erro ao enviar imagem. Tente novamente.')
      setAvatarPreview(membro.avatar_url)
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

  // ── PIN handlers ──────────────────────────────────────────────────────────────
  function handleSalvarPin(e: React.FormEvent) {
    e.preventDefault()
    startPinTransition(async () => {
      const res = await salvarPinMembro({ membro_id: membro.membro_id, loja_id, pin, pin_confirma: pinConfirma })
      if (res.ok) {
        setMsgPin({ tipo: 'ok', texto: 'PIN salvo e ativado.' })
        setTemPinHash(true)
        setPinAtivo(true)
        setPin('')
        setPinConfirma('')
      } else {
        setMsgPin({ tipo: 'erro', texto: res.erro ?? 'Erro ao salvar PIN.' })
      }
    })
  }

  function handleTogglePin(ativar: boolean) {
    startPinTransition(async () => {
      const res = await togglePinMembro({ membro_id: membro.membro_id, loja_id, ativo: ativar })
      if (res.ok) {
        setPinAtivo(ativar)
        setMsgPin({ tipo: 'ok', texto: ativar ? 'PIN ativado.' : 'PIN desativado.' })
      } else {
        setMsgPin({ tipo: 'erro', texto: res.erro ?? 'Erro.' })
      }
    })
  }

  // ── Save principal ────────────────────────────────────────────────────────────
  async function handleSalvar() {
    if (!nome.trim()) { setErro('Nome é obrigatório'); return }
    setSalvando(true)
    setErro(null)
    const res = await editarMembro({
      membro_id: membro.membro_id,
      loja_id,
      perfil_id: membro.perfil_id,
      nome: nome.trim(),
      telefone: normalizarWhatsapp(telefone),
      role,
      ativo,
      avatar_url: avatarUrl,
    })
    setSalvando(false)
    if (res.ok) {
      onSalvo({
        ...membro,
        nome: nome.trim(),
        telefone: normalizarWhatsapp(telefone),
        role,
        ativo,
        avatar_url: avatarUrl,
        pin_ativo: pinAtivo,
        tem_pin_hash: temPinHash,
      })
    } else {
      setErro(res.erro ?? 'Erro ao salvar')
    }
  }

  const pinInputCls = 'w-full rounded-md border border-input bg-background px-3 py-1.5 text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-ring/50'

  return (
    <div className="rounded-lg border bg-card p-4 space-y-5">
      <p className="text-sm font-semibold">Editar membro</p>

      {/* ── SEÇÃO: Dados ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nome</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">WhatsApp</label>
            <input
              type="tel" inputMode="numeric"
              value={formatarWhatsapp(normalizarWhatsapp(telefone))}
              onChange={e => setTelefone(normalizarWhatsapp(e.target.value))}
              placeholder="(48) 99999-9999" className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Função</label>
            <select value={role} onChange={e => setRole(e.target.value as 'dono' | 'gerente' | 'lider' | 'vendedora')} className={inputCls}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <div className="flex items-center gap-3 h-10">
              <button
                type="button"
                onClick={() => setAtivo(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${ativo ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${ativo ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-sm text-muted-foreground">{ativo ? 'Ativo' : 'Inativo'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO: Foto ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Foto</p>
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative w-14 h-14 flex-none">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt={nome} className="w-14 h-14 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                <span className="text-base font-bold text-muted-foreground">{iniciais(nome) || '?'}</span>
              </div>
            )}
            {uploadingFoto && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
            )}
          </div>
          {/* Ações de foto */}
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
                  <button type="button" onClick={() => { setAvatarUrl(null); setAvatarPreview(null) }}
                    disabled={uploadingFoto}
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
            <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="https://..." className="flex-1 min-w-0 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
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
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acesso rápido (PIN)</p>
          {temPinHash && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${pinAtivo ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
              {pinAtivo ? 'Ativo' : 'Inativo'}
            </span>
          )}
        </div>
        <form onSubmit={handleSalvarPin} className="space-y-2">
          <div className="grid grid-cols-2 gap-2 max-w-xs">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Novo PIN</label>
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
          <p className="text-[11px] text-muted-foreground">4 dígitos. Salvar ativa o PIN automaticamente.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="submit" disabled={pinPending || pin.length < 4 || pinConfirma.length < 4}
              className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors">
              {pinPending ? 'Salvando…' : 'Salvar PIN'}
            </button>
            {temPinHash && (
              pinAtivo ? (
                <button type="button" onClick={() => handleTogglePin(false)} disabled={pinPending}
                  className="inline-flex items-center rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-colors">
                  Desativar PIN
                </button>
              ) : (
                <button type="button" onClick={() => handleTogglePin(true)} disabled={pinPending}
                  className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50 transition-colors">
                  Ativar PIN
                </button>
              )
            )}
          </div>
        </form>
        {msgPin && (
          <p className={`text-xs font-medium ${msgPin.tipo === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
            {msgPin.texto}
          </p>
        )}
      </div>

      {/* ── Botões principais ─────────────────────────────────────── */}
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <button type="button" onClick={handleSalvar} disabled={salvando || uploadingFoto}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors">
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" onClick={onCancelar} disabled={salvando}
          className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}
