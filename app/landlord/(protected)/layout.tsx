import { redirect } from 'next/navigation'
import { getUser, getUserRole } from '@/lib/auth/auth-helpers'
import LandlordNav from '@/components/landlord/landlord-nav'
import { AuthProvider } from '@/contexts/auth-context'

export default async function LandlordProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  const role = await getUserRole()

  if (!user) {
    redirect('/landlord/login')
  }

  if (role !== 'landlord' && role !== null) {
    redirect('/tenant/dashboard')
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <LandlordNav />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
