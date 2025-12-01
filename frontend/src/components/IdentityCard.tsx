import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useIdentityRegistry, formatCreditTier, formatIncomeBand } from '../hooks/useIdentityRegistry'
import { User, Shield, AlertCircle, CheckCircle2 } from 'lucide-react'

export function IdentityCard() {
  const { address } = useAccount()
  const { register, useIdentity, isPending, isConfirming, isConfirmed } = useIdentityRegistry()
  const { data: identity, isLoading, refetch } = useIdentity(address)

  useEffect(() => {
    if (isConfirmed && address) {
      refetch()
    }
  }, [isConfirmed, address, refetch])

  if (!address) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Connect Wallet</h3>
        <p className="text-gray-500 mt-2">Please connect your wallet to view your identity.</p>
      </div>
    )
  }

  const isRegistered = identity && identity[0] !== '0x0000000000000000000000000000000000000000'

  return (
    <div className="glass p-6 rounded-xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          Digital Identity
        </h2>
        {isRegistered ? (
          <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full text-sm font-medium shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
            Registered
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-sm font-medium shadow-sm">
            <AlertCircle className="w-4 h-4" />
            Not Registered
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ) : isRegistered ? (
        <div className="space-y-4 animate-slide-up">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors duration-300">
              <p className="text-sm text-gray-500 mb-1">Credit Tier</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCreditTier(identity?.[1])}
              </p>
            </div>
            <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors duration-300">
              <p className="text-sm text-gray-500 mb-1">Income Band</p>
              <p className="text-lg font-bold text-gray-900">
                {formatIncomeBand(identity?.[2])}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-400 font-mono break-all bg-gray-50 p-2 rounded-lg">
            DID: {address}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 animate-slide-up">
          <p className="text-gray-600 mb-6">
            Register your identity on the blockchain to start building your credit profile.
          </p>
          <button
            onClick={() => register()}
            disabled={isPending || isConfirming}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isPending ? 'Check Wallet...' : isConfirming ? 'Registering...' : 'Register Identity'}
          </button>
        </div>
      )}
    </div>
  )
}
