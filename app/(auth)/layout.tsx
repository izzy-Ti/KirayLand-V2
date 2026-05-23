export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-black relative overflow-hidden items-center justify-center">
        {/* Animated grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        {/* Floating orb */}
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-white/3 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />

        <div className="relative z-10 text-center px-12">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8">
            <span className="text-brand-black font-bold text-2xl">ኪ</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            ኪራይLand
          </h1>
          <p className="mt-4 text-lg text-white/50 max-w-sm mx-auto leading-relaxed">
            Rent anything, from anyone — backed by smart escrow protection.
          </p>
          <div className="mt-10 flex items-center justify-center gap-6 text-white/30 text-xs">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              Secure Escrow
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full" />
              Verified Users
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full" />
              Real-time Chat
            </span>
          </div>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
