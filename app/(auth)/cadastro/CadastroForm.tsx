'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

function extrairMensagemErro(error: unknown): string {
  if (!error) return 'Erro desconhecido.'
  if (typeof error === 'string') return error
  if (typeof error === 'object') {
    const e = error as Record<string, unknown>
    if (typeof e.message === 'string' && e.message && e.message !== '{}') {
      return e.message
    }
    if (typeof e.error_description === 'string') return e.error_description
    if (typeof e.msg === 'string') return e.msg
  }
  return 'Erro ao criar conta. Verifique os dados e tente novamente.'
}

export function CadastroForm() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    })

    if (error) {
      console.error('[cadastro] erro Supabase:', JSON.stringify(error, null, 2))
      setErro(extrairMensagemErro(error))
      setCarregando(false)
      return
    }

    // Confirmação de e-mail habilitada no projeto — sessão não é criada imediatamente
    if (data.session === null) {
      setSucesso(true)
      setCarregando(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (sucesso) {
    return (
      <div className="space-y-4 text-center">
        <p className="font-medium">Conta criada!</p>
        <p className="text-sm text-muted-foreground">
          Verifique seu e-mail <strong>{email}</strong> e clique no link de confirmação para ativar sua conta.
        </p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Seu nome</Label>
        <Input
          id="nome"
          placeholder="Maria Silva"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
          autoComplete="name"
        />
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
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          type="password"
          placeholder="••••••••"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <Button type="submit" className="w-full" disabled={carregando}>
        {carregando ? 'Criando conta...' : 'Criar conta'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  )
}
