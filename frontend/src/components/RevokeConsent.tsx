import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useConsentManager } from '../hooks/useConsentManager'
import { ShieldAlert, Loader2 } from 'lucide-react'
import { keccak256, encodePacked } from 'viem'

export function RevokeConsent() {
  const { address } = useAccount()
  const { revokeConsent, isPending, isConfirming } = useConsentManager()
  const [requesterAddress, setRequesterAddress] = useState('')

  const handleRevoke = (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !requesterAddress) return

    try {
      const consentID = keccak256(encodePacked(
        ['address', 'address'],
        [requesterAddress as `0x${string}`, address]
      ))
      
      revokeConsent(address, consentID)
    } catch (err) {
      console.error('Error calculating consent ID:', err)
      alert('Invalid address format')
    }
  }

  return (
    <div className="glass p-6 rounded-xl mt-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-red-100 rounded-lg">
          <ShieldAlert className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Revoke Access</h2>
      </div>

      <form onSubmit={handleRevoke} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Requester Address to Revoke
          </label>
          <input
            type="text"
            value={requesterAddress}
            onChange={(e) => setRequesterAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            required
          />
        </div>

        <button
          type="submit"
          disabled={!address || isPending || isConfirming}
          className="w-full bg-red-50 text-red-600 border border-red-200 py-2.5 px-4 rounded-xl hover:bg-red-100 hover:shadow-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Revoking...
            </>
          ) : (
            'Revoke Consent'
          )}
        </button>
      </form>
    </div>
  )
}
