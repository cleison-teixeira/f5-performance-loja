'use client'

interface Props {
  lojas: { id: string; nome: string }[]
  lojaAtiva: string
}

export function SeletorLoja({ lojas, lojaAtiva }: Props) {
  return (
    <form
      method="get"
      action="/configuracoes/equipe"
      className="flex items-center gap-2"
    >
      <label htmlFor="loja-seletor" className="text-sm font-medium shrink-0">
        Loja
      </label>
      <select
        id="loja-seletor"
        name="loja_id"
        defaultValue={lojaAtiva}
        onChange={e => (e.currentTarget.form as HTMLFormElement).submit()}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {lojas.map(l => (
          <option key={l.id} value={l.id}>{l.nome}</option>
        ))}
      </select>
    </form>
  )
}
