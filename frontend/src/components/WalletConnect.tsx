import { useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Wallet, LogOut, AlertCircle } from 'lucide-react'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connectors, connect, error } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    if (!isConnected && connectors.length > 0) {
      const mockConnector = connectors.find((c) => c.id === 'mock')
      if (mockConnector) {
        const timer = setTimeout(() => {
          connect({ connector: mockConnector })
        }, 100)
        return () => clearTimeout(timer)
      }
    }
  }, [isConnected, connectors, connect])

  if (isConnected) {
    return (
      <div className="flex items-center gap-4 animate-fade-in">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 shadow-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-mono font-medium">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
          title="Disconnect"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg font-medium ${
              connector.id === 'mock' 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Wallet className="w-4 h-4" />
            {connector.id === 'mock' ? 'Dev Wallet' : 'Connect Wallet'}
          </button>
        ))}
      </div>
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-500 animate-fade-in bg-red-50 px-2 py-1 rounded">
          <AlertCircle className="w-3 h-3" />
          {error.message.includes('User rejected') ? 'Connection rejected' : 'Failed to connect'}
        </div>
      )}
    </div>
  )
}
