import { WalletConnect } from './WalletConnect'
import { LayoutDashboard, ShieldCheck, History } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  currentView: 'dashboard' | 'audit-log'
  onNavigate: (view: 'dashboard' | 'audit-log') => void
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-600/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              IdentityChain
            </span>
          </div>
          <WalletConnect />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          <aside className="col-span-12 md:col-span-3 lg:col-span-2 space-y-1">
            <nav className="space-y-1">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === 'dashboard'
                    ? 'text-blue-600 bg-blue-50 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </button>
              <button
                onClick={() => onNavigate('audit-log')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === 'audit-log'
                    ? 'text-blue-600 bg-blue-50 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <History className="w-5 h-5" />
                Audit Log
              </button>
            </nav>
          </aside>

          <main className="col-span-12 md:col-span-9 lg:col-span-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
