import React, { useState } from 'react';
import { Clock, Radio, Play, ShieldAlert, CheckCircle2, Lock, Filter, Search } from 'lucide-react';

interface ExecutionTimelinePageProps {
  evaluationId: string;
}

export const ExecutionTimelinePage: React.FC<ExecutionTimelinePageProps> = ({ evaluationId }) => {
  const [filter, setFilter] = useState('ALL');

  const events = [
    { seq: 'EVT-0028', time: '10:24:31.102', event: 'PROBE_SUBMITTED', type: 'Prompt Injection', target: 'llama3.2', outcome: 'BLOCKED', policy: 'Instruction_Fence_v2.6', latency: '10ms' },
    { seq: 'EVT-0027', time: '10:23:08.450', event: 'PROBE_SUBMITTED', type: 'Role Confusion', target: 'llama3.2', outcome: 'FILTERED', policy: 'Role_Delimiter_Guard', latency: '14ms' },
    { seq: 'EVT-0026', time: '10:22:45.002', event: 'EVIDENCE_SEALED', type: 'Merkle Leaf Ingest', target: 'ledger', outcome: 'VALID', policy: 'SHA-256 Engine', latency: '3ms' },
    { seq: 'EVT-0025', time: '10:21:02.890', event: 'PROBE_SUBMITTED', type: 'Data Exfiltration', target: 'llama3.2', outcome: 'BLOCKED', policy: 'Data_Redaction_v2.5', latency: '12ms' },
    { seq: 'EVT-0024', time: '10:19:15.304', event: 'PROBE_SUBMITTED', type: 'Polyglot Jailbreak', target: 'llama3.2', outcome: 'BYPASSED', policy: 'None (Model Refusal)', latency: '185ms' },
    { seq: 'EVT-0023', time: '10:17:40.112', event: 'PROBE_SUBMITTED', type: 'Canary Trap Probe', target: 'llama3.2', outcome: 'BLOCKED', policy: 'Canary_Trap_Rule', latency: '9ms' }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans text-[#F0F2F6]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-[#EF4444]" />
            Adversarial Execution Timeline
          </h1>
          <p className="text-[#585E70] text-xs mt-1">
            Real-time chronological telemetry trace of attack probe submissions, gateway filtering, and sandbox results.
          </p>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#15171F] rounded-xl border border-[#20242E] shadow-card overflow-hidden font-mono">
        <div className="p-4 bg-[#12141A] border-b border-[#20242E] font-bold text-[#F8FAFC] text-xs flex items-center justify-between">
          <span>Chronological Trace Events ({events.length})</span>
          <span className="text-[11px] text-[#10B981] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            Live WebSocket Synchronized
          </span>
        </div>

        <div className="divide-y divide-[#20242E] text-xs">
          {events.map((ev, i) => (
            <div key={i} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#191C25]/50 transition-colors">
              <div className="flex items-center gap-4">
                <span className="font-bold text-[#3B82F6] text-xs">{ev.seq}</span>
                <div>
                  <div className="text-[#F8FAFC] font-bold flex items-center gap-2 text-xs">
                    {ev.type}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ev.outcome === 'BLOCKED' ? 'bg-[#2D1217] text-[#EF4444] border border-[#EF4444]/30' :
                      ev.outcome === 'FILTERED' ? 'bg-[#2B1D08] text-[#F59E0B] border border-[#F59E0B]/30' :
                      ev.outcome === 'BYPASSED' ? 'bg-[#2D1217] text-[#F87171] border border-[#F87171]/40 font-bold' :
                      'bg-[#0D2820] text-[#10B981] border border-[#10B981]/30'
                    }`}>
                      {ev.outcome}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#585E70] mt-1">
                    Target: <span className="text-[#8C92A4]">{ev.target}</span> · Rule: <span className="text-[#8C92A4]">{ev.policy}</span> · Latency: <span className="text-[#3B82F6]">{ev.latency}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-[#585E70] font-mono">
                {ev.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
