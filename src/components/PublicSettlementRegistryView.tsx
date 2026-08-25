import React from 'react';
import { Shield } from 'lucide-react';

interface PublicSettlementRegistryViewProps {
  onBack: () => void;
}

/**
 * Public settlement certificates are unavailable until independently verified
 * ownership, balance, transaction, settlement, and compliance evidence is supplied.
 */
export const PublicSettlementRegistryView: React.FC<PublicSettlementRegistryViewProps> = ({ onBack }) => {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
      <Shield className="mx-auto mb-3 h-8 w-8 text-amber-600" />
      <h2 className="text-lg font-bold text-slate-900">Public Settlement Certificate Unavailable</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        This application does not generate a public certificate, state hash, ownership proof, balance claim, settlement assertion, or compliance statement from local data. The feature remains unavailable until it can use independently verified provider evidence.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-5 rounded-lg bg-[#0052FF] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Return to Wallet
      </button>
    </div>
  );
};
