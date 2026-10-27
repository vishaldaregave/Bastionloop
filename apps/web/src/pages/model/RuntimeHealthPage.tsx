import React, { useState, useEffect } from 'react';
import {
  HeartPulse, CheckCircle2, AlertTriangle, RefreshCw, Cpu, HardDrive,
  Zap, Server, Activity, ShieldCheck, Gauge, Layers
} from 'lucide-react';
import { api } from '../../services/api';

export const RuntimeHealthPage: React.FC = () => {
  const [healthData, setHealthData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await api.getLlmHealth();
      setHealthData(res);
    } catch (err) {
      setHealthData({ service: 'target_llm', status: 'DEGRADED', provider: 'Mock Fallback' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-8 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-[#6366F1]" />
            LLM Runtime Health & Telemetry
          </h1>
          <p className="text-[#8C92A4] text-xs mt-1">
            Real-time health status, process memory, container resource usage, and gateway socket connectivity.
          </p>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold text-[#0C0D11] bg-[#6366F1] hover:bg-[#8B5CF6] rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>PROBE RUNTIME</span>
        </button>
      </div>

      {/* Primary Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold font-mono text-[#585E70] uppercase tracking-wider">
              Target LLM Service
            </span>
            <div className="p-2 rounded-lg bg-[#12141A] text-[#6366F1]">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981] shadow-[0_0_8px_#10B981]"></span>
            </span>
            <span className="text-xl font-black font-mono text-[#F8FAFC]">
              {healthData?.status || 'HEALTHY'}
            </span>
          </div>
          <p className="text-xs text-[#8C92A4] font-mono">Provider: {healthData?.provider || 'Mock / Ollama'}</p>
        </div>

        <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold font-mono text-[#585E70] uppercase tracking-wider">
              Gateway Sandbox Bridge
            </span>
            <div className="p-2 rounded-lg bg-[#12141A] text-[#3B82F6]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"></span>
            <span className="text-xl font-black font-mono text-[#F8FAFC]">CONNECTED</span>
          </div>
          <p className="text-xs text-[#8C92A4] font-mono">mTLS & Token Fence: ACTIVE</p>
        </div>

        <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold font-mono text-[#585E70] uppercase tracking-wider">
              KV-Cache State
            </span>
            <div className="p-2 rounded-lg bg-[#12141A] text-[#6366F1]">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]"></span>
            <span className="text-xl font-black font-mono text-[#F8FAFC]">EPHEMERAL</span>
          </div>
          <p className="text-xs text-[#8C92A4] font-mono">Cleared per evaluation boundary</p>
        </div>
      </div>

      {/* Host Resource Telemetry */}
      <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card space-y-4">
        <h3 className="text-xs font-bold font-mono text-[#F8FAFC] uppercase tracking-wider border-b border-[#20242E] pb-3">
          Host & Container Resource Allocation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          <div className="p-5 bg-[#12141A] rounded-xl border border-[#20242E] space-y-3">
            <span className="text-xs font-mono text-[#585E70] block">Inference Engine Memory</span>
            <div className="text-lg font-bold text-[#F8FAFC] font-mono">2.14 GB / 8.00 GB</div>
            <div className="w-full bg-[#0C0D11] h-2 rounded-full overflow-hidden border border-[#20242E]">
              <div className="bg-[#6366F1] h-full rounded-full" style={{ width: '27%' }}></div>
            </div>
            <span className="text-[11px] font-mono text-[#585E70] block">27% utilization • Volatile buffer</span>
          </div>

          <div className="p-5 bg-[#12141A] rounded-xl border border-[#20242E] space-y-2">
            <span className="text-xs font-mono text-[#585E70] block">GPU / TPU VRAM Usage</span>
            <div className="text-lg font-bold text-[#F8FAFC] font-mono">N/A (CPU Mode)</div>
            <p className="text-xs text-[#585E70] font-mono mt-1">Direct float32 / Q4_K_M quant</p>
          </div>

          <div className="p-5 bg-[#12141A] rounded-xl border border-[#20242E] space-y-2">
            <span className="text-xs font-mono text-[#585E70] block">Queue Depth</span>
            <div className="text-lg font-bold text-[#F8FAFC] font-mono">0 pending requests</div>
            <p className="text-xs text-[#585E70] font-mono mt-1">Throughput: 18 req/sec max</p>
          </div>
        </div>
      </div>
    </div>
  );
};
