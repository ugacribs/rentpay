import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-4">RentPay</h1>
        <p className="text-gray-600 text-center mb-8">
          Modern Property Management System
        </p>

        <div className="space-y-4">
          <Link
            href="/tenant/signup"
            className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Tenant Sign Up
          </Link>

          <Link
            href="/landlord/dashboard"
            className="block w-full border-2 border-blue-600 text-blue-600 text-center py-3 px-4 rounded-lg hover:bg-blue-50 transition font-semibold"
          >
            Landlord Dashboard
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
          <p>Manage rent payments, leases, and more</p>
        </div>
      </div>
    </div>
  )
}
