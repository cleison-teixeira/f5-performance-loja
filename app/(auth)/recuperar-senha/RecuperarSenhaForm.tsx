'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export function RecuperarSenhaForm() {
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const [erroRaw, setErroRaw] = useState('')
  const [redirectTo, setRedirectTo] = useState('')

  useEffect(() => {
    setRedirectTo(window.location.origin + '/api/auth/callback?next=/atualizar-senha')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setErroRaw('')
    setCarregando(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (error) {
        setErroRaw(error.message)

        if (error.status === 429)
          setErro('Limite de e-mails atingido. Aguarde alguns minutos (Supabase free tier: ~3/hora).')
        else {
          const m = error.message?.toLowerCase() ?? ''
          if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch') || m.includes('load failed'))
            setErro('Erro de conexão. Verifique sua internet e tente novamente.')
          else
            setErro(`Não foi possível enviar o link. Erro: ${error.message}`)
        }
        setCarregando(false)
        return
      }

      setEnviado(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErroRaw(msg)
      setErro('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  if (enviado) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Enviamos um link para <strong>{email}</strong>.
          <br />
          Verifique sua caixa de entrada e o spam.
        </p>
        <p className="text-xs text-muted-foreground">
          Não recebeu? Aguarde 1 minuto — pode haver atraso no envio.
        </p>
        <div className="rounded-lg bg-muted/50 p-3 text-left space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground">Link de retorno enviado ao Supabase:</p>
          <p className="text-[11px] font-mono text-muted-foreground break-all">{redirectTo}</p>
          <p className="text-[11px] text-amber-600 mt-1">
            Este endereço deve estar na lista de Redirect URLs do seu projeto no Supabase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEnviado(false); setErro(''); setErroRaw('') }}
          className="text-sm text-primary hover:underline block mx-auto"
        >
          Tentar outro e-mail
        </button>
        <Link href="/login" className="text-sm text-muted-foreground hover:underline block">
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Recuperar senha</h2>
        <p className="text-sm text-muted-foreground">
          Informe seu e-mail e enviaremos um link para redefinir a senha.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      {redirectTo && (
        <div className="rounded-md bg-muted/40 px-3 py-2 space-y-0.5">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Link de retorno</p>
          <p className="text-[11px] font-mono text-muted-foreground break-all">{redirectTo}</p>
          <p className="text-[11px] text-amber-600">
            Adicione este endereço nas Redirect URLs do Supabase.
          </p>
        </div>
      )}

      {erro && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 space-y-1">
          <p className="text-sm text-destructive">{erro}</p>
          {erroRaw && erroRaw !== erro && (
            <p className="text-[11px] font-mono text-destructive/70">raw: {erroRaw}</p>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={carregando}>
        {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Lembrou a senha?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  )
}
