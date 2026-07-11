import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'F5 Recompra',
    short_name: 'F5 Recompra',
    description: 'Motor de recompra para lojas',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#052e1b',
    theme_color: '#052e1b',
    icons: [
      {
        src: '/f5-icon-192-v14.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/f5-icon-512-v14.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/f5-icon-maskable-192-v14.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/f5-icon-maskable-512-v14.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
