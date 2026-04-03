'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">InvoiceFlow</h1>
          <p className="text-gray-600 mt-2">Get paid faster</p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
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
            providers={['google', 'github']}   // you can remove these later if you want only email
            redirectTo="http://localhost:3000/dashboard"  // we'll create this soon
          />
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          Free to start • No credit card required
        </p>
      </div>
    </div>
  )
}
