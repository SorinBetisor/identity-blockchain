import { useState } from "react";
import { api } from "../api";
import { Shield, Loader2 } from "lucide-react";

export function IntegrityCheck() {
  const [userAddress, setUserAddress] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.integrityCheck(userAddress);
      setResult(res.valid);
    } catch (err: any) {
      setError(err.message || "Integrity check failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass p-6 rounded-xl space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Integrity Audit</h2>
          <p className="text-sm text-gray-500">Compare stored file hash to on-chain dataPointer.</p>
        </div>
      </div>
      <div className="space-y-3">
        <input
          type="text"
          value={userAddress}
          onChange={(e) => setUserAddress(e.target.value)}
          placeholder="User address (0x...)"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
        />
        <button
          onClick={handleCheck}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? "Checking..." : "Verify Hash vs On-chain Pointer"}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {result !== null && (
        <div
          className={`text-sm font-semibold ${
            result ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {result ? "Integrity verified" : "Mismatch or file not found"}
        </div>
      )}
    </div>
  );
}
