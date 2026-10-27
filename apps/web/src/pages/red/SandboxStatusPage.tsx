import React from 'react';
import { Server, Radio, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';

export const SandboxStatusPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans text-[#F0F2F6]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <Server className="w-6 h-6 text-[#EF4444]" />
            Red Sandbox & Network Isolation Status
          </h1>
          <p className="text-[#585E70] text-xs mt-1">
            Diagnostic status of the offensive execution container, isolated bridge interfaces, and resource quotas.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-[#15171F] border border-[#20242E] hover:border-[#EF4444]/50 shadow-card space-y-5 font-mono">
        <div className="flex items-center justify-between border-b border-[#20242E] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2D1217] border border-[#EF4444] flex items-center justify-center text-[#EF4444] shadow-sm">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#585E70]">OFFENSIVE SANDBOX PERIMETER</div>
              <h3 className="text-sm font-bold text-[#F8FAFC] mt-0.5">red_worker.bastionloop_red_net (172.28.0.0/16)</h3>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#0D2820] border border-[#10B981]/40 text-[#10B981] text-xs font-bold">
            STRICT AIRGAP ENFORCED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#12141A] rounded-xl border border-[#20242E] space-y-1.5">
            <span className="text-[#585E70] text-[10px] block font-bold">CONTAINER CAPABILITIES</span>
            <span className="text-[#F8FAFC] font-bold block text-sm">CAP_DROP_ALL</span>
            <div className="text-[11px] text-[#10B981]">No root privileges permitted</div>
          </div>

          <div className="p-4 bg-[#12141A] rounded-xl border border-[#20242E] space-y-1.5">
            <span className="text-[#585E70] text-[10px] block font-bold">DIRECT BLUE_NET ROUTING</span>
            <span className="text-[#EF4444] font-bold block text-sm">PROHIBITED (Drop)</span>
            <div className="text-[11px] text-[#585E70]">Mediated solely via Gateway API</div>
          </div>

          <div className="p-4 bg-[#12141A] rounded-xl border border-[#20242E] space-y-1.5">
            <span className="text-[#585E70] text-[10px] block font-bold">DATABASE ACCESS</span>
            <span className="text-[#EF4444] font-bold block text-sm">ISOLATED (data_net)</span>
            <div className="text-[11px] text-[#585E70]">No direct connection to Postgres</div>
          </div>
        </div>
      </div>
    </div>
  );
};
