export function StagingBanner() {
  if (process.env.VERCEL_ENV === 'production') return null
  if (!process.env.VERCEL_ENV) return null
  return (
    <div className="w-full shrink-0 bg-amber-50 border-b border-amber-300 text-amber-800 text-xs font-medium text-center py-1.5 px-4">
      Ambiente de Homologação — dados apenas para testes
    </div>
  )
}
