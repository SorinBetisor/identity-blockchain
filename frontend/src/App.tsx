import { useState } from 'react'
import { Layout } from './components/Layout'
import { BorrowerDashboard } from './pages/BorrowerDashboard'
import { AuditLog } from './components/AuditLog'

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'audit-log'>('dashboard')

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {currentView === 'dashboard' ? (
        <BorrowerDashboard />
      ) : (
        <div className="space-y-6">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
            <p className="text-gray-500 mt-2">View your registration, consent history, and data access requests.</p>
          </div>
          <AuditLog />
        </div>
      )}
    </Layout>
  )
}

export default App
