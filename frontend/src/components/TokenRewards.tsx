import { useAccount } from "wagmi";
import { Gift, Wallet, RefreshCw } from "lucide-react";
import { useTokenBalance } from "../hooks/useTokenBalance";

export function TokenRewards() {
  const { address } = useAccount();
  const { data, formatted, refetch, isFetching } = useTokenBalance(address);

  return (
    <div className="glass p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Gift className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Reward Balance</h3>
            <p className="text-sm text-gray-500">DataSharingToken (minted on first consented access)</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={!address || isFetching}
          className="inline-flex items-center gap-2 text-sm text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100 hover:bg-purple-100 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {address ? (
        <div className="space-y-2">
          <div className="text-3xl font-bold text-gray-900">{formatted ?? "0.0"}</div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Wallet className="w-4 h-4" />
            <span className="font-mono break-all">{address}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600">Connect a wallet to view rewards.</p>
      )}
    </div>
  );
}
