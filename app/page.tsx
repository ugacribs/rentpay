import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-600 to-blue-800">
      {/* Header */}
      <header className="p-4">
        <h1 className="text-2xl font-bold text-white">RentPay</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Welcome to RentPay</h2>
          <p className="text-blue-100 text-lg">
            Pay your rent easily and securely
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
          <h3 className="text-xl font-semibold text-center mb-6 text-gray-800">
            Tenant Portal
          </h3>

          <div className="space-y-4">
            <Link
              href="/tenant/signup"
              className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Sign Up / Login
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-sm text-gray-500">
              New tenant? Your landlord will send you a lease invite.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-blue-200 text-sm">
        <p>© 2026 RentPay. Manage rent payments with ease.</p>
      </footer>
    </div>
  )
}
