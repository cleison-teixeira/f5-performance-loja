export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/branding/logo-f5-sem-fundo.png"
            alt="F5 Recompra"
            className="w-20 h-20 mx-auto object-contain"
          />
          <h1 className="text-xl font-bold tracking-tight mt-3">F5 Recompra</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Motor de recompra para lojas
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
