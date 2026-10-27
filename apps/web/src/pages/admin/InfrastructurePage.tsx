import React from 'react';
import { Server, Shield, Network, Lock, CheckCircle2, Cpu, HardDrive, Zap, AlertTriangle, AlertOctagon, ArrowRight } from 'lucide-react';

export const InfrastructurePage: React.FC = () => {
  const containers = [
    {
      name: 'bastionloop-gateway',
      service: 'FastAPI Enforcement Gateway',
      subnet: '172.28.1.0/24 (control_net)',
      capabilities: 'CAP_DROP_ALL + no-new-privileges',
      status: 'HEALTHY',
      port: '8080 (Exposed Host Bridge)',
      color: '#3B82F6'
    },
    {
      name: 'bastionloop-red-worker',
      service: 'Red Team Offensive Worker',
      subnet: '172.28.0.0/16 (red_net only)',
      capabilities: 'CAP_DROP_ALL + seccomp default',
      status: 'HEALTHY',
      port: 'Internal Socket Only',
      color: '#EF4444'
    },
    {
      name: 'bastionloop-blue-guard',
      service: 'Blue Team Policy Engine',
      subnet: '172.28.3.0/24 (blue_net only)',
      capabilities: 'CAP_DROP_ALL + seccomp default',
      status: 'HEALTHY',
      port: 'Internal Socket Only',
      color: '#10B981'
    },
    {
      name: 'bastionloop-target-llm',
      service: 'Target LLM Inference Host',
      subnet: '172.28.2.0/24 (llm_net - No WAN)',
      capabilities: 'CAP_DROP_ALL + internal mTLS',
      status: 'HEALTHY',
      port: '8000 (Internal Target)',
      color: '#6366F1'
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Sandbox Infrastructure & Network Topology</h1>
          <p className="text-[#585E70] text-xs mt-1">
            Container isolation boundaries, segmented Linux network bridges, and non-root process security controls.
          </p>
        </div>
      </div>

      {/* Network Isolation Diagram Card */}
      <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card space-y-4">
        <h2 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
          <Network className="w-4 h-4 text-[#3B82F6]" />
          Zero-Trust Docker Bridge Topology
        </h2>

        {/* Visual Architecture Flow */}
        <div className="bg-[#0C0D11] border border-[#20242E] rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Red Box */}
            <div className="bg-[#2D1217] border border-[#EF4444] shadow-sm rounded-xl p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-[#2D1217] text-[#EF4444] mx-auto mb-2 flex items-center justify-center">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-[#EF4444]">Red Sandbox</div>
              <div className="text-[11px] text-[#8C92A4] font-mono">(red_net)</div>
              <div className="text-[10px] text-[#585E70] font-mono mt-1">172.28.0.0/16</div>
            </div>

            {/* Gateway */}
            <div className="bg-[#191C25] border border-[#2D3342] shadow-sm rounded-xl p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-[#1E222D] text-[#3B82F6] mx-auto mb-2 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-[#3B82F6]">Gateway Mediator</div>
              <div className="text-[11px] text-[#8C92A4] font-mono">(control_net)</div>
              <div className="text-[10px] text-[#585E70] font-mono mt-1">172.28.1.0/24</div>
            </div>

            {/* Target LLM */}
            <div className="bg-[#1E1B38] border border-[#6366F1] shadow-sm rounded-xl p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-[#1E1B38] text-[#6366F1] mx-auto mb-2 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-[#6366F1]">Target LLM Sandbox</div>
              <div className="text-[11px] text-[#8C92A4] font-mono">(llm_net)</div>
              <div className="text-[10px] text-[#585E70] font-mono mt-1">172.28.2.0/24</div>
            </div>

            {/* Blue Box */}
            <div className="bg-[#0E2333] border border-[#10B981] shadow-sm rounded-xl p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-[#0D2D2E] text-[#10B981] mx-auto mb-2 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-[#10B981]">Blue Sandbox</div>
              <div className="text-[11px] text-[#8C92A4] font-mono">(blue_net)</div>
              <div className="text-[10px] text-[#585E70] font-mono mt-1">172.28.3.0/24</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#20242E] text-[11px] text-[#585E70] font-mono flex items-center justify-between">
            <span>Direct routing between Red Team and Blue Team is blocked at the Linux iptables bridge level.</span>
            <span className="text-[#10B981] font-bold">VERIFIED</span>
          </div>
        </div>
      </div>

      {/* Container Roster */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {containers.map((c, i) => (
          <div key={i} className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card space-y-3 hover:border-[#2D3342] transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1E222D] border border-[#20242E] flex items-center justify-center" style={{ color: c.color }}>
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#F8FAFC] font-mono text-xs">{c.name}</h3>
                  <p className="text-[11px] text-[#585E70]">{c.service}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#0D2820] text-[#10B981] border border-[#10B981]/40 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                {c.status}
              </span>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-[#191C24] text-xs font-mono">
              <div className="text-[#585E70] flex justify-between">
                <span>Subnet:</span>
                <span className="text-[#F0F2F6]">{c.subnet}</span>
              </div>
              <div className="text-[#585E70] flex justify-between">
                <span>Hardening:</span>
                <span className="text-[#60A5FA]">{c.capabilities}</span>
              </div>
              <div className="text-[#585E70] flex justify-between">
                <span>Port Binding:</span>
                <span className="text-[#8C92A4]">{c.port}</span>
              </div>
              <div className="text-[#585E70] flex justify-between">
                <span>Read-Only Root FS:</span>
                <span className="text-[#10B981] font-bold">ENFORCED</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
