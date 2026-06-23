export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">F5 Recompra</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Motor de recompra para lojas
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
