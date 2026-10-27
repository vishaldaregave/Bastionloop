import React, { useState, useEffect } from 'react';
import { Gauge, Cpu, BarChart3, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Radio, HardDrive, Zap } from 'lucide-react';
import { ResourceFairness } from '../../types';
import { api } from '../../services/api';

interface ResourceGovernorAdminPageProps {
  evaluationId: string;
}

export const ResourceGovernorAdminPage: React.FC<ResourceGovernorAdminPageProps> = ({ evaluationId }) => {
  const [fairness, setFairness] = useState<ResourceFairness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (evaluationId) {
      loadFairness();
    }
  }, [evaluationId]);

  const loadFairness = async () => {
    setLoading(true);
    try {
      const data = await api.getResourceFairness(evaluationId);
      setFairness(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Resource Governor & Fair Queuing</h1>
          <p className="text-[#585E70] text-xs mt-1">
            Token quotas, fair-share scheduling, denial-of-service throttling, and rate limit enforcement.
          </p>
        </div>
        <button
          onClick={loadFairness}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#F0F2F6] bg-[#15171F] hover:bg-[#191C25] border border-[#20242E] hover:border-[#2D3342] rounded-lg shadow-subtle transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#3B82F6] ${loading ? 'animate-spin' : ''}`} />
          Refresh Governor State
        </button>
      </div>

      {/* Fairness Hero Card */}
      <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="space-y-1">
          <span className="text-xs font-bold text-[#585E70] uppercase tracking-wider font-mono">
            Fairness Allocation Index
          </span>
          <div className="text-4xl font-black text-[#F8FAFC] font-mono">
            {fairness?.fairness_score ?? 98.0}
            <span className="text-sm font-normal text-[#585E70]"> / 100</span>
          </div>
          <div className="text-xs font-semibold text-[#10B981] flex items-center gap-1.5 font-mono pt-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
            Fair-share status: {fairness?.status ?? 'BALANCED'}
          </div>
        </div>

        {/* Quota Shares */}
        <div className="md:col-span-2 space-y-3">
          <span className="text-xs font-bold text-[#8C92A4] uppercase tracking-wider font-mono">Quota Allocation Shares</span>
          <div className="space-y-2.5 text-xs font-mono">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#EF4444] font-bold">Red Team Offensive Probes</span>
                <span className="text-[#F0F2F6]">{fairness?.red_resource_share_pct ?? 42}% (Max: 50%)</span>
              </div>
              <div className="w-full bg-[#12141A] h-2 rounded-full overflow-hidden border border-[#20242E]">
                <div className="bg-[#EF4444] h-full rounded-full shadow-sm" style={{ width: `${fairness?.red_resource_share_pct ?? 42}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#10B981] font-bold">Blue Team Policy Verifications</span>
                <span className="text-[#F0F2F6]">{fairness?.blue_resource_share_pct ?? 38}% (Max: 50%)</span>
              </div>
              <div className="w-full bg-[#12141A] h-2 rounded-full overflow-hidden border border-[#20242E]">
                <div className="bg-[#10B981] h-full rounded-full shadow-sm" style={{ width: `${fairness?.blue_resource_share_pct ?? 38}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Governance Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card space-y-2">
          <div className="text-xs font-bold text-[#585E70] uppercase tracking-wider font-mono">Global Rate Limit</div>
          <div className="text-xl font-bold text-[#F8FAFC] font-mono">60 req / min</div>
          <p className="text-xs text-[#8C92A4]">Sliding window bucket enforcement per actor identity.</p>
        </div>

        <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card space-y-2">
          <div className="text-xs font-bold text-[#585E70] uppercase tracking-wider font-mono">Concurrent Queue Depth</div>
          <div className="text-xl font-bold text-[#F8FAFC] font-mono">16 Max Concurrent</div>
          <p className="text-xs text-[#8C92A4]">Protects target LLM inference worker from memory exhaustion.</p>
        </div>

        <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card space-y-2">
          <div className="text-xs font-bold text-[#585E70] uppercase tracking-wider font-mono">Hard Quota Threshold</div>
          <div className="text-xl font-bold text-[#F8FAFC] font-mono">500 Probes / Eval</div>
          <p className="text-xs text-[#8C92A4]">Evaluation automatically suspends upon hitting probe ceiling.</p>
        </div>
      </div>
    </div>
  );
};
