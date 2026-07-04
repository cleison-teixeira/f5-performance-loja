import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
  ),
  title: 'F5 Recompra',
  description: 'Motor de recompra para lojas',
  icons: {
    icon: [
      { url: '/favicon.ico?v=5', sizes: 'any' },
      { url: '/favicon.png?v=5', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=5',
    apple: '/apple-touch-icon.png?v=5',
  },
  manifest: '/site.webmanifest?v=5',
  openGraph: {
    title: 'F5 Recompra',
    description: 'Motor de recompra para lojas',
    images: [{ url: '/branding/logo-icone-f5.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/branding/logo-icone-f5.png'],
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
