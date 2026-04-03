export default function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">InvoiceFlow</h1>
        <p className="text-xl text-gray-600 mb-10">The smartest way to send invoices</p>
        <a
          href="/login"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-lg font-medium inline-block"
        >
          Get Started — It’s Free
        </a>
      </div>
    </div>
  )
}
