import { useEffect, useState } from "react";
import { api } from "../api";
import { Building2, Loader2, Coins } from "lucide-react";
import { useAccount } from "wagmi";
import { useTokenBalance } from "../hooks/useTokenBalance";

export function BankAccess() {
  const { address } = useAccount();
  const { formatted, refetch } = useTokenBalance(address);
  const [bankPrivateKey, setBankPrivateKey] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [credit, setCredit] = useState<any | null>(null);
  const [income, setIncome] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rewardFlash, setRewardFlash] = useState<string | null>(null);

  const requestData = async (type: "credit" | "income") => {
    setIsLoading(true);
    setError(null);
    try {
      if (type === "credit") {
        const res = await api.brokerCreditTier({
          requesterPrivateKey: bankPrivateKey,
          ownerAddress,
        });
        setCredit(res);
        if (res.rewardEvents?.length) {
          setRewardFlash(`Reward minted to ${res.rewardEvents[0].ownerDID}`);
          refetch();
        }
      } else {
        const res = await api.brokerIncomeBand({
          requesterPrivateKey: bankPrivateKey,
          ownerAddress,
        });
        setIncome(res);
        if (res.rewardEvents?.length) {
          setRewardFlash(`Reward minted to ${res.rewardEvents[0].ownerDID}`);
          refetch();
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to request data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!rewardFlash) return;
    const timer = setTimeout(() => setRewardFlash(null), 2200);
    return () => clearTimeout(timer);
  }, [rewardFlash]);

  return (
    <div className="glass p-6 rounded-xl space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Building2 className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bank Access (Consent Enforced)</h2>
          <p className="text-sm text-gray-500">Requests go through DataBroker, minting rewards on first access.</p>
        </div>
      </div>

      <div className="bg-white border border-amber-100 rounded-lg p-3 flex items-center justify-between text-sm text-gray-700">
        <span>Reward balance</span>
        <span className="font-semibold text-amber-700">{formatted ?? "0.0"} DST</span>
      </div>

      {rewardFlash && (
        <div className="fixed inset-0 pointer-events-none transition-opacity duration-300">
          <div className="absolute top-8 left-1/2 -translate-x-1/2">
            <div className="px-4 py-3 rounded-full bg-amber-500 text-white shadow-lg animate-pulse">
              {rewardFlash}
            </div>
          </div>
          <div className="absolute inset-0 bg-amber-200/20 animate-ping"></div>
        </div>
      )}

      <div className="space-y-3">
        <input
          type="text"
          value={bankPrivateKey}
          onChange={(e) => setBankPrivateKey(e.target.value)}
          placeholder="Bank private key"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
        />
        <input
          type="text"
          value={ownerAddress}
          onChange={(e) => setOwnerAddress(e.target.value)}
          placeholder="Client address (owner)"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
        />
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => requestData("credit")}
            disabled={isLoading}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2.5 rounded-lg flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Credit Tier
          </button>
          <button
            onClick={() => requestData("income")}
            disabled={isLoading}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-2.5 rounded-lg flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Income Band
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {credit && (
        <div className="bg-white border border-amber-100 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-amber-700 font-semibold">
            <Coins className="w-4 h-4" />
            Credit Tier: {credit.label} ({credit.value})
          </div>
          <div className="text-xs text-gray-500">tx: {credit.tx}</div>
          {credit.rewardEvents?.length ? (
            <div className="text-xs text-gray-600">
              Reward minted to owner ({credit.rewardEvents[0].ownerDID})
            </div>
          ) : null}
        </div>
      )}

      {income && (
        <div className="bg-white border border-purple-100 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-purple-700 font-semibold">
            <Coins className="w-4 h-4" />
            Income Band: {income.label} ({income.value})
          </div>
          <div className="text-xs text-gray-500">tx: {income.tx}</div>
          {income.rewardEvents?.length ? (
            <div className="text-xs text-gray-600">
              Reward minted to owner ({income.rewardEvents[0].ownerDID})
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
