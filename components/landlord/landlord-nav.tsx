'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

export default function LandlordNav() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  const links = [
    { href: '/landlord/dashboard', label: 'Dashboard' },
    { href: '/landlord/properties', label: 'Properties' },
    { href: '/landlord/tenants', label: 'Tenants' },
    { href: '/landlord/leases', label: 'Leases' },
    { href: '/landlord/finances', label: 'Finances' },
  ]

  return (
    <nav className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/landlord/dashboard" className="text-xl font-bold">
              RentPay
            </Link>
            <div className="hidden md:flex gap-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  )
}
