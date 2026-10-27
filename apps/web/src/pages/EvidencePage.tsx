import React, { useState, useEffect } from 'react';
import { FileCheck2, RefreshCw, ShieldCheck, ShieldAlert, Link2 } from 'lucide-react';
import { EvidenceEvent, EvidenceVerification } from '../types';
import { api } from '../services/api';
import { EvidenceChainGraph } from '../components/EvidenceChainGraph';

interface EvidencePageProps {
  evaluationId: string;
  onChainStatusChange?: (isValid: boolean) => void;
}

export const EvidencePage: React.FC<EvidencePageProps> = ({
  evaluationId,
  onChainStatusChange,
}) => {
  const [events, setEvents] = useState<EvidenceEvent[]>([]);
  const [verification, setVerification] = useState<EvidenceVerification | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (evaluationId) {
      loadData();
    }
  }, [evaluationId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [evts, ver] = await Promise.all([
        api.getEvidenceChain(evaluationId),
        api.verifyEvidence(evaluationId),
      ]);
      setEvents(evts);
      setVerification(ver);
      if (onChainStatusChange) onChainStatusChange(ver.is_valid);
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setIsLoading(true);
    try {
      const ver = await api.verifyEvidence(evaluationId);
      setVerification(ver);
      if (onChainStatusChange) onChainStatusChange(ver.is_valid);
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateTamper = async () => {
    try {
      await api.simulateTamper(evaluationId);
      // Immediately re-verify to show detection
      const ver = await api.verifyEvidence(evaluationId);
      setVerification(ver);
      if (onChainStatusChange) onChainStatusChange(ver.is_valid);
    } catch (err: any) {
      alert(`Tamper simulation failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold font-mono text-slate-900">IMMUTABLE EVIDENCE CENTER</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 font-bold">
            SHA-256 HASH CHAIN
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Tamper-evident event provenance. Every attack, defense, and test check is chained to the preceding cryptographic block.
        </p>
      </div>

      {/* Visual Hash Chain Explorer Component */}
      <EvidenceChainGraph
        events={events}
        verification={verification || undefined}
        onVerify={handleVerify}
        onSimulateTamper={handleSimulateTamper}
        isLoading={isLoading}
      />
    </div>
  );
};
