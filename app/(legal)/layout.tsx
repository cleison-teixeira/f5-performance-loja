import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  robots: 'index, follow',
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="border-b border-zinc-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/branding/logo-f5-sem-fundo.png" alt="F5 Recompra" className="h-8 w-auto object-contain" />
          </Link>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
            Acessar o app →
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {children}
      </main>
      <footer className="border-t border-zinc-100 py-6 px-6 mt-16">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
          <span>© {new Date().getFullYear()} F5 Recompra. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link href="/termos-de-uso" className="hover:text-zinc-700 transition-colors">Termos de Uso</Link>
            <Link href="/politica-de-privacidade" className="hover:text-zinc-700 transition-colors">Privacidade</Link>
            <Link href="/contrato-lgpd" className="hover:text-zinc-700 transition-colors">LGPD</Link>
            <Link href="/seguranca" className="hover:text-zinc-700 transition-colors">Segurança</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
