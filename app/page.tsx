export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-blue-600">📄</span>
            <span className="text-2xl font-semibold text-gray-900">InvoiceFlow</span>
          </div>
          
          <a
            href="/login"
            className="px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-2xl hover:border-gray-400 transition-colors"
          >
            Log in
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center pt-24 pb-16 px-6">
        <h1 className="text-6xl font-bold text-gray-900 leading-tight mb-6">
          Make beautiful invoices<br />in seconds — for free
        </h1>
        
        <p className="text-2xl text-gray-600 max-w-2xl mx-auto mb-10">
          Start with ready-made templates or type naturally and let AI create perfect invoices instantly.
        </p>

        <div className="flex items-center justify-center gap-4">
          <a
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-3xl text-xl font-semibold inline-flex items-center gap-3 transition-colors"
          >
            Start making invoices — It’s free
          </a>
          
          <a
            href="#templates"
            className="px-8 py-5 text-lg font-medium text-gray-700 border border-gray-300 rounded-3xl hover:bg-gray-50 transition-colors"
          >
            Browse free templates →
          </a>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          No credit card • Unlimited clients • 8 free invoices every month
        </p>
      </div>

      {/* Simple benefit teaser */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-gray-500 uppercase tracking-widest text-sm mb-3">Free right now</p>
          <h2 className="text-3xl font-semibold text-gray-900">
            Beautiful templates + AI that actually understands you
          </h2>
        </div>
      </div>
    </div>
  )
}
