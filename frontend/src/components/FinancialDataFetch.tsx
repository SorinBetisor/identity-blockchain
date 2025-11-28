import { useState } from "react";
import { api } from "../api";
import { Search, Loader2 } from "lucide-react";

export function FinancialDataFetch() {
  const [requesterAddress, setRequesterAddress] = useState("");
  const [usernameOrAddress, setUsernameOrAddress] = useState("");
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.fetchFinancial({
        requesterAddress,
        usernameOrAddress,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Unable to fetch data (consent missing?)");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass p-6 rounded-xl space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-sky-100 rounded-lg">
          <Search className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Authorized Data Retrieval</h2>
          <p className="text-sm text-gray-500">Serve decrypted file only when on-chain consent is valid.</p>
        </div>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={usernameOrAddress}
          onChange={(e) => setUsernameOrAddress(e.target.value)}
          placeholder="Username or owner address"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
        />
        <input
          type="text"
          value={requesterAddress}
          onChange={(e) => setRequesterAddress(e.target.value)}
          placeholder="Requester address (bank)"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
        />
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? "Loading..." : "Retrieve (checks on-chain consent)"}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {data && (
        <pre className="bg-white border border-gray-200 rounded-lg p-3 text-xs overflow-auto max-h-64">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
