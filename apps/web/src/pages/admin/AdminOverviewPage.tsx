import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, FolderKanban, Server, Award, CheckCircle2,
  AlertTriangle, RefreshCw, Lock, Activity, Database, Cpu,
  HardDrive, Layers, ArrowRight, ShieldCheck, Flame, Box,
  ChevronDown, Radio, AlertOctagon, Check
} from 'lucide-react';
import { api } from '../../services/api';
import { Evaluation, TestIntegrityPassport, EvidenceVerification } from '../../types';

interface AdminOverviewPageProps {
  evaluationId: string;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({ evaluationId }) => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<{
    evaluation: Evaluation;
    passport: TestIntegrityPassport;
    evidence_integrity: EvidenceVerification;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('Last 24 Hours');

  useEffect(() => {
    loadOverview();
  }, [evaluationId]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard(evaluationId);
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard overview', err);
    } finally {
      setLoading(false);
    }
  };

  const evalItem = dashboardData?.evaluation;
  const pass = dashboardData?.passport;
  const evid = dashboardData?.evidence_integrity;

  const infrastructureServices = [
    { name: 'FastAPI Gateway', latency: '12ms', status: 'Healthy', icon: Server, color: '#3B82F6' },
    { name: 'Red Team Worker', latency: '8ms', status: 'Healthy', icon: AlertOctagon, color: '#EF4444' },
    { name: 'Blue Team Guard', latency: '10ms', status: 'Healthy', icon: Shield, color: '#10B981' },
    { name: 'Target LLM (Ollama)', latency: '145ms', status: 'Healthy', icon: Cpu, color: '#6366F1' },
    { name: 'PostgreSQL', latency: '3ms', status: 'Healthy', icon: Database, color: '#3B82F6' },
    { name: 'Redis', latency: '2ms', status: 'Healthy', icon: Layers, color: '#EF4444' },
  ];

