import { useEffect, useState, useCallback } from 'react'
import { useAccount, usePublicClient, useWatchBlockNumber } from 'wagmi'
import { parseAbiItem } from 'viem'
import { CONTRACT_ADDRESSES, ConsentStatus } from '../contracts'
import { Key, Clock, CheckCircle2, Loader2, ChevronDown, ChevronUp, Copy } from 'lucide-react'

interface Consent {
  consentID: string
  requesterDID: string
  startDate: bigint
  endDate: bigint
  timestamp: bigint
  status: number
}

interface GrantedConsentsProps {
  refreshTrigger?: number
}

export function GrantedConsents({ refreshTrigger }: GrantedConsentsProps = {}) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [consents, setConsents] = useState<Consent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedConsents, setExpandedConsents] = useState<Set<string>>(new Set())

  const fetchConsents = useCallback(async () => {
    if (!address || !publicClient) return

    setIsLoading(true)
    try {
      const consentCreatedLogs = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.ConsentManager,
        event: parseAbiItem(
          'event ConsentCreated(address indexed userDID, address indexed requesterDID, bytes32 indexed consentID, uint96 startDate, uint96 endDate, uint256 timestamp)'
        ),
        args: { userDID: address },
        fromBlock: 'earliest',
      })

      const statusChangedLogs = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.ConsentManager,
        event: parseAbiItem(
          'event ConsentStatusChanged(address indexed userDID, address indexed requesterDID, bytes32 indexed consentID, uint8 oldStatus, uint8 newStatus, uint256 timestamp)'
        ),
        args: { userDID: address },
        fromBlock: 'earliest',
      })

      const statusMap = new Map<string, number>()
      statusChangedLogs.forEach((log) => {
        const consentID = log.args.consentID as string
        const newStatus = Number(log.args.newStatus)
        statusMap.set(consentID, newStatus)
      })

      const currentTime = BigInt(Math.floor(Date.now() / 1000))
      const processedConsents: Consent[] = consentCreatedLogs.map((log) => {
        const consentID = log.args.consentID as string
        const endDate = log.args.endDate as bigint
        const startDate = log.args.startDate as bigint
        
        let status = statusMap.get(consentID) ?? ConsentStatus.Requested
        
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

      const grantedConsents = processedConsents.filter((c) => {
        const isActive = currentTime >= c.startDate && currentTime <= c.endDate
        return (
          (c.status === ConsentStatus.Granted && isActive) ||
          (c.status === ConsentStatus.Requested && isActive)
        )
      })

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
  }, [address, publicClient])

  useWatchBlockNumber({
    onBlockNumber: () => {
      if (address && publicClient) {
        fetchConsents()
      }
    },
  })

  useEffect(() => {
    if (!address || !publicClient) return

    fetchConsents()

    const interval = setInterval(fetchConsents, 30000)
    return () => clearInterval(interval)
  }, [address, publicClient, fetchConsents])

  useEffect(() => {
    if (refreshTrigger && address && publicClient) {
      fetchConsents()
    }
  }, [refreshTrigger, address, publicClient, fetchConsents])

  const toggleExpand = (consentID: string) => {
    setExpandedConsents((prev) => {
      const next = new Set(prev)
      if (next.has(consentID)) {
        next.delete(consentID)
      } else {
        next.add(consentID)
      }
      return next
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatFullDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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

  const getDuration = (startDate: bigint, endDate: bigint) => {
    const start = Number(startDate)
    const end = Number(endDate)
    const diff = end - start
    const days = Math.floor(diff / (24 * 60 * 60))
    return days
  }

  if (isLoading && consents.length === 0) {
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
            const isExpanded = expandedConsents.has(consent.consentID)
            const duration = getDuration(consent.startDate, consent.endDate)
            return (
              <div
                key={consent.consentID}
                className="p-4 bg-gray-50/50 border border-gray-200 rounded-lg hover:border-green-300 transition-colors"
              >
                <div className="flex items-start justify-between">
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
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Full Address:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-gray-900">{consent.requesterDID}</span>
                            <button
                              onClick={() => copyToClipboard(consent.requesterDID)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title="Copy address"
                            >
                              <Copy className="w-3 h-3 text-gray-500" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Duration:</span>
                          <span className="font-medium text-gray-900">{duration} days</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Start Date:</span>
                          <span className="font-medium text-gray-900">
                            {formatFullDate(consent.startDate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">End Date:</span>
                          <span className="font-medium text-gray-900">
                            {formatFullDate(consent.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Consent ID:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-gray-900 text-[10px]">
                              {consent.consentID.slice(0, 10)}...{consent.consentID.slice(-8)}
                            </span>
                            <button
                              onClick={() => copyToClipboard(consent.consentID)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title="Copy consent ID"
                            >
                              <Copy className="w-3 h-3 text-gray-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleExpand(consent.consentID)}
                    className="ml-4 p-1.5 hover:bg-gray-200 rounded transition-colors"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
