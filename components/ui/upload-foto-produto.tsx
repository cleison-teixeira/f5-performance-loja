'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, X, Camera, ImageIcon } from 'lucide-react'

interface UploadFotoProdutoProps {
  lojaId: string
  fotoAtual: string | null
  onFotoAlterada: (url: string | null) => void
}

export function UploadFotoProduto({ lojaId, fotoAtual, onFotoAlterada }: UploadFotoProdutoProps) {
  const [preview, setPreview] = useState<string | null>(fotoAtual)
  const [uploading, setUploading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [urlManual, setUrlManual] = useState(false)
  const [urlInput, setUrlInput] = useState(fotoAtual ?? '')

  const cameraRef = useRef<HTMLInputElement>(null)
  const galeriaRef = useRef<HTMLInputElement>(null)

  async function processarArquivo(file: File) {
    if (!file.type.startsWith('image/')) {
      setErro('Arquivo inválido. Escolha uma imagem.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErro('Imagem muito grande. Máximo 5 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    setErro(null)

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${lojaId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const supabase = createClient()
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true, contentType: file.type })

    setUploading(false)

    if (error) {
      setErro('Erro ao enviar imagem. Tente novamente.')
      setPreview(fotoAtual)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(path)

    onFotoAlterada(publicUrl)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processarArquivo(file)
    e.target.value = ''
  }

  function handleRemover() {
    setPreview(null)
    setUrlInput('')
    onFotoAlterada(null)
  }

  function handleUrlConfirm() {
    const url = urlInput.trim()
    if (!url) return
    setPreview(url)
    onFotoAlterada(url)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Foto do produto</label>

      {preview ? (
        <div className="relative w-24 h-24">
          <img
            src={preview}
            alt="Preview"
            className="w-24 h-24 rounded-lg object-cover border"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={handleRemover}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <Camera className="h-4 w-4" />
            Câmera
          </button>
          <button
            type="button"
            onClick={() => galeriaRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <ImageIcon className="h-4 w-4" />
            Galeria
          </button>
          <button
            type="button"
            onClick={() => setUrlManual(v => !v)}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
          >
            Usar URL
          </button>
        </div>
      )}

      {uploading && !preview && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Enviando imagem…
        </p>
      )}

      {urlManual && !preview && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://..."
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={handleUrlConfirm}
            disabled={!urlInput.trim()}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            OK
          </button>
        </div>
      )}

      {erro && <p className="text-xs text-destructive">{erro}</p>}

      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