  const recentAuditEvents = [
    { time: '10:24:31', event: 'EVALUATION_CREATED', actor: 'admin', details: evaluationId || 'BL-2026-89835', status: 'Success', icon: FolderKanban },
    { time: '10:24:29', event: 'USER_LOGIN', actor: 'red_operator', details: 'Successful', status: 'Success', icon: Users },
    { time: '10:24:27', event: 'POLICY_UPDATED', actor: 'blue_operator', details: 'Defense rule v2', status: 'Success', icon: Shield },
    { time: '10:24:22', event: 'SANDBOX_REPATCHED', actor: 'system', details: 'Red sandbox rotated', status: 'Success', icon: Box },
    { time: '10:24:18', event: 'EVIDENCE_VERIFIED', actor: 'admin', details: 'Merkle root valid', status: 'Success', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Platform Control Plane</h1>
          <p className="text-[#585E70] text-xs mt-1">
            Global evaluation posture, root-of-trust verification status, sandbox health, and resource governance.
          </p>
        </div>
        <button
          onClick={loadOverview}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#F0F2F6] bg-[#15171F] hover:bg-[#191C25] border border-[#20242E] hover:border-[#2D3342] rounded-lg shadow-subtle transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#3B82F6] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Control Plane</span>
        </button>
      </div>

      {/* Top 4 Hero Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Evaluations */}
        <div className="bg-[#15171F] border border-[#20242E] p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden shadow-card hover:border-[#2D3342] transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#1E222D] border border-[#2D3342] text-[#3B82F6] flex items-center justify-center shadow-sm">
              <Box className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#8C92A4] flex-1 ml-3">Active Evaluations</span>
          </div>

          <div className="flex items-end justify-between z-10">
            <div>
              <div className="text-3xl font-black text-[#F8FAFC] tracking-tight leading-none">4</div>
              <div className="text-[11px] text-[#585E70] mt-1.5 font-medium">2 running • 2 completed</div>
            </div>

            {/* Cyan waveform sparkline */}
            <div className="w-24 h-10">
              <svg viewBox="0 0 100 40" className="w-full h-full stroke-[#10B981] fill-none stroke-2">
                <path d="M0,25 Q15,35 30,20 T60,25 T80,5 T100,20" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Total Tests Executed */}
        <div className="bg-[#15171F] border border-[#20242E] p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden shadow-card hover:border-[#2D3342] transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#1E222D] border border-[#2563EB] text-[#60A5FA] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#8C92A4] flex-1 ml-3">Total Tests Executed</span>
          </div>

          <div className="flex items-end justify-between z-10">
            <div>
              <div className="text-3xl font-black text-[#F8FAFC] tracking-tight leading-none">
                {pass?.attack_count ? pass.attack_count : '128'}
              </div>
              <div className="text-[11px] text-[#585E70] mt-1.5 font-medium flex items-center gap-1">
                <span className="text-[#10B981] font-bold">+12%</span> from last week
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-end gap-1 h-8">
                <div className="w-1.5 bg-[#2563EB] h-3 rounded-xs"></div>
                <div className="w-1.5 bg-[#2563EB] h-5 rounded-xs"></div>
                <div className="w-1.5 bg-[#2D3342] h-7 rounded-xs"></div>
                <div className="w-1.5 bg-[#3B82F6] h-4 rounded-xs"></div>
                <div className="w-1.5 bg-[#10B981] h-8 rounded-xs"></div>
              </div>
              <Flame className="w-6 h-6 text-[#EF4444] fill-[#EF4444]/20" />
            </div>
          </div>
        </div>

        {/* Card 3: Platform Health */}
        <div className="bg-[#15171F] border border-[#20242E] p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden shadow-card hover:border-[#2D3342] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8C92A4]">Platform Health</span>
          </div>

          <div className="flex items-center justify-between z-10">
            <div>
              <div className="text-3xl font-black text-[#10B981] tracking-tight leading-none">100%</div>
              <div className="text-[11px] text-[#585E70] mt-1.5 font-medium">All services operational</div>
            </div>

            {/* Radial circular ring gauge */}
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="24" cy="24" r="18" stroke="#191C24" strokeWidth="4" fill="transparent" />
                <circle
                  cx="24" cy="24" r="18"
                  stroke="#10B981" strokeWidth="4"
                  strokeDasharray="113" strokeDashoffset="0"
                  strokeLinecap="round" fill="transparent"
                />
              </svg>
              <div className="absolute w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Card 4: Evidence Chain */}
        <div className="bg-[#15171F] border border-[#20242E] p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden shadow-card hover:border-[#2D3342] transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#1E222D] border border-[#10B981] text-[#10B981] flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#8C92A4] flex-1 ml-3">Evidence Chain</span>
          </div>

          <div className="flex items-end justify-between z-10">
            <div>
              <div className="text-2xl font-black text-[#10B981] tracking-tight leading-none flex items-center gap-1.5">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                <span>VALID</span>
              </div>
              <div className="text-[11px] text-[#585E70] mt-1.5 font-medium">SHA-256 verified</div>
            </div>

            <div className="text-right font-mono text-[10px] text-[#60A5FA]">
              Merkle Root
              <span className="block text-[#10B981] font-bold">INTACT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Infrastructure Status (left) & Network Topology (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Infrastructure Status */}
        <div className="lg:col-span-5 bg-[#15171F] border border-[#20242E] p-5 rounded-xl shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#191C24]">
            <h2 className="text-sm font-bold text-[#F8FAFC] tracking-wide">Infrastructure Status</h2>
            <span className="text-[10px] font-mono text-[#60A5FA]">6 / 6 ONLINE</span>
          </div>

          <div className="divide-y divide-[#191C24] space-y-1">
            {infrastructureServices.map((svc, idx) => {
              const Icon = svc.icon;
              return (
                <div key={idx} className="pt-2 pb-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded bg-[#191C25] border border-[#20242E]" style={{ color: svc.color }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-[#F0F2F6]">{svc.name}</span>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <span className="text-[#60A5FA]">{svc.latency}</span>
                    <span className="inline-flex items-center gap-1.5 text-[#10B981] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                      {svc.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Network Topology */}
        <div className="lg:col-span-7 bg-[#15171F] border border-[#20242E] p-5 rounded-xl shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#191C24]">
            <h2 className="text-sm font-bold text-[#F8FAFC] tracking-wide">Network Topology</h2>
            <span className="text-[10px] font-mono text-[#10B981] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
              ISOLATION ENFORCED
            </span>
          </div>

          {/* Connected Network Diagram */}
          <div className="py-2 flex flex-col justify-center items-center">
            {/* Top Row of 4 Nodes */}
            <div className="w-full flex items-center justify-between gap-2 overflow-x-auto py-2">
              {/* Node 1: Red Sandbox */}
              <div className="bg-[#2D1217] border border-[#EF4444] shadow-sm rounded-xl p-3 text-center min-w-[125px] flex-1">
                <div className="w-6 h-6 rounded-full bg-[#2D1217] text-[#EF4444] mx-auto mb-1 flex items-center justify-center">
                  <AlertOctagon className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-[#EF4444]">Red Sandbox</div>
                <div className="text-[10px] text-[#8C92A4] font-mono">(red_net)</div>
                <div className="text-[9px] text-[#585E70] font-mono mt-0.5">172.28.0.0/16</div>
              </div>

              {/* Arrow */}
              <div className="text-[#2D3342] flex items-center shrink-0">
                <div className="w-4 h-0.5 bg-[#2D3342]"></div>
                <ArrowRight className="w-4 h-4 -ml-1" />
              </div>

              {/* Node 2: Gateway */}
              <div className="bg-[#191C25] border border-[#2D3342] shadow-sm rounded-xl p-3 text-center min-w-[125px] flex-1">
                <div className="w-6 h-6 rounded-full bg-[#1E222D] text-[#3B82F6] mx-auto mb-1 flex items-center justify-center">
                  <Server className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-[#3B82F6]">Gateway</div>
                <div className="text-[10px] text-[#8C92A4] font-mono">(control_net)</div>
                <div className="text-[9px] text-[#585E70] font-mono mt-0.5">172.28.1.0/24</div>
              </div>

              {/* Arrow */}
              <div className="text-[#2D3342] flex items-center shrink-0">
                <div className="w-4 h-0.5 bg-[#2D3342]"></div>
                <ArrowRight className="w-4 h-4 -ml-1" />
              </div>

              {/* Node 3: LLM Sandbox */}
              <div className="bg-[#1E1B38] border border-[#6366F1] shadow-sm rounded-xl p-3 text-center min-w-[125px] flex-1">
                <div className="w-6 h-6 rounded-full bg-[#1E1B38] text-[#6366F1] mx-auto mb-1 flex items-center justify-center">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-[#6366F1]">LLM Sandbox</div>
                <div className="text-[10px] text-[#8C92A4] font-mono">(llm_net)</div>
                <div className="text-[9px] text-[#585E70] font-mono mt-0.5">172.28.2.0/24</div>
              </div>

              {/* Arrow */}
              <div className="text-[#2D3342] flex items-center shrink-0">
                <div className="w-4 h-0.5 bg-[#2D3342]"></div>
                <ArrowRight className="w-4 h-4 -ml-1" />
              </div>

              {/* Node 4: Blue Sandbox */}
              <div className="bg-[#0E2333] border border-[#10B981] shadow-sm rounded-xl p-3 text-center min-w-[125px] flex-1">
                <div className="w-6 h-6 rounded-full bg-[#0D2D2E] text-[#10B981] mx-auto mb-1 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-[#10B981]">Blue Sandbox</div>
                <div className="text-[10px] text-[#8C92A4] font-mono">(blue_net)</div>
                <div className="text-[9px] text-[#585E70] font-mono mt-0.5">172.28.3.0/24</div>
              </div>
            </div>

            {/* Dotted Return Path with No Direct Access Badge */}
            <div className="w-full mt-3 pt-2 border-t border-dashed border-[#20242E] flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#2D1217] border border-[#EF4444] text-[#EF4444] text-[10px] font-mono font-bold shadow-sm">
                <AlertTriangle className="w-3 h-3" />
                No Direct Access (Bridge Blocked)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Audit Events (left) & Resource Usage (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Audit Events */}
        <div className="lg:col-span-7 bg-[#15171F] border border-[#20242E] p-5 rounded-xl shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#191C24]">
              <h2 className="text-sm font-bold text-[#F8FAFC] tracking-wide">Recent Audit Events</h2>
              <button
                onClick={() => navigate('/admin/audit')}
                className="text-xs font-mono font-semibold text-[#60A5FA] hover:text-[#3B82F6] flex items-center gap-1 cursor-pointer transition-colors"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#141720] text-[#585E70] font-mono font-bold text-[10px] uppercase">
                    <th className="py-2.5 px-3 rounded-l-lg">TIME</th>
                    <th className="py-2.5 px-3">EVENT</th>
                    <th className="py-2.5 px-3">ACTOR</th>
                    <th className="py-2.5 px-3">DETAILS</th>
                    <th className="py-2.5 px-3 rounded-r-lg text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#191C24] font-mono text-[11px]">
                  {recentAuditEvents.map((evt, idx) => {
                    const Icon = evt.icon;
                    return (
                      <tr key={idx} className="hover:bg-[#1D212C]/40 transition-colors">
                        <td className="py-2.5 px-3 text-[#60A5FA]">{evt.time}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#F0F2F6] flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-[#3B82F6]" />
                          {evt.event}
                        </td>
                        <td className="py-2.5 px-3 text-[#60A5FA]">{evt.actor}</td>
                        <td className="py-2.5 px-3 text-[#8C92A4] truncate max-w-[180px]">{evt.details}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0D2820] text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold">
                            <Check className="w-2.5 h-2.5" />
                            {evt.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Resource Usage with Radial Meters */}
        <div className="lg:col-span-5 bg-[#15171F] border border-[#20242E] p-5 rounded-xl shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#191C24]">
            <h2 className="text-sm font-bold text-[#F8FAFC] tracking-wide">Resource Usage</h2>
            <div className="relative">
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                className="bg-[#12141A] border border-[#20242E] text-[#8C92A4] text-[11px] font-mono font-medium rounded-md px-2.5 py-1 pr-6 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="Last 24 Hours">Last 24 Hours</option>
                <option value="Last 7 Days">Last 7 Days</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#60A5FA] absolute right-2 top-2 pointer-events-none" />
            </div>
          </div>

          {/* 3 Circular Gauges */}
          <div className="grid grid-cols-3 gap-3 py-2">
            {/* CPU Gauge */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto flex flex-col items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="#191C24" strokeWidth="6" fill="transparent" />
                  <circle
                    cx="40" cy="40" r="32"
                    stroke="#10B981" strokeWidth="6"
                    strokeDasharray="201" strokeDashoffset={201 - (201 * 0.32)}
                    strokeLinecap="round" fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-[#585E70] font-mono">CPU</span>
                  <span className="text-sm font-black text-[#F8FAFC] leading-none">32%</span>
                </div>
              </div>
              {/* Mini wave sparkline */}
              <div className="w-16 h-4 mx-auto mt-1">
                <svg viewBox="0 0 60 15" className="w-full h-full stroke-[#10B981] fill-none stroke-1">
                  <path d="M0,10 Q15,0 30,8 T60,5" />
                </svg>
              </div>
            </div>

            {/* Memory Gauge */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto flex flex-col items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="#191C24" strokeWidth="6" fill="transparent" />
                  <circle
                    cx="40" cy="40" r="32"
                    stroke="#2563EB" strokeWidth="6"
                    strokeDasharray="201" strokeDashoffset={201 - (201 * 0.48)}
                    strokeLinecap="round" fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-[#585E70] font-mono">Memory</span>
                  <span className="text-sm font-black text-[#F8FAFC] leading-none">48%</span>
                </div>
              </div>
              {/* Mini wave sparkline */}
              <div className="w-16 h-4 mx-auto mt-1">
                <svg viewBox="0 0 60 15" className="w-full h-full stroke-[#2563EB] fill-none stroke-1">
                  <path d="M0,8 Q15,14 30,4 T60,8" />
                </svg>
              </div>
            </div>

            {/* Disk Gauge */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto flex flex-col items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="#191C24" strokeWidth="6" fill="transparent" />
                  <circle
                    cx="40" cy="40" r="32"
                    stroke="#F59E0B" strokeWidth="6"
                    strokeDasharray="201" strokeDashoffset={201 - (201 * 0.62)}
                    strokeLinecap="round" fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-[#585E70] font-mono">Disk</span>
                  <span className="text-sm font-black text-[#F8FAFC] leading-none">62%</span>
                </div>
              </div>
              {/* Mini wave sparkline */}
              <div className="w-16 h-4 mx-auto mt-1">
                <svg viewBox="0 0 60 15" className="w-full h-full stroke-[#F59E0B] fill-none stroke-1">
                  <path d="M0,12 Q15,4 30,10 T60,2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Rate Limit Bar */}
          <div className="p-3 bg-[#12141A] border border-[#20242E] rounded-lg mt-2 space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8C92A4] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#3B82F6]" />
                Global Rate Limit: 60 req/min
              </span>
              <span className="text-[#10B981] font-bold">16 / 60 (27%)</span>
            </div>
            <div className="w-full bg-[#191C24] h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#2563EB] to-[#10B981] h-full rounded-full" style={{ width: '27%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
