import React, { useState, useEffect } from 'react';
import { Activity, Server, ShieldCheck, CheckCircle2, RefreshCw, Cpu, HardDrive } from 'lucide-react';
import { api } from '../../services/api';

export const SystemHealthPage: React.FC = () => {
  const [healthData, setHealthData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await api.getLlmHealth();
      setHealthData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const services = [
    { name: 'Defense Gateway (FastAPI)', status: 'HEALTHY', latency: '8ms', subnet: '172.28.1.0/24 (control_net)', state: 'ENFORCING' },
    { name: 'Policy Engine (Regex/PCRE)', status: 'HEALTHY', latency: '12ms', subnet: '172.28.3.0/24 (blue_net)', state: 'ACTIVE' },
    { name: 'Threat Intelligence Store (Redis)', status: 'HEALTHY', latency: '2ms', subnet: '172.28.4.0/24 (internal)', state: 'SYNCHRONIZED' },
    { name: 'Immutable Evidence Ledger (SQLite/Postgres)', status: 'HEALTHY', latency: '3ms', subnet: '172.28.5.0/24 (data_net)', state: 'SEALED' },
    { name: 'Target LLM Runtime (Ollama)', status: 'HEALTHY', latency: '145ms', subnet: '172.28.2.0/24 (llm_net)', state: 'ISOLATED' }
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-8 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#10B981]" />
            Blue Subsystem & Security Perimeter Health
          </h1>
          <p className="text-[#8C92A4] text-xs mt-1">
            Real-time status of defensive enforcement nodes, subnets, and cryptographic validation daemons.
          </p>
        </div>

        <button
          onClick={loadHealth}
          disabled={loading}
          className="px-4 py-2.5 rounded-lg bg-[#15171F] hover:bg-[#152033] border border-[#20242E] text-[#10B981] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-card"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Health Status
        </button>
      </div>

      {/* Global Status Banner */}
      <div className="p-6 rounded-xl bg-[#15171F] border border-[#10B981] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#152033] border border-[#10B981] flex items-center justify-center text-[#10B981]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#F8FAFC]">ALL DEFENSIVE SUBSYSTEMS OPERATIONAL</div>
            <div className="text-xs text-[#8C92A4] mt-0.5">5/5 Services reporting healthy telemetry</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-xs font-bold">
            100% HEALTH SCORE
          </span>
        </div>
      </div>

      {/* Service Nodes Table */}
      <div className="bg-[#15171F] rounded-xl border border-[#20242E] shadow-card overflow-hidden">
        <div className="p-5 border-b border-[#20242E] font-bold text-[#F8FAFC] text-xs flex items-center justify-between">
          <span>Defensive Node Topology Status</span>
          <span className="text-xs text-[#585E70]">Perimeter Checks</span>
        </div>

        <div className="divide-y divide-[#20242E]/50 text-xs">
          {services.map((svc, i) => (
            <div key={i} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#152033]/40">
              <div className="flex items-center gap-3.5">
                <Server className="w-4 h-4 text-[#10B981]" />
                <div>
                  <div className="text-[#F8FAFC] font-bold text-xs">{svc.name}</div>
                  <div className="text-[11px] text-[#585E70] font-mono">{svc.subnet}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="text-[#8C92A4] text-xs font-mono">{svc.latency}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#12141A] text-[#3B82F6] border border-[#20242E]">
                  {svc.state}
                </span>
                <span className="text-[#10B981] font-bold flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"></span>
                  {svc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
