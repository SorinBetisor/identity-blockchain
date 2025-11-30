import { useState } from "react";
import { api } from "../api";
import { Loader2, UploadCloud, FileText } from "lucide-react";

export function ValidatorUpload() {
  const [userPrivateKey, setUserPrivateKey] = useState("");
  const [validatorPrivateKey, setValidatorPrivateKey] = useState("");
  const [userDID, setUserDID] = useState("");
  const [jsonPayload, setJsonPayload] = useState("");
  const [annualIncome, setAnnualIncome] = useState<number | undefined>(undefined);
  const [totalCreditLimit, setTotalCreditLimit] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setJsonPayload(reader.result as string);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setResult(null);
    setError(null);
    try {
      const parsed = JSON.parse(jsonPayload);
      const body = {
        userPrivateKey,
        financialData: { userDID, ...parsed },
        annualIncome,
        totalCreditLimit,
        validatorPrivateKey: validatorPrivateKey || null,
        validatorImpersonate: !validatorPrivateKey,
      };
      const res = await api.saveFinancial(body);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass p-6 rounded-xl space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <UploadCloud className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Validator Intake</h2>
          <p className="text-sm text-gray-500">Upload client financial data, hash off-chain, and push summary on-chain.</p>
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
              placeholder="0x... (owner key)"
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
            <label className="text-sm text-gray-600">Validator Private Key (optional)</label>
            <input
              type="text"
              className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
              value={validatorPrivateKey}
              onChange={(e) => setValidatorPrivateKey(e.target.value)}
              placeholder="0x... (leave blank to impersonate)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Annual Income (optional)</label>
              <input
                type="number"
                className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                value={annualIncome ?? ""}
                onChange={(e) => setAnnualIncome(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Total Credit Limit (optional)</label>
              <input
                type="number"
                className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                value={totalCreditLimit ?? ""}
                onChange={(e) => setTotalCreditLimit(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>

        <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg border border-gray-200">
              <FileText className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Upload JSON file</p>
              <p className="text-xs text-gray-500">Drag and drop or browse. Must include assets/liabilities.</p>
            </div>
            <input
              type="file"
              accept=".json,application/json"
              className="ml-auto text-sm text-gray-600"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </div>
          <textarea
            className="mt-3 w-full bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm h-40"
            placeholder='{"assets":[...],"liabilities":[...]}'
            value={jsonPayload}
            onChange={(e) => setJsonPayload(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isSaving ? "Uploading..." : "Upload & Update Profile"}
        </button>
      </form>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {result && (
        <div className="bg-white border border-indigo-100 rounded-lg p-3 text-sm text-gray-700 space-y-1">
          <div className="font-semibold text-indigo-700">Stored & summarized</div>
          <div className="text-xs font-mono break-all">dataPointer: {result.dataPointer}</div>
          <div>Credit Tier: {result.summary?.credit_tier}</div>
          <div>Income Band: {result.summary?.income_band}</div>
        </div>
      )}
    </div>
  );
}
