'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export function AtualizarSenhaForm() {
  const router = useRouter()
  const [sessao, setSessao] = useState<'verificando' | 'ok' | 'expirado'>('verificando')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setSessao(data.session ? 'ok' : 'expirado')
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha !== confirmar) {
      setErro('As senhas não conferem.')
      return
    }
    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senha })
    setCarregando(false)

    if (error) {
      setErro('Não foi possível atualizar a senha. O link pode ter expirado.')
      return
    }

    // Encerra a sessão de recovery para forçar novo login
    await supabase.auth.signOut()
    router.push('/login?mensagem=senha_atualizada')
  }

  if (sessao === 'verificando') {
    return (
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">Verificando link...</p>
      </div>
    )
  }

  if (sessao === 'expirado') {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-semibold">Link inválido ou expirado</p>
        <p className="text-sm text-muted-foreground">
          Este link de recuperação já foi usado ou expirou.
          <br />
          Solicite um novo para continuar.
        </p>
        <Link
          href="/recuperar-senha"
          className="inline-block text-sm text-primary hover:underline"
        >
          Solicitar novo link
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Nova senha</h2>
        <p className="text-sm text-muted-foreground">
          Escolha uma senha com no mínimo 6 caracteres.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Nova senha</Label>
        <Input
          id="senha"
          type="password"
          placeholder="••••••••"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          required
          autoFocus
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmar">Confirmar senha</Label>
        <Input
          id="confirmar"
          type="password"
          placeholder="••••••••"
          value={confirmar}
          onChange={e => setConfirmar(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button type="submit" className="w-full" disabled={carregando}>
        {carregando ? 'Atualizando...' : 'Atualizar senha'}
      </Button>
    </form>
  )
}
