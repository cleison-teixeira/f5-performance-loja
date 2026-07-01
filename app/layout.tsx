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
    icon: '/branding/favicon.png',
    apple: '/branding/app-icon-dark.png',
  },
  openGraph: {
    title: 'F5 Recompra',
    description: 'Motor de recompra para lojas',
    images: [{ url: '/branding/og-image.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/branding/og-image.png'],
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
