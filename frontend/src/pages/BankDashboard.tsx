import { BankAccess } from "../components/BankAccess";
import { FinancialDataFetch } from "../components/FinancialDataFetch";
import { IntegrityCheck } from "../components/IntegrityCheck";

export function BankDashboard() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-gray-900">Bank Portal</h1>
        <p className="text-gray-500 mt-2">
          Access credit/income via DataBroker with enforced consent, fetch off-chain files, and verify integrity.
        </p>
      </div>

      <BankAccess />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinancialDataFetch />
        <IntegrityCheck />
      </div>
    </div>
  );
}
