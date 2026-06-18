export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-accent bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            DOBLELABS
          </h1>
          <p className="mt-2 text-sm font-medium text-text-secondary">
            Clonación de video con IA
          </p>
        </div>

        {/* Card */}
        <div className="auth-card rounded-xl p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
