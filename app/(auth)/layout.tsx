export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-accent bg-clip-text text-transparent">
            JAIME AI
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Video personalization platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
