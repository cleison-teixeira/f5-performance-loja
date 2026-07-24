'use client'

import { useState } from 'react'

interface UserAvatarProps {
  nome: string
  avatarUrl?: string | null
  tamanho?: 'sm' | 'md' | 'lg'
  className?: string
}

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')
}

const DIMS: Record<string, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
}

export function UserAvatar({ nome, avatarUrl, tamanho = 'sm', className = '' }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const dim = DIMS[tamanho] ?? DIMS.sm

  if (avatarUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={nome}
        className={`${dim} rounded-full object-cover border border-border flex-none ${className}`}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={`${dim} rounded-full bg-muted border border-border flex items-center justify-center font-bold text-muted-foreground flex-none ${className}`}
    >
      {iniciais(nome) || '?'}
    </div>
  )
}
