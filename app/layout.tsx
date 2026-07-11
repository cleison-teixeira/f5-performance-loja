import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://app.f5recompra.com.br'),
  title: 'F5 Recompra',
  description: 'Motor de recompra para lojas',
  icons: {
    icon: [
      { url: '/f5-favicon-32-v14.png', sizes: '32x32', type: 'image/png' },
      { url: '/f5-favicon-16-v14.png', sizes: '16x16', type: 'image/png' },
      { url: '/f5-icon-192-v14.png', sizes: '192x192', type: 'image/png' },
      { url: '/f5-icon-512-v14.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico', '/f5-favicon-32-v14.png'],
    apple: [
      { url: '/f5-apple-touch-icon-v14.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'F5 Recompra',
    description: 'Motor de recompra para lojas',
    url: 'https://app.f5recompra.com.br',
    siteName: 'F5 Recompra',
    images: [
      {
        url: 'https://app.f5recompra.com.br/og-f5-recompra-v14.png',
        width: 1200,
        height: 630,
        alt: 'F5 Recompra - Motor de recompra para lojas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'F5 Recompra',
    description: 'Motor de recompra para lojas',
    images: ['https://app.f5recompra.com.br/og-f5-recompra-v14.png'],
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
