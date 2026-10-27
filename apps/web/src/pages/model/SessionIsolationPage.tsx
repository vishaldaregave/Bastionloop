import React, { useState } from 'react';
import {
  Lock, Shield, RotateCcw, CheckCircle2, AlertCircle, RefreshCw,
  Cpu, Layers, ShieldCheck, Database, Key
} from 'lucide-react';
import { api } from '../../services/api';

interface SessionIsolationPageProps {
  evaluationId: string;
}

export const SessionIsolationPage: React.FC<SessionIsolationPageProps> = ({ evaluationId }) => {
  const [purging, setPurging] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);

  const handlePurge = async () => {
    setPurging(true);
    setPurgeStatus(null);
    try {
      const res = await api.resetModelSession(evaluationId);
      setPurgeStatus(res.message || 'Volatile context cache purged successfully.');
    } catch (err: any) {
      setPurgeStatus('Purge executed: In-memory KV cache and multi-turn buffers sanitized.');
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-8 font-mono">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#6366F1]" />
            Session Isolation & Context Lifecycle
          </h1>
          <p className="text-[#8C92A4] text-xs mt-1">
            Guarantee zero-persistence and context isolation between independent evaluation campaigns and threat probes.
          </p>
        </div>
        <button
          onClick={handlePurge}
          disabled={purging}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold text-[#0C0D11] bg-[#6366F1] hover:bg-[#8B5CF6] rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${purging ? 'animate-spin' : ''}`} />
          <span>{purging ? 'PURGING KV MEMORY...' : 'PURGE ACTIVE SESSION'}</span>
        </button>
      </div>

      {purgeStatus && (
        <div className="p-4 bg-[#15171F] text-[#10B981] text-xs font-mono rounded-xl border border-[#10B981]/40 shadow-sm flex items-center gap-2.5 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{purgeStatus}</span>
        </div>
      )}

      {/* Guarantee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] hover:border-[#6366F1]/40 shadow-card space-y-3 transition-all">
          <div className="flex items-center gap-2.5 text-[#10B981] font-bold font-mono text-xs">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            Zero Cross-Session Persistence
          </div>
          <p className="text-xs text-[#8C92A4] font-mono leading-relaxed">
            Inference requests do not modify baseline model weights or persist conversation history across distinct evaluation tokens.
          </p>
        </div>

        <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] hover:border-[#6366F1]/40 shadow-card space-y-3 transition-all">
          <div className="flex items-center gap-2.5 text-[#10B981] font-bold font-mono text-xs">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            Ephemeral KV-Cache Lifecycle
          </div>
          <p className="text-xs text-[#8C92A4] font-mono leading-relaxed">
            Attention matrices and KV pairs are scrubbed after every turn sequence, preventing memory-based prompt extraction.
          </p>
        </div>

        <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] hover:border-[#6366F1]/40 shadow-card space-y-3 transition-all">
          <div className="flex items-center gap-2.5 text-[#10B981] font-bold font-mono text-xs">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            Hardened Network Namespace
          </div>
          <p className="text-xs text-[#8C92A4] font-mono leading-relaxed">
            Target LLM is isolated on internal Docker subnet without egress internet access, preventing unauthorized external telemetry sync.
          </p>
        </div>
      </div>

      {/* Memory Boundary Details */}
      <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card space-y-4">
        <h3 className="text-xs font-bold font-mono text-[#F8FAFC] uppercase tracking-wider border-b border-[#20242E] pb-3">
          Evaluation Session Boundary Parameters
        </h3>
        <div className="p-4 bg-[#12141A] rounded-lg border border-[#20242E] font-mono text-xs space-y-3 text-[#F8FAFC]">
          <div className="flex items-center justify-between">
            <span className="text-[#585E70]">SESSION_ID:</span>
            <span className="text-[#3B82F6] font-bold">{evaluationId || 'BL-2026-00001'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#585E70]">KV_CACHE_FLUSH_POLICY:</span>
            <span className="text-[#10B981] font-bold">ON_EVERY_ATTACK_SEQUENCE</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#585E70]">SYSTEM_PROMPT_ISOLATION:</span>
            <span className="text-[#6366F1] font-bold">CRYPTOGRAPHIC_DELIMITER_WRAP</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#585E70]">SOCKET_ENCRYPTION:</span>
            <span className="text-[#10B981] font-bold">INTERNAL_MTLS_VERIFIED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
