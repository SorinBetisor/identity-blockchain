import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useConsentManager } from '../hooks/useConsentManager'
import { Key, Calendar, Loader2 } from 'lucide-react'

export function GrantConsent() {
  const { address } = useAccount()
  const { createConsent, isPending, isConfirming } = useConsentManager()
  const [requesterAddress, setRequesterAddress] = useState('')
  const [days, setDays] = useState(30)

  const handleGrant = (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !requesterAddress) return
    
    // Basic address validation
    if (!requesterAddress.startsWith('0x') || requesterAddress.length !== 42) {
      alert('Invalid address format')
      return
    }

    createConsent(requesterAddress as `0x${string}`, address, days)
  }

  return (
    <div className="glass p-6 rounded-xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Key className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Grant Access</h2>
      </div>

      <form onSubmit={handleGrant} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Requester Address
          </label>
          <input
            type="text"
            value={requesterAddress}
            onChange={(e) => setRequesterAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (Days)
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              min="1"
              max="365"
              className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!address || isPending || isConfirming}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-2.5 px-4 rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Grant Consent'
          )}
        </button>
      </form>
    </div>
  )
}
