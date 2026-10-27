import React from 'react';
import { Swords, ShieldAlert, Cpu, Lock, ArrowRight, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface LiveFlowVisualizerProps {
  lastAttack?: any;
  activeDefensesCount: number;
  modelProvider: string;
  isExecuting?: boolean;
}

export const LiveFlowVisualizer: React.FC<LiveFlowVisualizerProps> = ({
  lastAttack,
  activeDefensesCount,
  modelProvider,
  isExecuting = false,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
            <span>LIVE ZERO-TRUST TEST FLOW</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              NETWORK BOUNDARY ENFORCED
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict isolation: Sandboxes cannot communicate directly. All traffic is brokered by the Gateway.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span className="font-semibold">REAL-TIME TELEMETRY</span>
        </div>
      </div>

      {/* The 4-Node Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative py-2">
        {/* Node 1: Red Team Sandbox */}
        <div className="p-4 rounded-xl bg-slate-50 border border-red-200 relative group shadow-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600 font-mono text-xs font-bold">
              <Swords className="w-4 h-4" />
              <span>RED SANDBOX</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
              red_net
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2">
            Adversarial test executor. Payloads vaulted with confidential access controls.
          </p>
          <div className="mt-3 pt-2 border-t border-red-100 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-500">Cross-Sandbox Route:</span>
            <span className="text-red-600 font-bold">DENIED ✕</span>
          </div>
        </div>

        {/* Node 2: Policy Decision Point / Gateway */}
        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 relative group shadow-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700 font-mono text-xs font-bold">
              <Lock className="w-4 h-4" />
              <span>POLICY GATEWAY</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
              control_net
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2">
            Zero-Trust PEP/PDP. Active defense evaluation & SHA-256 evidence logging.
          </p>
          <div className="mt-3 pt-2 border-t border-blue-100 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-500">Active Defenses:</span>
            <span className="text-blue-700 font-bold">{activeDefensesCount} Rules</span>
          </div>
        </div>

        {/* Node 3: Target LLM Runtime */}
        <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-200 relative group shadow-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-700 font-mono text-xs font-bold">
              <Cpu className="w-4 h-4" />
              <span>TARGET LLM</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
              llm_net
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2">
            Isolated model runtime with canary tracking & session destruction controls.
          </p>
          <div className="mt-3 pt-2 border-t border-purple-100 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-500">Runtime:</span>
            <span className="text-purple-700 font-bold uppercase">{modelProvider}</span>
          </div>
        </div>

        {/* Node 4: Blue Team Defense */}
        <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 relative group shadow-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-700 font-mono text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>BLUE SANDBOX</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
              blue_net
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2">
            Sanitized telemetry consumer with dynamic rule authoring and regression testing.
          </p>
          <div className="mt-3 pt-2 border-t border-emerald-100 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-500">Payload Visibility:</span>
            <span className="text-emerald-700 font-bold">SANITIZED ✓</span>
          </div>
        </div>
      </div>
    </div>
  );
};
