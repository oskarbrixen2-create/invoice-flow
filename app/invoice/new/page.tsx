'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import OpenAI from 'openai'
import jsPDF from 'jspdf'
import { toPng } from 'html-to-image'
import { supabase } from '@/lib/supabase'

const groq = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
  dangerouslyAllowBrowser: true,
})

type LineItem = { id: number; description: string; quantity: number; rate: number }
type Client = { id: string; name: string; email: string; phone?: string }

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'DKK', symbol: 'kr.' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'CAD', symbol: 'CA$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CHF', symbol: 'Fr.' },
  { code: 'CNY', symbol: '元' },
]

export default function NewInvoice() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  // --- POINT SYSTEM ---
  const [credits, setCredits] = useState(0)
  const FREE_LIMIT = 10

  // --- BUSINESS PROFILE ---
  const [companyName, setCompanyName] = useState('Your Company Name')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState(1)
  const [vatRate, setVatRate] = useState(25)
  const [currency, setCurrency] = useState(CURRENCIES[0])

  // --- BRANDING ---
  const [watermark, setWatermark] = useState<string | null>(null)
  const [wmX, setWmX] = useState(40) 
  const [wmY, setWmY] = useState(250) 
  const [wmWidth, setWmWidth] = useState(300) 
  
  const wmXRef = useRef(wmX)
  const wmYRef = useRef(wmY)
  useEffect(() => { wmXRef.current = wmX; wmYRef.current = wmY }, [wmX, wmY])

  // --- TRANSACTIONAL DATA ---
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('') 
  const [clientPhone, setClientPhone] = useState('') 
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]) 
  const [items, setItems] = useState<LineItem[]>([{ id: Date.now(), description: '', quantity: 1, rate: 0 }])
  const [personalMessage, setPersonalMessage] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingClient, setSavingClient] = useState(false)

  // 1. LOAD DATA
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: clientData } = await supabase.from('clients').select('*').eq('user_id', user.id).order('name')
      setClients(clientData || [])

      const { data: s } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single()
      if (s) {
        setCompanyName(s.company_name || 'Your Company Name')
        setCompanyEmail(s.company_email || '')
        setCompanyPhone(s.company_phone || '')
        setCompanyAddress(s.company_address || '')
        setCompanyLogo(s.company_logo || null)
        setInvoiceNumber(s.next_invoice_number || 1)
        setVatRate(s.default_vat ?? 25)
        setWatermark(s.logo_data || null)
        setWmX(s.logo_x ?? 40); setWmY(s.logo_y ?? 250); setWmWidth(s.logo_width ?? 300)
        setCredits(s.credits ?? 10)
        const found = CURRENCIES.find(c => c.code === s.currency_code)
        if (found) setCurrency(found)
      }
    }
    loadData()
  }, [router])

  // 2. MASTER ACTIONS
  const saveBusinessInfo = async () => {
    if (!userId) return
    setSavingSettings(true)
    const payload = { 
        user_id: userId, company_name: companyName, company_email: companyEmail, 
        company_phone: companyPhone, company_address: companyAddress, 
        company_logo: companyLogo, logo_data: watermark, logo_x: wmX, 
        logo_y: wmY, logo_width: wmWidth, next_invoice_number: invoiceNumber, 
        default_vat: vatRate, currency_code: currency.code, credits: credits
    }
    const { error } = await supabase.from('user_settings').upsert(payload, { onConflict: 'user_id' })
    if (!error) alert('✅ Business Profile Overwritten & Saved')
    setSavingSettings(false)
  }

  const resetBusinessInfo = async () => {
    if (!confirm("Wipe all defaults? This doesn't affect your credits.")) return
    const defaults = {
      company_name: 'Your Company Name', company_email: '', company_phone: '',
      company_address: '', company_logo: null, logo_data: null,
      default_vat: 25, currency_code: 'USD', logo_x: 40, logo_y: 250, logo_width: 300
    }
    setCompanyName(defaults.company_name); setCompanyEmail(''); setCompanyPhone(''); setCompanyAddress('')
    setCompanyLogo(null); setWatermark(null); setVatRate(25); setCurrency(CURRENCIES[0])
    if (userId) await supabase.from('user_settings').upsert({ user_id: userId, ...defaults }, { onConflict: 'user_id' })
    alert('Defaults Reset')
  }

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id)
    const client = clients.find(c => c.id === id)
    if (client) { setClientName(client.name); setClientEmail(client.email); setClientPhone(client.phone || ''); }
  }

  const saveAsNewClient = async () => {
    if (!clientName || !clientEmail) return alert('Fill name and email')
    setSavingClient(true)
    const { error } = await supabase.from('clients').insert({ user_id: userId, name: clientName, email: clientEmail, phone: clientPhone })
    if (!error) {
      alert('✅ Customer Saved')
      const { data } = await supabase.from('clients').select('*').eq('user_id', userId).order('name')
      setClients(data || [])
    }
    setSavingClient(false)
  }

  // 3. LOGO & WATERMARK
  const handleLogoUpload = (e: any, type: 'logo' | 'wm') => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      if (type === 'logo') setCompanyLogo(base64)
      else setWatermark(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX; const startY = e.clientY
    const initialX = wmXRef.current; const initialY = wmYRef.current
    const move = (m: MouseEvent) => { setWmX(initialX + (m.clientX - startX)); setWmY(initialY + (m.clientY - startY)) }
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
  }

  // 4. ITEMS
  const addItem = () => setItems([...items, { id: Date.now(), description: '', quantity: 1, rate: 0 }])
  const updateItem = (id: number, f: keyof LineItem, v: any) => setItems(items.map(it => it.id === id ? { ...it, [f]: v } : it))
  const removeItem = (id: number) => items.length > 1 && setItems(items.filter(i => i.id !== id))
  const clearItems = () => setItems([{ id: Date.now(), description: '', quantity: 1, rate: 0 }])

  const subTotalAmount = items.reduce((s, i) => s + (i.quantity * i.rate), 0)
  const vatAmount = subTotalAmount * (vatRate / 100)
  const grandTotalAmount = subTotalAmount + vatAmount

  // 5. DOWNLOAD
  const downloadPDF = async () => {
    const el = document.getElementById('invoice-preview')
    if (!el) return
    setLoading(true)
    try {
      const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 4, backgroundColor: '#ffffff' })
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfW = pdf.internal.pageSize.getWidth(); const pdfH = pdf.internal.pageSize.getHeight()
      const imgProps = pdf.getImageProperties(dataUrl)
      const contentH = (imgProps.height * pdfW) / imgProps.width
      
      let hLeft = contentH; let pos = 0; let pNum = 1
      while (hLeft > 2) {
        pdf.addImage(dataUrl, 'PNG', 0, pos, pdfW, contentH)
        pdf.setFontSize(8); pdf.setTextColor(180)
        pdf.text(`${companyName} | INV-${String(invoiceNumber).padStart(5, '0')}`, 15, pdfH - 10)
        pdf.text(`Page ${pNum}`, pdfW - 25, pdfH - 10)
        hLeft -= pdfH; pos -= pdfH
        if (hLeft > 2) { pdf.addPage(); pNum++ }
      }
      pdf.save(`INV-${String(invoiceNumber).padStart(5, '0')}.pdf`)

      const nextInv = invoiceNumber + 1
      setInvoiceNumber(nextInv)
      if (userId) await supabase.from('user_settings').update({ next_invoice_number: nextInv }).eq('user_id', userId)

      setItems([{ id: Date.now(), description: '', quantity: 1, rate: 0 }])
      setAiPrompt(''); setClientName(''); setClientEmail(''); setClientPhone(''); setPersonalMessage('')
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  // 6. AI (DEDUCT 1 POINT)
  const magicFill = async () => {
    if (!aiPrompt.trim()) return
    if (credits <= 0) { alert("0 Credits left! Please refill."); return }

    setLoading(true)
    try {
      const today = "Friday, April 3, 2026";
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: `Expert Accountant. Today: ${today}. Breakdown items. Relative dates. Title Case. NO EMAIL or PHONE. JSON: { "clientName": "", "serviceDate": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD", "items": [{ "description": "", "quantity": 0, "rate": 0 }], "vatRate": 0, "message": "" }` }, { role: 'user', content: aiPrompt }]
      })
      const d = JSON.parse(res.choices[0].message.content!)
      setClientName(d.clientName || '')
      if (d.serviceDate) setServiceDate(d.serviceDate); if (d.dueDate) setDueDate(d.dueDate)
      if (d.items?.length) setItems(d.items.map((it: any, i: number) => ({ id: Date.now() + i, description: it.description, quantity: Number(it.quantity) || 1, rate: Number(it.rate) || 0 })))
      if (d.vatRate) setVatRate(d.vatRate); if (d.message) setPersonalMessage(d.message)

      const newBalance = credits - 1
      setCredits(newBalance)
      if (userId) await supabase.from('user_settings').update({ credits: newBalance }).eq('user_id', userId)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const t = {
    bg: isDarkMode ? 'bg-slate-950 text-slate-400' : 'bg-[#f4f7f9] text-slate-600',
    card: isDarkMode ? 'bg-slate-900 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-sm',
    input: isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-100',
    textH: isDarkMode ? 'text-white' : 'text-slate-900'
  }

  return (
    <div className={`min-h-screen ${t.bg} transition-colors duration-300 font-sans pb-20`}>
      <div className="max-w-7xl mx-auto px-8 py-10">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className={`text-4xl font-black ${t.textH} tracking-tight`}>InvoiceFlow</h1>
            <p className="font-medium opacity-60">Professional AI Billing Studio</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-5 py-2.5 rounded-2xl border font-black flex items-center gap-3 ${credits > 0 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                <span className="text-lg">🪙</span>
                <span className="text-sm tracking-widest uppercase">{credits} CREDITS</span>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-12 h-12 flex items-center justify-center rounded-2xl ${t.card} text-xl border shadow-md transition-all`}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={() => router.push('/dashboard')} className={`px-6 py-3 rounded-2xl ${t.card} font-bold ${t.textH} border shadow-md`}>Dashboard</button>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className={`mb-10 ${t.card} rounded-[2rem] p-8 border flex flex-wrap items-center gap-10`}>
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Branding</span>
            <div className="flex items-center gap-3">
               <label className="cursor-pointer bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-200">
                Logo
                <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'logo')} className="hidden" />
              </label>
               <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-xl text-xs font-bold">
                Watermark
                <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'wm')} className="hidden" />
              </label>
            </div>
          </div>
          <div className="w-px h-12 bg-slate-100 dark:bg-slate-800"></div>
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Currency</span>
            <div className={`flex items-center gap-2 px-4 py-2 border rounded-xl shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <select value={currency.code} onChange={(e) => setCurrency(CURRENCIES.find(curr => curr.code === e.target.value)!)} className="bg-transparent text-xs font-black border-none outline-none dark:text-white cursor-pointer uppercase">
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                </select>
            </div>
          </div>
          <div className="flex-1"></div>
          <button 
            onClick={() => router.push('/refill')}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-lg hover:scale-105 transition-all uppercase tracking-widest"
          >
            Refill Credits
          </button>
        </div>

        <div className="grid grid-cols-12 gap-12">
          {/* LEFT SIDE */}
          <div className="col-span-12 lg:col-span-7 flex gap-8">
            <div className="flex flex-col gap-6 pt-12">
               <button onClick={saveBusinessInfo} className="w-14 h-14 bg-blue-600 text-white rounded-[1.25rem] flex items-center justify-center shadow-xl hover:scale-110 transition-all group relative border-4 border-white dark:border-slate-900">
                 <span className="text-xl">💾</span>
                 <span className="absolute left-20 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all shadow-2xl">Save Defaults</span>
               </button>
               <button onClick={resetBusinessInfo} className="w-14 h-14 bg-white dark:bg-slate-800 text-red-500 rounded-[1.25rem] flex items-center justify-center shadow-lg border-2 border-red-50 hover:scale-110 transition-all group relative">
                 <span className="text-xl">🔄</span>
                 <span className="absolute left-20 bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all shadow-2xl">Factory Reset</span>
               </button>
            </div>

            <div className="flex-1 space-y-10">
              {/* SENDER */}
              <div className={`${t.card} rounded-[2rem] p-10 border`}>
                <h3 className={`text-2xl font-black ${t.textH} mb-8`}>Business Profile</h3>
                <div className="grid grid-cols-2 gap-8 mb-6">
                    <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Name" className={`w-full rounded-2xl px-6 py-4 border-none outline-none font-bold shadow-inner ${t.input}`} />
                    <input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} placeholder="Email" className={`w-full rounded-2xl px-6 py-4 border-none outline-none font-bold shadow-inner ${t.input}`} />
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="Address" className={`w-full rounded-2xl px-6 py-4 border-none outline-none font-bold shadow-inner ${t.input}`} />
                  <input type="text" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} placeholder="Phone" className={`w-full rounded-2xl px-6 py-4 border-none outline-none font-bold shadow-inner ${t.input}`} />
                </div>
              </div>

              {/* AI */}
              <div className={`${t.card} rounded-[2rem] p-10 border shadow-2xl`}>
                <h3 className={`text-xl font-black ${t.textH} mb-6 flex items-center gap-3`}>
                  <span className="bg-blue-600 w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg">✦</span> AI Magic Composer
                </h3>
                <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Describe messy info here..." className={`w-full h-24 rounded-3xl border-none p-6 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner ${t.input}`} />
                <button onClick={magicFill} disabled={loading || credits <= 0} className={`w-full ${credits <= 0 ? 'bg-red-500' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'} py-5 rounded-[1.5rem] text-white font-black shadow-xl transition-all uppercase tracking-widest`}>
                  {loading ? 'AI IS PROCESSING...' : credits <= 0 ? '0 CREDITS LEFT' : 'GENERATE INVOICE (COSTS 1🪙)'}
                </button>
              </div>

              {/* CLIENT */}
              <div className={`${t.card} rounded-[2.5rem] p-10 border`}>
                <div className="mb-10">
                  <label className="text-[10px] font-black uppercase opacity-40 ml-1 mb-3 block tracking-widest text-blue-600">Customer Book</label>
                  <select value={selectedClientId} onChange={e => handleSelectClient(e.target.value)} className={`w-full rounded-2xl border-none px-6 py-4 outline-none font-bold shadow-inner ${t.input}`}>
                    <option value="">Choose customer...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-6">
                    <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client Name" className={`w-full rounded-2xl px-6 py-4 border-none outline-none font-bold shadow-inner ${t.input}`} />
                    <div className="grid grid-cols-2 gap-8">
                        <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Client Email" className={`w-full rounded-2xl px-6 py-4 border-none outline-none font-bold shadow-inner ${t.input}`} />
                        <input type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Client Phone" className={`w-full rounded-2xl px-6 py-4 border-none outline-none font-bold shadow-inner ${t.input}`} />
                    </div>
                </div>
                <button onClick={saveAsNewClient} className="mt-8 text-xs font-bold text-blue-600 border border-blue-100 dark:border-blue-900 px-5 py-2 rounded-full hover:bg-blue-50 transition-all shadow-sm">💾 Save to Book</button>

                {/* DATES */}
                <div className="grid grid-cols-4 gap-4 mt-12 mb-10 border-t border-slate-50 dark:border-slate-800 pt-10 text-center">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Invoice ID</p>
                    <div className="flex items-center">
                      <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-2 py-4 font-black text-[10px] rounded-l-2xl border-r border-blue-100">INV-</span>
                      <input type="number" value={invoiceNumber} onChange={e => setInvoiceNumber(parseInt(e.target.value) || 1)} className={`w-full border-none rounded-r-2xl px-2 py-4 font-black outline-none text-sm shadow-inner ${t.input}`} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Issue Date</p>
                    <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={`w-full rounded-2xl border-none px-2 py-4 text-[10px] font-bold shadow-inner ${t.input}`} />
                  </div>
                  <div className="space-y-1 opacity-50 italic">
                    <p className="text-[8px] font-black uppercase tracking-widest">Service Date</p>
                    <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} className={`w-full rounded-2xl border-none px-2 py-4 text-[10px] font-bold shadow-inner ${t.input}`} />
                  </div>
                  <div className="space-y-1 opacity-50 italic">
                    <p className="text-[8px] font-black uppercase tracking-widest">Pay Deadline</p>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={`w-full rounded-2xl border-none px-2 py-4 text-[10px] font-bold shadow-inner ${t.input}`} />
                  </div>
                </div>

                {/* ITEMS */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`font-bold ${t.textH}`}>Line Items</h3>
                  <button onClick={clearItems} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600">Clear List</button>
                </div>
                <div className="space-y-4 mb-8">
                  {items.map(it => (
                    <div key={it.id} className={`grid grid-cols-12 gap-4 p-2 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <input type="text" value={it.description} onChange={e => updateItem(it.id, 'description', e.target.value)} placeholder="Description" className="col-span-6 bg-transparent border-none focus:ring-0 font-bold text-sm" />
                      <input type="number" value={it.quantity} onChange={e => updateItem(it.id, 'quantity', parseFloat(e.target.value))} className="col-span-2 bg-transparent border-none text-center focus:ring-0 text-sm font-bold" />
                      <input type="number" value={it.rate} onChange={e => updateItem(it.id, 'rate', parseFloat(e.target.value))} className="col-span-2 bg-transparent border-none text-center focus:ring-0 text-sm font-bold" />
                      <div className="col-span-2 flex items-center justify-between px-2">
                          <span className={`text-sm font-black ${t.textH}`}>{currency.symbol}{(it.quantity * it.rate).toFixed(0)}</span>
                          <button onClick={() => items.length > 1 && setItems(items.filter(i => i.id !== it.id))} className="text-slate-300 hover:text-red-500 font-bold transition-all text-lg">×</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addItem} className="w-full py-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black text-slate-400 hover:border-blue-300 transition-all tracking-widest uppercase">+ Add Item</button>
                </div>

                {/* TOTALS */}
                <div className="border-t border-slate-50 dark:border-slate-800 pt-8 space-y-4 font-bold opacity-40 uppercase tracking-widest">
                  <div className="flex justify-between text-sm tracking-widest"><span>Subtotal</span><span>{currency.symbol}{subTotalAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center text-sm tracking-widest">
                    <span>VAT (%) <input type="number" value={vatRate} onChange={e => setVatRate(parseFloat(e.target.value))} className="w-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg px-2 py-1 text-center font-black border-none ml-2" /></span>
                    <span>{currency.symbol}{vatAmount.toFixed(2)}</span>
                  </div>
                  <div className={`flex justify-between text-4xl font-black ${t.textH} border-t-4 border-slate-900 dark:border-slate-700 pt-6 tracking-normal`}><span>Total Due</span><span>{currency.symbol}{grandTotalAmount.toFixed(2)}</span></div>
                </div>

                <div className="mt-12 text-blue-600 tracking-widest uppercase text-[10px] font-black">
                  <label className="ml-1 block mb-3">Message to Customer</label>
                  <textarea value={personalMessage} onChange={e => setPersonalMessage(e.target.value)} placeholder="Type greeting..." className={`w-full h-32 rounded-3xl border-none outline-none p-6 text-sm font-bold shadow-inner ${t.input}`} />
                </div>
              </div>
            </div>
          </div>

          {/* PREVIEW */}
          <div className="col-span-12 lg:col-span-5">
            <div className="sticky top-10">
              <div id="invoice-preview" style={{ backgroundColor: '#ffffff', minHeight: '841px', width: '595px', padding: '60px', position: 'relative', overflow: 'hidden', color: '#111827', border: '1px solid #e5e7eb', fontFamily: 'sans-serif' }}>
                {watermark && (
                  <img src={watermark} alt="WM" onMouseDown={handleMouseDown} style={{ position: 'absolute', left: `${wmX}px`, top: `${wmY}px`, width: `${wmWidth}px`, opacity: 0.35, cursor: 'move', zIndex: 0 }} />
                )}
                <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '60px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {companyLogo ? <img src={companyLogo} style={{ height: '45px', marginRight: '20px', objectFit: 'contain' }} /> : <div style={{ height: '40px', width: '40px', backgroundColor: '#2563eb', borderRadius: '10px', marginRight: '20px' }} />}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '18px', color: '#111827' }}>{companyName}</div>
                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>{companyAddress}</div>
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>{companyEmail} • {companyPhone}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '24px', color: '#f3f4f6', letterSpacing: '4px', textTransform: 'uppercase' }}>Invoice</div>
                      <div style={{ fontWeight: 700, fontSize: '12px', color: '#111827' }}>INV-{String(invoiceNumber).padStart(5, '0')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>Bill To</div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{clientName || 'Client Name'}</div>
                      <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '3px' }}>{clientEmail}</div>
                      <div style={{ fontSize: '10px', color: '#4b5563' }}>{clientPhone}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '10px', color: '#4b5563' }}>
                      <div style={{ marginBottom: '3px' }}>Issued: <span style={{ color: '#111827', fontWeight: 600 }}>{issueDate}</span></div>
                      <div style={{ marginBottom: '3px' }}>Service: <span style={{ color: '#111827', fontWeight: 600 }}>{serviceDate}</span></div>
                      <div>Due: <span style={{ color: '#ef4444', fontWeight: 700 }}>{dueDate}</span></div>
                    </div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #111827', textAlign: 'left', fontSize: '9px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>
                        <th style={{ paddingBottom: '12px' }}>Description</th>
                        <th style={{ paddingBottom: '12px', textAlign: 'center' }}>Qty</th>
                        <th style={{ paddingBottom: '12px', textAlign: 'right' }}>Rate</th>
                        <th style={{ paddingBottom: '12px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '11px' }}>
                      {items.map(it => (
                        <tr key={it.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '14px 0', fontWeight: 500, color: '#374151' }}>{it.description || '—'}</td>
                          <td style={{ padding: '14px 0', textAlign: 'center', color: '#374151' }}>{it.quantity}</td>
                          <td style={{ padding: '14px 0', textAlign: 'right', color: '#374151' }}>{currency.symbol}{it.rate.toFixed(2)}</td>
                          <td style={{ padding: '14px 0', textAlign: 'right', fontWeight: 700, color: '#111827' }}>{currency.symbol}{(it.quantity * it.rate).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '200px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#6b7280' }}>Subtotal</span><span style={{ fontWeight: 600 }}>{currency.symbol}{subTotalAmount.toFixed(2)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}><span style={{ color: '#6b7280' }}>VAT ({vatRate}%)</span><span style={{ fontWeight: 600 }}>{currency.symbol}{vatAmount.toFixed(2)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '15px', fontSize: '20px', fontWeight: 800, color: '#111827' }}><span>Total</span><span>{currency.symbol}{grandTotalAmount.toFixed(2)}</span></div>
                    </div>
                  </div>
                  {personalMessage && (
                    <div style={{ marginTop: '60px', fontSize: '11px', color: '#4b5563', lineHeight: '1.6', borderTop: '2px solid #f3f4f6', paddingTop: '20px' }}>
                        <div style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', fontSize: '9px', color: '#2563eb' }}>Message to Customer</div>
                        {personalMessage}
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={downloadPDF} 
                disabled={loading} 
                className={`mt-8 w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl transition-all uppercase tracking-widest`}
              >
                {loading ? 'GENERATING PDF...' : 'DOWNLOAD (FREE)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}