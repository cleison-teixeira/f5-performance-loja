'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

function mensagemFriendly(error: { message: string; status?: number }): string {
  if (error.status === 429)
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  const m = error.message?.toLowerCase() ?? ''
  if (m.includes('invalid login credentials') || m.includes('invalid_grant'))
    return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'
  if (m.includes('email not confirmed'))
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada (e o spam).'
  if (m.includes('user not found'))
    return 'Nenhuma conta encontrada com este e-mail.'
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch') || m.includes('load failed'))
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  return `Erro: ${error.message}`
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const senhaAtualizada = searchParams.get('mensagem') === 'senha_atualizada'
  const linkInvalido = searchParams.get('erro') === 'link_invalido'
  const nextParam = searchParams.get('next')

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      })

      if (error) {
        setErro(mensagemFriendly(error))
        setCarregando(false)
        return
      }

      const { data: sessionCheck } = await supabase.auth.getSession()
      const sess = sessionCheck.session

      if (!sess) {
        setErro('Login OK mas sessão não foi salva. Acesse /debug/auth para diagnosticar.')
        setCarregando(false)
        return
      }

      const destino = nextParam && nextParam.startsWith('/') ? nextParam : '/dashboard'
      window.location.href = destino
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[login]', msg)
      setErro('Erro de conexão. Verifique sua internet e tente novamente.')
      setCarregando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {senhaAtualizada && (
        <p className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          Senha atualizada com sucesso. Faça login.
        </p>
      )}
      {linkInvalido && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          O link de recuperação é inválido ou expirou. Solicite um novo.
        </p>
      )}

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
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="senha">Senha</Label>
          <Link
            href="/recuperar-senha"
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Esqueci minha senha
          </Link>
        </div>
        <PasswordInput
          id="senha"
          placeholder="••••••••"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      {erro && (
        <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}

      <Button type="submit" className="w-full h-11 px-6 font-semibold" disabled={carregando}>
        {carregando ? 'Entrando...' : 'Entrar'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link href="/cadastro" className="text-primary hover:underline">
          Cadastre-se
        </Link>
      </p>
    </form>
  )
}
