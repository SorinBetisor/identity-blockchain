/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import { usePublicClient, useAccount } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../contracts'
import { parseAbiItem } from 'viem'
import { FileText, CheckCircle, XCircle, Loader2, Key, Shield, UserPlus } from 'lucide-react'

interface ActivityLogEntry {
  type: 'AccessGranted' | 'AccessDenied' | 'ConsentGiven' | 'ConsentRevoked' | 'Registered'
  title: string
  details: string
  timestamp: number
  hash: string
  icon: any
  color: string
}

export function AuditLog() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!address || !publicClient) return

    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        const [
          accessGranted,
          accessDenied,
          consentCreated,
          consentStatus,
          userRegistered
        ] = await Promise.all([
          // 1. Data Access Granted
          publicClient.getLogs({
            address: CONTRACT_ADDRESSES.DataBroker,
            event: parseAbiItem('event DataAccessGranted(address indexed requesterDID, address indexed ownerDID, string dataType, uint256 timestamp)'),
            args: { ownerDID: address },
            fromBlock: 'earliest'
          }),
          // 2. Data Access Denied
          publicClient.getLogs({
            address: CONTRACT_ADDRESSES.DataBroker,
            event: parseAbiItem('event DataAccessDenied(address indexed requesterDID, address indexed ownerDID, string dataType, string reason, uint256 timestamp)'),
            args: { ownerDID: address },
            fromBlock: 'earliest'
          }),
          // 3. Consent Created
          publicClient.getLogs({
            address: CONTRACT_ADDRESSES.ConsentManager,
            event: parseAbiItem('event ConsentCreated(address indexed userDID, address indexed requesterDID, bytes32 indexed consentID, uint96 startDate, uint96 endDate, uint256 timestamp)'),
            args: { userDID: address },
            fromBlock: 'earliest'
          }),
          // 4. Consent Status Changed (Revoked)
          publicClient.getLogs({
            address: CONTRACT_ADDRESSES.ConsentManager,
            event: parseAbiItem('event ConsentStatusChanged(address indexed userDID, address indexed requesterDID, bytes32 indexed consentID, uint8 oldStatus, uint8 newStatus, uint256 timestamp)'),
            args: { userDID: address },
            fromBlock: 'earliest'
          }),
          // 5. User Registered
          publicClient.getLogs({
            address: CONTRACT_ADDRESSES.IdentityRegistry,
            event: parseAbiItem('event UserRegistered(address indexed userDID)'),
            args: { userDID: address },
            fromBlock: 'earliest'
          })
        ])

        const formattedLogs: ActivityLogEntry[] = [
          ...accessGranted.map(log => ({
            type: 'AccessGranted' as const,
            title: 'Data Access Granted',
            details: `Requester: ${log.args.requesterDID?.slice(0,6)}...${log.args.requesterDID?.slice(-4)} • Data: ${log.args.dataType}`,
            timestamp: Number(log.args.timestamp!),
            hash: log.transactionHash,
            icon: CheckCircle,
            color: 'text-green-500'
          })),
          ...accessDenied.map(log => ({
            type: 'AccessDenied' as const,
            title: 'Data Access Denied',
            details: `Requester: ${log.args.requesterDID?.slice(0,6)}...${log.args.requesterDID?.slice(-4)} • Reason: ${log.args.reason}`,
            timestamp: Number(log.args.timestamp!),
            hash: log.transactionHash,
            icon: XCircle,
            color: 'text-red-500'
          })),
          ...consentCreated.map(log => ({
            type: 'ConsentGiven' as const,
            title: 'Consent Granted',
            details: `To: ${log.args.requesterDID?.slice(0,6)}...${log.args.requesterDID?.slice(-4)}`,
            timestamp: Number(log.args.timestamp!),
            hash: log.transactionHash,
            icon: Key,
            color: 'text-indigo-500'
          })),
          ...consentStatus.map(log => ({
            type: 'ConsentRevoked' as const,
            title: log.args.newStatus === 3 ? 'Consent Revoked' : 'Consent Updated',
            details: `From: ${log.args.requesterDID?.slice(0,6)}...${log.args.requesterDID?.slice(-4)}`,
            timestamp: Number(log.args.timestamp!),
            hash: log.transactionHash,
            icon: Shield,
            color: 'text-amber-500'
          })),
          ...userRegistered.map(log => ({
            type: 'Registered' as const,
            title: 'Identity Registered',
            details: 'User registered on IdentityRegistry',
            timestamp: 0, // Block timestamp needed, defaulting to 0 or current for now if not available in event args (UserRegistered in ABI didn't have timestamp, checking ABI...)
            hash: log.transactionHash,
            icon: UserPlus,
            color: 'text-blue-500'
          }))
        ].sort((a, b) => b.timestamp - a.timestamp)

        // For UserRegistered, we might not have a timestamp in the event args based on previous ABI view. 
        // If so, we might need to fetch block, but for now let's leave it or check ABI again.
        // Checking ABI in contracts.ts... UserRegistered inputs: [{ indexed: true, name: "userDID", type: "address" }] -> No timestamp.
        // We'll fetch block for UserRegistered or just put it at the bottom if 0. 
        // Actually, let's fetch block for it.
        
        if (userRegistered.length > 0) {
            const block = await publicClient.getBlock({ blockHash: userRegistered[0].blockHash })
            const regLog = formattedLogs.find(l => l.type === 'Registered')
            if (regLog) regLog.timestamp = Number(block.timestamp)
            formattedLogs.sort((a, b) => b.timestamp - a.timestamp)
        }

        setLogs(formattedLogs)
      } catch (error) {
        console.error('Error fetching logs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [address, publicClient])

  if (!address) return null

  return (
    <div className="glass p-6 rounded-xl mt-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-100 rounded-lg">
            <FileText className="w-6 h-6 text-gray-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Activity Log</h2>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
      </div>

      <div className="overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500">No activity found.</p>
          </div>
        ) : (
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-gray-100">
              {logs.map((log) => (
                <li key={log.hash + log.type} className="py-4 hover:bg-gray-50/50 transition-colors rounded-lg px-2 -mx-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <log.icon className={`h-6 w-6 ${log.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {log.title}
                      </p>
                      <p className="text-sm text-gray-500 truncate font-mono text-xs">
                        {log.details}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {log.timestamp > 0 ? new Date(log.timestamp * 1000).toLocaleString() : 'Just now'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
