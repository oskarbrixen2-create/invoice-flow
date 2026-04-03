'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in')

  // This listener fixes the redirect problem
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        router.push('/dashboard')
        router.refresh()   // forces dashboard to load fresh
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">InvoiceFlow</h1>
          <p className="text-gray-600 mt-2">Get paid faster</p>
        </div>

        <div className="bg-white shadow-xl rounded-3xl p-8 border border-gray-100">
          {/* Tabs */}
          <div className="flex border-b mb-6">
            <button
              onClick={() => setView('sign_in')}
              className={`flex-1 py-3 text-center font-medium ${view === 'sign_in' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setView('sign_up')}
              className={`flex-1 py-3 text-center font-medium ${view === 'sign_up' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
              Sign Up
            </button>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3b82f6',
                    brandAccent: '#2563eb',
                  },
                },
              },
            }}
            providers={[]}
            view={view}
          />
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          Free to start • No credit card required
        </p>
      </div>
    </div>
  )
}
