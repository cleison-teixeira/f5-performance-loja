'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Pencil } from 'lucide-react'
import { editarCliente } from './actions'

interface Props {
  clienteId: string
  clienteNome: string
  clienteWhatsapp: string
  clienteObservacao: string | null
  lojaId: string
  onFechar: () => void
}

export function EditarClienteModal({ clienteId, clienteNome, clienteWhatsapp, clienteObservacao, lojaId, onFechar }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [nome, setNome] = useState(clienteNome)
  const [whatsapp, setWhatsapp] = useState(clienteWhatsapp)
  const [observacao, setObservacao] = useState(clienteObservacao ?? '')
  const [erro, setErro] = useState<string | null>(null)

  function handleConfirmar() {
    setErro(null)
    startTransition(async () => {
      const res = await editarCliente({
        cliente_id: clienteId,
        loja_id: lojaId,
        nome,
        whatsapp,
        observacao: observacao.trim() || null,
      })
      if (res.ok) {
        router.refresh()
        onFechar()
      } else {
        setErro(res.erro ?? 'Erro ao salvar.')
      }
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/50" onClick={onFechar} />
      <div className="fixed inset-x-4 bottom-4 z-[90] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-background rounded-2xl shadow-2xl border overflow-hidden animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Editar cliente</h2>
          </div>
          <button onClick={onFechar} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-1.5 block">
              Nome <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome do cliente"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-1.5 block">
              WhatsApp <span className="text-destructive">*</span>
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="Ex: 5548999999999"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/40"
            />
            <p className="mt-1 text-[10px] text-muted-foreground/60 leading-snug">
              Informe com DDD. Apenas números serão salvos.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-1.5 block">
              Observação <span className="font-normal normal-case text-muted-foreground/60">(opcional)</span>
            </label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Contexto, preferências, etc."
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/40"
            />
            <p className="mt-1 text-[10px] text-muted-foreground/60 leading-snug">
              Não insira dados sensíveis, diagnósticos médicos ou informações desnecessárias.
            </p>
          </div>

          {erro && <p className="text-xs text-destructive">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleConfirmar}
              disabled={isPending || !nome.trim() || !whatsapp.trim()}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Salvando…' : 'Salvar alterações'}
            </button>
            <button
              onClick={onFechar}
              disabled={isPending}
              className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
