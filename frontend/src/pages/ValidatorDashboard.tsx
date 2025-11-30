import { ValidatorUpload } from "../components/ValidatorUpload";
import { IntegrityCheck } from "../components/IntegrityCheck";

export function ValidatorDashboard() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-gray-900">Validator Console</h1>
        <p className="text-gray-500 mt-2">
          Ingest client documents, compute summaries, and update on-chain profiles.
        </p>
      </div>

      <ValidatorUpload />

      <IntegrityCheck />
    </div>
  );
}
