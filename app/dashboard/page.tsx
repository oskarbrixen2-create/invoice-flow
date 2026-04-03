'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        setLoading(false)
      }
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📄</span>
          <span className="text-2xl font-semibold">InvoiceFlow</span>
        </div>
        
        <div className="flex items-center gap-6">
          <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm px-5 py-2 border border-gray-300 rounded-2xl hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-10">Welcome back! Let’s create your first invoice.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/invoice/new"
            className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:border-blue-200 transition-colors block"
          >
            <h3 className="text-lg font-semibold mb-4">New Invoice</h3>
            <p className="text-gray-500 mb-8">Create a professional invoice in seconds with AI</p>
            <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-medium hover:bg-blue-700">
              + Create New Invoice
            </button>
          </Link>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-2">Recent Invoices</h3>
            <p className="text-gray-400 text-sm">No invoices yet</p>
          </div>
          
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-2">Amount Owed</h3>
            <p className="text-4xl font-bold text-gray-900">$0.00</p>
            <p className="text-green-600 text-sm mt-2">All paid up ✓</p>
          </div>
        </div>
      </div>
    </div>
  )
}
