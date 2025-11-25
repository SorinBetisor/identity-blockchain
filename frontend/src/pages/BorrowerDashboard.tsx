import { IdentityCard } from '../components/IdentityCard'
import { GrantConsent } from '../components/GrantConsent'
import { RevokeConsent } from '../components/RevokeConsent'

export function BorrowerDashboard() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-500 mt-2">Manage your digital identity, control data access, and monitor activity.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IdentityCard />
        
        <div>
          <GrantConsent />
          <RevokeConsent />
        </div>
      </div>
    </div>
  )
}
