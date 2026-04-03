'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const PACKS = [
  { id: 'starter', name: 'Starter Pack', credits: 70, price: '3.99', popular: false, icon: '🌱' },
  { id: 'pro', name: 'Business Pack', credits: 300, price: '8.99', popular: true, icon: '🚀' },
  { id: 'elite', name: 'Unlimited Feel', credits: 400, price: '9.99', popular: false, icon: '👑' },
]

export default function RefillPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [currentCredits, setCurrentCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: s } = await supabase.from('user_settings').select('credits').eq('user_id', user.id).single()
      if (s) setCurrentCredits(s.credits || 0)
      setLoading(false)
    }
    loadUser()
  }, [router])

  const handlePurchase = async (pack: any) => {
    if (!userId) {
        alert("Please log in to purchase credits.");
        return;
    }
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceAmount: pack.price,
          userId: userId,
          credits: pack.credits
        }),
      })

      const { url, error } = await response.json()
      if (error) throw new Error(error)
      
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      alert("Something went wrong with the checkout: " + err)
    }
  }

  const t = {
    bg: isDarkMode ? 'bg-slate-950 text-slate-400' : 'bg-[#f4f7f9] text-slate-600',
    card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
    textH: isDarkMode ? 'text-white' : 'text-slate-900'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest animate-pulse">
        Connecting to Store...
    </div>
  )

  return (
    <div className={`min-h-screen ${t.bg} transition-colors duration-300 font-sans pb-20`}>
      <div className="max-w-6xl mx-auto px-8 py-10">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-16">
          <button onClick={() => router.push('/invoice/new')} className="text-sm font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all">
            ← Back to Studio
          </button>
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 flex items-center gap-3">
              <span className="text-xl">🪙</span>
              <span>{currentCredits} CREDITS</span>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-12 h-12 flex items-center justify-center rounded-2xl ${t.card} border text-xl shadow-md`}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <div className="text-center mb-16">
          <h1 className={`text-5xl font-black ${t.textH} mb-4 tracking-tight`}>Refill Your Magic</h1>
          <p className="text-lg opacity-60">AI generations cost 1 credit. Points never expire.</p>
        </div>

        {/* PRICING GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {PACKS.map((pack) => (
            <div 
              key={pack.id} 
              className={`relative ${t.card} border-2 rounded-[2.5rem] p-10 flex flex-col items-center text-center transition-all hover:scale-[1.02] ${pack.popular ? 'border-blue-500 shadow-2xl' : 'shadow-sm'}`}
            >
              {pack.popular && (
                <span className="absolute -top-4 bg-blue-500 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                  Best Value
                </span>
              )}
              
              <div className="text-6xl mb-6">{pack.icon}</div>
              <h2 className={`text-2xl font-black ${t.textH} mb-2`}>{pack.name}</h2>
              <div className="text-blue-600 font-black text-4xl mb-8">
                {pack.credits} <span className="text-sm opacity-60 uppercase tracking-widest">Points</span>
              </div>

              <div className="flex flex-col gap-4 w-full mb-10 text-left opacity-80 text-sm font-bold">
                <div className="flex items-center gap-2">✅ AI Magic Enabled</div>
                <div className="flex items-center gap-2">✅ Lifetime Validity</div>
                <div className="flex items-center gap-2">✅ Secure Stripe Payment</div>
              </div>

              <div className="mt-auto w-full">
                <div className={`text-3xl font-black ${t.textH} mb-6`}>${pack.price}</div>
                
                <button 
                  onClick={() => handlePurchase(pack)}
                  className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all ${pack.popular ? 'bg-blue-600 text-white shadow-xl hover:bg-blue-700' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center mt-20 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
          Transactions are encrypted and secured by Stripe.
        </p>
      </div>
    </div>
  )
}
