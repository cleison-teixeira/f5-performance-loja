import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://app.f5recompra.com.br'),
  title: 'F5 Recompra',
  description: 'Motor de recompra para lojas',
  openGraph: {
    title: 'F5 Recompra',
    description: 'Motor de recompra para lojas',
    url: 'https://app.f5recompra.com.br',
    siteName: 'F5 Recompra',
    images: [
      {
        url: 'https://app.f5recompra.com.br/og-image.png?v=13',
        width: 1200,
        height: 630,
        alt: 'F5 Recompra — Motor de recompra para lojas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://app.f5recompra.com.br/og-image.png?v=13'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
