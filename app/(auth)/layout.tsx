export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/branding/logo-horizontal-light.png"
            alt="F5 Recompra"
            className="h-12 w-auto mx-auto"
          />
          <p className="text-sm text-muted-foreground mt-3">
            Motor de recompra para lojas
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
