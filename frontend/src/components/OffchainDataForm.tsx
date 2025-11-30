import { useState } from "react";
import { api } from "../api";
import { Loader2, FileText, ShieldCheck } from "lucide-react";

const samplePayload = {
  assets: [
    {
      assetID: "savings-1",
      assetType: "savings",
      value: 25000,
      ownershipPercentage: 100,
    },
  ],
  liabilities: [
    {
      liabilityID: "card-1",
      liabilityType: "credit_card",
      amount: 1200,
      interestRate: 19.9,
      monthlyPayment: 100,
      dueDate: "2024-12-01",
      isOverdue: false,
    },
  ],
};

export function OffchainDataForm() {
  const [userPrivateKey, setUserPrivateKey] = useState("");
  const [userDID, setUserDID] = useState("");
  const [annualIncome, setAnnualIncome] = useState(120000);
  const [totalCreditLimit, setTotalCreditLimit] = useState(15000);
  const [assetsLiabilities, setAssetsLiabilities] = useState(
    JSON.stringify(samplePayload, null, 2)
  );
  const [useValidatorImpersonation, setUseValidatorImpersonation] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setResult(null);
    try {
      const parsed = JSON.parse(assetsLiabilities);
      const body = {
        userPrivateKey,
        financialData: { userDID, ...parsed },
        annualIncome,
        totalCreditLimit,
        validatorPrivateKey: null,
        validatorImpersonate: useValidatorImpersonation,
      };
      const res = await api.saveFinancial(body);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to save financial data");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass p-6 rounded-xl space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <FileText className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Financial Intake & Profile Update</h2>
          <p className="text-sm text-gray-500">Ingest assets/liabilities, hash off-chain, and push summary on-chain.</p>
        </div>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">User Private Key</label>
            <input
              type="text"
            className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            value={userPrivateKey}
            onChange={(e) => setUserPrivateKey(e.target.value)}
            placeholder="0x... (owner private key)"
            required
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">User DID (address)</label>
          <input
            type="text"
            className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            value={userDID}
            onChange={(e) => setUserDID(e.target.value)}
            placeholder="0x... (owner address)"
            required
          />
        </div>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">Annual Income</label>
            <input
              type="number"
              className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
              value={annualIncome}
              onChange={(e) => setAnnualIncome(parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Total Credit Limit</label>
            <input
              type="number"
              className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
              value={totalCreditLimit}
              onChange={(e) => setTotalCreditLimit(parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">Assets & Liabilities JSON</label>
            <button
              type="button"
              className="text-xs text-indigo-600 underline"
              onClick={() => setAssetsLiabilities(JSON.stringify(samplePayload, null, 2))}
            >
              Load sample payload
            </button>
          </div>
          <textarea
            className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm h-48"
            value={assetsLiabilities}
            onChange={(e) => setAssetsLiabilities(e.target.value)}
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={useValidatorImpersonation}
            onChange={(e) => setUseValidatorImpersonation(e.target.checked)}
          />
          Impersonate validator (Hardhat only) to push summary
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isSaving ? "Saving..." : "Save & Update Profile"}
        </button>
      </form>

        {error && <div className="text-sm text-red-600">{error}</div>}

        {result && (
          <div className="bg-white border border-emerald-100 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
              <span>Stored & hashed off-chain; profile updated.</span>
            </div>
            <div className="text-xs text-gray-600 font-mono break-all">
              dataPointer: {result.dataPointer}
            </div>
            <div className="text-sm text-gray-700">
            Credit Tier: {result.summary.credit_tier}, Income Band: {result.summary.income_band}
          </div>
          <div className="text-xs text-gray-500">
            updateDataPointer tx: {result.updateDataPointerReceipt.transactionHash}
          </div>
          {result.updateProfileReceipt ? (
            <div className="text-xs text-gray-500">
              updateProfile tx: {result.updateProfileReceipt.transactionHash}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
