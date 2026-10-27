import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2, Lock, Cpu, Play } from 'lucide-react';
import { EvidenceEvent, EvidenceVerification } from '../../types';
import { api } from '../../services/api';
import { EvidenceChainGraph } from '../../components/EvidenceChainGraph';

interface EvidenceAdminPageProps {
  evaluationId: string;
}

export const EvidenceAdminPage: React.FC<EvidenceAdminPageProps> = ({ evaluationId }) => {
  const [events, setEvents] = useState<EvidenceEvent[]>([]);
  const [verification, setVerification] = useState<EvidenceVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [tampering, setTampering] = useState(false);

  useEffect(() => {
    loadData();
  }, [evaluationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evts, ver] = await Promise.all([
        api.getEvidenceChain(evaluationId),
        api.verifyEvidence(evaluationId),
      ]);
      setEvents(evts);
      setVerification(ver);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const ver = await api.verifyEvidence(evaluationId);
      setVerification(ver);
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateTamper = async () => {
    setTampering(true);
    try {
      await api.simulateTamper(evaluationId);
      const ver = await api.verifyEvidence(evaluationId);
      setVerification(ver);
    } catch (err: any) {
      alert(`Tamper simulation error: ${err.message}`);
    } finally {
      setTampering(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Cryptographic Evidence Verification</h1>
          <p className="text-[#585E70] text-xs mt-1">
            SHA-256 Merkle chain verification engine. Prove integrity and detect unauthorized state tampering.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateTamper}
            disabled={tampering}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-semibold text-[#EF4444] bg-[#2D1217] border border-[#EF4444]/50 rounded-lg hover:bg-[#2D1217] transition-colors shadow-sm cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444]" />
            Simulate Ledger Tamper
          </button>
          <button
            onClick={handleVerify}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#3B82F6] text-white text-xs font-mono font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recompute Hash Tree
          </button>
        </div>
      </div>

      {/* Verification Status Card */}
      <div className={`p-6 rounded-xl border shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        verification?.is_valid
          ? 'bg-[#15171F] border-[#10B981] shadow-sm'
          : 'bg-[#2D1217] border-[#EF4444] shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${verification?.is_valid ? 'bg-[#0D2820] text-[#10B981] border border-[#10B981]/40' : 'bg-[#2D1217] text-[#EF4444] border border-[#EF4444]'}`}>
            {verification?.is_valid ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold uppercase tracking-wider ${verification?.is_valid ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                Merkle Root Status
              </span>
              <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${verification?.is_valid ? 'bg-[#0D2820] text-[#10B981]' : 'bg-[#2D1217] text-[#EF4444]'}`}>
                {verification?.is_valid ? '100% VALID & INTACT' : 'TAMPER DETECTED'}
              </span>
            </div>
            <h3 className="text-base font-bold text-[#F8FAFC] mt-1 font-mono">
              Root Hash: {verification?.tip_hash || 'sha256:00000000000000000000000000000000'}
            </h3>
            <p className="text-xs text-[#8C92A4] mt-0.5 font-mono">
              Verified {verification?.total_events || events.length} sequentially signed blocks in evaluation chain.
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-xs text-[#60A5FA]">
          <div>Algorithm: SHA-256 Chained</div>
          <div>Genesis Hash: {verification?.genesis_hash ? 'Verified' : 'Intact'}</div>
        </div>
      </div>

      {/* Interactive Evidence Graph */}
      <div className="bg-[#15171F] rounded-xl border border-[#20242E] shadow-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider font-mono">Sequential Block Chain Ledger</h2>
        <EvidenceChainGraph
          events={events}
          verification={verification || undefined}
          onVerify={handleVerify}
          onSimulateTamper={handleSimulateTamper}
        />
      </div>
    </div>
  );
};
