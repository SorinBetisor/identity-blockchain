import { useEffect, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { CONTRACT_ADDRESSES, ConsentStatus } from '../contracts'
import { Key, Clock, CheckCircle2, Loader2 } from 'lucide-react'

interface Consent {
  consentID: string
  requesterDID: string
  startDate: bigint
  endDate: bigint
  timestamp: bigint
  status: number
}

export function GrantedConsents() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [consents, setConsents] = useState<Consent[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!address || !publicClient) return

    const fetchConsents = async () => {
      setIsLoading(true)
      try {
        // Fetch all ConsentCreated events for this user
        const consentCreatedLogs = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.ConsentManager,
          event: parseAbiItem(
            'event ConsentCreated(address indexed userDID, address indexed requesterDID, bytes32 indexed consentID, uint96 startDate, uint96 endDate, uint256 timestamp)'
          ),
          args: { userDID: address },
          fromBlock: 'earliest',
        })

        // Fetch all ConsentStatusChanged events to track status changes
        const statusChangedLogs = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.ConsentManager,
          event: parseAbiItem(
            'event ConsentStatusChanged(address indexed userDID, address indexed requesterDID, bytes32 indexed consentID, uint8 oldStatus, uint8 newStatus, uint256 timestamp)'
          ),
          args: { userDID: address },
          fromBlock: 'earliest',
        })

        // Build a map of consentID -> latest status
        const statusMap = new Map<string, number>()
        statusChangedLogs.forEach((log) => {
          const consentID = log.args.consentID as string
          const newStatus = Number(log.args.newStatus)
          statusMap.set(consentID, newStatus)
        })

        // Process consent created events
        const currentTime = BigInt(Math.floor(Date.now() / 1000))
        const processedConsents: Consent[] = consentCreatedLogs.map((log) => {
          const consentID = log.args.consentID as string
          const endDate = log.args.endDate as bigint
          const startDate = log.args.startDate as bigint
          
          // Determine current status from status changes, default to Requested (as set in contract)
          let status = statusMap.get(consentID) ?? ConsentStatus.Requested
          
          // Check if expired (regardless of status)
          if (currentTime > endDate && status !== ConsentStatus.Revoked) {
            status = ConsentStatus.Expired
          }

          return {
            consentID,
            requesterDID: log.args.requesterDID as string,
            startDate,
            endDate,
            timestamp: log.args.timestamp as bigint,
            status,
          }
        })

        // Filter to show active consents:
        // - Status is Granted (1), or
        // - Status is Requested (2) and within valid time period (active)
        const grantedConsents = processedConsents.filter((c) => {
          const isActive = currentTime >= c.startDate && currentTime <= c.endDate
          return (
            (c.status === ConsentStatus.Granted && isActive) ||
            (c.status === ConsentStatus.Requested && isActive)
          )
        })

        // Sort by most recent first
        grantedConsents.sort((a, b) => {
          if (b.timestamp > a.timestamp) return 1
          if (b.timestamp < a.timestamp) return -1
          return 0
        })

        setConsents(grantedConsents)
      } catch (error) {
        console.error('Error fetching consents:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConsents()

    // Refresh every 30 seconds to check for status changes
    const interval = setInterval(fetchConsents, 30000)
    return () => clearInterval(interval)
  }, [address, publicClient])

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getDaysRemaining = (endDate: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const diff = Number(endDate - now)
    if (diff <= 0) return 0
    return Math.ceil(diff / (24 * 60 * 60))
  }

  if (isLoading) {
    return (
      <div className="glass p-6 rounded-xl animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <Key className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Active Consents</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="glass p-6 rounded-xl animate-fade-in" style={{ animationDelay: '0.3s' }}>
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <Key className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Active Consents</h2>
        {consents.length > 0 && (
          <span className="ml-auto px-2.5 py-0.5 bg-green-100 text-green-700 text-sm font-medium rounded-full">
            {consents.length}
          </span>
        )}
      </div>

      {consents.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No active consents</p>
          <p className="text-gray-400 text-xs mt-1">Grant consent to allow data access</p>
        </div>
      ) : (
        <div className="space-y-3">
          {consents.map((consent) => {
            const daysRemaining = getDaysRemaining(consent.endDate)
            return (
              <div
                key={consent.consentID}
                className="p-4 bg-gray-50/50 border border-gray-200 rounded-lg hover:border-green-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-gray-900">
                        {formatAddress(consent.requesterDID)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Expires: {formatDate(consent.endDate)}</span>
                      </div>
                      {daysRemaining > 0 && (
                        <span className="text-green-600 font-medium">
                          {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

