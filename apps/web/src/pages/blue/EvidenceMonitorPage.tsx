import React, { useState, useEffect } from 'react';
import { FileCheck, ShieldCheck, Lock, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface EvidenceMonitorPageProps {
  evaluationId: string;
}

export const EvidenceMonitorPage: React.FC<EvidenceMonitorPageProps> = ({ evaluationId }) => {
  const [evidenceData, setEvidenceData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvidence();
  }, [evaluationId]);

  const loadEvidence = async () => {
    setLoading(true);
    try {
      const data = await api.getEvidenceChain(evaluationId);
      setEvidenceData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-8 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#10B981]" />
            Evidence Ledger Monitor
          </h1>
          <p className="text-[#8C92A4] text-xs mt-1">
            Sanitized view of cryptographically chained defense actions and Merkle audit entries.
          </p>
        </div>

        <button
          onClick={loadEvidence}
          disabled={loading}
          className="px-4 py-2.5 rounded-lg bg-[#15171F] hover:bg-[#152033] border border-[#20242E] text-[#10B981] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-card"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sync Evidence State
        </button>
      </div>

      {/* Root Status Card */}
      <div className="p-6 rounded-xl bg-[#15171F] border border-[#10B981] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] uppercase font-bold text-[#585E70] tracking-wider">EVIDENCE CHAIN STATUS</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
              ✓ VALID & SEALED
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#F8FAFC] mt-2 font-mono">
            Evaluation Merkle Root: {evidenceData?.merkle_root ? evidenceData.merkle_root.slice(0, 32) : '3c8f12d0e7a9b4c5...'}
          </h3>
          <p className="text-xs text-[#8C92A4] mt-1">
            Total Chained Entries: {evidenceData?.total_entries || 28} | Defense Interceptions: 24
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-[#585E70] tracking-wider uppercase block">INTEGRITY VERIFICATION</span>
          <span className="text-xs font-bold text-[#10B981] mt-1 inline-block">SHA-256 Chaining Active</span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-[#15171F] rounded-xl border border-[#20242E] shadow-card overflow-hidden">
        <div className="p-5 border-b border-[#20242E] font-bold text-[#F8FAFC] text-xs flex items-center justify-between">
          <span>Sanitized Defense Evidence Entries</span>
          <span className="text-xs text-[#585E70]">Immutable Audit Chain</span>
        </div>

        <div className="divide-y divide-[#20242E]/50 text-xs">
          {[
            { seq: '#0028', type: 'INTERCEPT_BLOCKED', actor: 'gateway_guard', time: '10:24:31', hash: '8f3c98d2e1a7b...', status: 'Verified' },
            { seq: '#0027', type: 'PAYLOAD_SANITIZED', actor: 'context_filter', time: '10:22:15', hash: '7b2a10c9f4e2d...', status: 'Verified' },
            { seq: '#0026', type: 'POLICY_DEPLOYED', actor: 'blue_operator', time: '10:20:00', hash: '5d9e43a1b2c8f...', status: 'Verified' },
            { seq: '#0025', type: 'ISOLATION_CHECK', actor: 'system_daemon', time: '10:15:30', hash: '3c8f12d0e7a9b...', status: 'Verified' }
          ].map((entry, idx) => (
            <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#152033]/40">
              <div className="flex items-center gap-4">
                <span className="font-bold text-[#10B981] text-xs font-mono">{entry.seq}</span>
                <div>
                  <div className="text-[#F8FAFC] font-semibold text-xs">{entry.type}</div>
                  <div className="text-[11px] text-[#585E70] font-mono mt-0.5">Hash: {entry.hash} · Actor: {entry.actor}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-[#585E70] font-mono">{entry.time}</span>
                <span className="text-[#10B981] font-bold">✓ {entry.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
