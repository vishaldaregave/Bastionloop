import React, { useState } from 'react';
import {
  Layers, CheckCircle2, AlertCircle, RefreshCw, Cpu, Server, Shield,
  ExternalLink, Sparkles, Database, Activity, HardDrive
} from 'lucide-react';

export const ProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState([
    {
      id: 'ollama-local',
      name: 'Ollama Local Runtime',
      endpoint: 'http://localhost:11434',
      type: 'Local Sandboxed Container',
      status: 'AVAILABLE',
      activeModel: 'llama3.2:latest',
      models: [
        { name: 'llama3.2:latest', size: '2.0 GB', parameters: '3B', contextWindow: '128k', format: 'GGUF' },
        { name: 'phi3:mini', size: '2.2 GB', parameters: '3.8B', contextWindow: '4k', format: 'GGUF' },
        { name: 'mistral:7b-instruct', size: '4.1 GB', parameters: '7B', contextWindow: '32k', format: 'GGUF' }
      ]
    },
    {
      id: 'mock-llm',
      name: 'BastionLoop Synthetic Mock Provider',
      endpoint: 'internal://in-memory-engine',
      type: 'Deterministic Sandbox Simulator',
      status: 'AVAILABLE',
      activeModel: 'mock-safety-llm',
      models: [
        { name: 'mock-safety-llm', size: '0 MB', parameters: 'Synthetic', contextWindow: '8k', format: 'Native Python' }
      ]
    }
  ]);

  const [checking, setChecking] = useState(false);

  const handleHealthCheckAll = async () => {
    setChecking(true);
    await new Promise(r => setTimeout(r, 600));
    setChecking(false);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-8 font-mono">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#6366F1]" />
            Providers & Model Catalog
          </h1>
          <p className="text-[#8C92A4] text-xs mt-1">
            Manage target LLM providers, discover available models, and inspect runtime connectivity.
          </p>
        </div>
        <button
          onClick={handleHealthCheckAll}
          disabled={checking}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold text-[#0C0D11] bg-[#6366F1] hover:bg-[#8B5CF6] rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          <span>HEALTH CHECK PROVIDERS</span>
        </button>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((p) => (
          <div
            key={p.id}
            className="bg-[#15171F] rounded-xl border border-[#20242E] hover:border-[#6366F1]/50 shadow-card p-6 space-y-5 transition-all"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-[#12141A] text-[#6366F1] rounded-lg border border-[#20242E] shadow-card">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#F8FAFC] text-base font-mono">{p.name}</h3>
                  <span className="text-xs text-[#585E70] font-mono">{p.endpoint}</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold font-mono bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]"></span>
                {p.status}
              </span>
            </div>

            {/* Provider Metadata */}
            <div className="space-y-2.5 pt-3 border-t border-[#20242E] text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#585E70]">Provider Type:</span>
                <span className="font-semibold text-[#8C92A4]">{p.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#585E70]">Default Active Model:</span>
                <span className="font-bold text-[#3B82F6] bg-[#12141A] px-2.5 py-0.5 rounded border border-[#20242E]">
                  {p.activeModel}
                </span>
              </div>
            </div>

            {/* Discovered Models List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-[#585E70] uppercase tracking-wider">
                <span>Discovered Models ({p.models.length})</span>
                <span className="text-[10px] text-[#585E70]">Volatile Registry</span>
              </div>
              <div className="space-y-2.5">
                {p.models.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#12141A] hover:bg-[#152033] rounded-lg border border-[#20242E] hover:border-[#6366F1]/40 flex items-center justify-between text-xs transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-[#6366F1]" />
                        <span className="font-bold text-[#F8FAFC] font-mono">{m.name}</span>
                      </div>
                      <span className="text-[#585E70] block text-xs font-mono mt-0.5">
                        {m.parameters} params • {m.contextWindow} context • {m.format}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-[#15171F] text-[#3B82F6] font-mono text-xs font-bold rounded-lg border border-[#20242E]">
                      {m.size}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
