'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

export default function LandlordNav() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const links = [
    { href: '/landlord/dashboard', label: 'Dashboard' },
    { href: '/landlord/properties', label: 'Properties' },
    { href: '/landlord/tenants', label: 'Tenants' },
    { href: '/landlord/leases', label: 'Leases' },
  ]

  return (
    <nav className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/landlord/dashboard" className="text-xl font-bold">
              RentPay
            </Link>
            {/* Desktop Navigation */}
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
          
          {/* Desktop Sign Out */}
          <div className="hidden md:block">
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>

          {/* Mobile Hamburger Menu */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t">
            <div className="flex flex-col space-y-1 pt-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-3 py-3 rounded-md text-base font-medium transition-colors",
                    pathname === link.href
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 px-3">
                <Button variant="outline" onClick={signOut} className="w-full">
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>>
  )
}
