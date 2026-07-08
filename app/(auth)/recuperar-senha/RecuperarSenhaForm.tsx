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
  const [redirectTo, setRedirectTo] = useState('')

  useEffect(() => {
    setRedirectTo(window.location.origin + '/api/auth/callback?next=/atualizar-senha')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (error) {
        if (error.status === 429)
          setErro('Limite de e-mails atingido. Aguarde alguns minutos e tente novamente.')
        else {
          const m = error.message?.toLowerCase() ?? ''
          if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch') || m.includes('load failed'))
            setErro('Erro de conexão. Verifique sua internet e tente novamente.')
          else
            setErro('Não foi possível enviar o link. Tente novamente em alguns instantes.')
        }
        setCarregando(false)
        return
      }

      setEnviado(true)
    } catch {
      setErro('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  if (enviado) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.
          <br />
          Verifique sua caixa de entrada e o spam.
        </p>
        <p className="text-xs text-muted-foreground">
          Não recebeu? Aguarde 1 minuto — pode haver atraso no envio.
        </p>
        <button
          type="button"
          onClick={() => { setEnviado(false); setErro('') }}
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

      {erro && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-sm text-destructive">{erro}</p>
        </div>
      )}

      <Button type="submit" className="w-full h-11 px-6 font-semibold" disabled={carregando}>
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
