'use client'

import { useState, useEffect } from 'react'
import { ListaEsperaCards, type RegistroListaEspera } from './ListaEsperaCards'

interface Props {
  initialRegistros: RegistroListaEspera[]
  defaultLojaNome: string
  vendedoras: Array<{ id: string; nome: string }>
  produtos: Array<{ id: string; nome: string }>
  podeEditar: boolean
}

export function ListaEsperaPageClient({
  initialRegistros,
  defaultLojaNome,
  vendedoras,
  produtos,
  podeEditar,
}: Props) {
  const [registros, setRegistros] = useState<RegistroListaEspera[]>(initialRegistros)

  useEffect(() => {
    setRegistros(initialRegistros)
  }, [initialRegistros])

  return (
    <ListaEsperaCards
      registros={registros}
      defaultLojaNome={defaultLojaNome}
      vendedoras={vendedoras}
      produtos={produtos}
      podeEditar={podeEditar}
    />
  )
}
