import React, { useState } from 'react';
import { BookOpen, ShieldCheck, Play, CheckCircle2, AlertTriangle, Zap, Check } from 'lucide-react';

export const ResponsePlaybooksPage: React.FC = () => {
  const [activePlaybook, setActivePlaybook] = useState('PB-01');
  const [executing, setExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  const playbooks = [
    {
      id: 'PB-01',
      title: 'Automated Prompt Injection Containment',
      trigger: '3 consecutive HIGH severity injection attempts within 60s',
      action: 'Elevate gateway instruction fence to Strict Regex Mode + Drop session tokens',
      status: 'ARMED'
    },
    {
      id: 'PB-02',
      title: 'Canary Secret Extraction Isolation',
      trigger: 'Canary pattern match in LLM egress response trace',
      action: 'Immediately isolate Target LLM instance + Rotate evaluation cryptographic session',
      status: 'ARMED'
    },
    {
      id: 'PB-03',
      title: 'Denial of Service & Rate Flood Mitigation',
      trigger: 'Ingress query rate > 120 req/min for > 30s',
      action: 'Engage sub-network throttling + Issue transient 429 backpressure',
      status: 'ARMED'
    }
  ];

  const handleExecute = (id: string) => {
    setExecuting(true);
    setExecutionMessage(null);
    setTimeout(() => {
      setExecuting(false);
      setExecutionMessage(`Playbook ${id} test sequence executed. Sandbox perimeter validated.`);
      setTimeout(() => setExecutionMessage(null), 3000);
    }, 700);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-8 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#10B981]" />
            Automated Defensive Response Playbooks
          </h1>
          <p className="text-[#8C92A4] text-xs mt-1">
            Pre-configured incident response workflows for zero-latency threat neutralization and sandbox quarantine.
          </p>
        </div>
      </div>

      {executionMessage && (
        <div className="p-4 bg-[#152033] text-[#10B981] text-xs rounded-xl border border-[#10B981]/40 font-semibold shadow-sm">
          {executionMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {playbooks.map((pb) => (
          <div
            key={pb.id}
            className="p-6 rounded-xl bg-[#15171F] border border-[#20242E] shadow-card flex flex-col justify-between space-y-5 hover:border-[#10B981] transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#10B981] font-mono">{pb.id}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  {pb.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">{pb.title}</h3>
              <div className="space-y-1 text-xs">
                <div className="text-[10px] text-[#585E70] uppercase font-bold tracking-wider">Trigger:</div>
                <div className="text-[#8C92A4] text-xs leading-relaxed">{pb.trigger}</div>
              </div>
              <div className="space-y-1 text-xs pt-1">
                <div className="text-[10px] text-[#585E70] uppercase font-bold tracking-wider">Defensive Action:</div>
                <div className="text-[#F8FAFC] text-xs leading-relaxed">{pb.action}</div>
              </div>
            </div>

            <button
              onClick={() => handleExecute(pb.id)}
              disabled={executing}
              className="w-full py-2.5 rounded-lg bg-[#12141A] hover:bg-[#10B981] hover:text-[#0C0D11] border border-[#10B981] text-[#10B981] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              Test Playbook Trigger
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
