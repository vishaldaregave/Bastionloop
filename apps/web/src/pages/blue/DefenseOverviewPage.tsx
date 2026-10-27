import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, ShieldCheck, ShieldAlert, Lock, Activity,
  RefreshCw, CheckCircle2, AlertTriangle, Radio, Server,
  Sliders, Cpu, HardDrive, Zap, Eye, ArrowRight, Ban,
  Database, Network, Layers, ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';
import { BlueViewData } from '../../types';

interface DefenseOverviewPageProps {
  evaluationId: string;
}

// Waveform Sparkline Component
const Sparkline: React.FC<{ color: string; data?: number[]; id: string }> = ({ color, data, id }) => {
  const points = data || [20, 35, 28, 45, 42, 60, 55, 72, 68, 85, 92];
  const max = Math.max(...points, 100);
  const min = Math.min(...points, 0);
  const width = 100;
  const height = 36;

  const pts = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - ((val - min) / (max - min || 1)) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const areaPts = `0,${height} ${pts} ${width},${height}`;

  return (
    <div className="w-24 h-9 overflow-hidden">
      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={areaPts} fill={`url(#grad-${id})`} />
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export const DefenseOverviewPage: React.FC<DefenseOverviewPageProps> = ({ evaluationId }) => {
  const navigate = useNavigate();
  const [blueData, setBlueData] = useState<BlueViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('ALL');

  useEffect(() => {
    loadTelemetry();
  }, [evaluationId]);

  const loadTelemetry = async () => {
    setLoading(true);
    try {
      const data = await api.getBlueView(evaluationId);
      setBlueData(data);
    } catch (e) {
      console.error('Failed loading blue view telemetry', e);
    } finally {
      setLoading(false);
    }
  };

  const activeDefenses = blueData?.active_defenses || [
    { name: 'Prompt Injection Filter', version: 'v2.6', status: 'ACTIVE', desc: 'Blocks system prompt extraction' },
    { name: 'Jailbreak Detection', version: 'v2.0', status: 'ACTIVE', desc: 'Detects jailbreak attempts and DAN' },
    { name: 'Context Manipulation Guard', version: 'v2.0', status: 'ACTIVE', desc: 'Prevents context window manipulation' },
    { name: 'Sensitive Data Redaction', version: 'v2.5', status: 'ACTIVE', desc: 'Redacts API keys and sensitive data' },
    { name: 'Output Content Filter', version: 'v2.2', status: 'ACTIVE', desc: 'Filters harmful and unsafe outputs' }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans text-[#F0F2F6]">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Defensive Operations Center</h1>
          <p className="text-[#585E70] text-xs mt-1">
            Real-time threat detection, policy enforcement, and adversarial containment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#15171F] border border-[#20242E] text-xs font-mono text-[#8C92A4]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
            <span>Live Telemetry Connected</span>
          </div>

          <button
            onClick={loadTelemetry}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#F0F2F6] bg-[#15171F] hover:bg-[#191C25] border border-[#20242E] hover:border-[#10B981] rounded-lg shadow-card transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#10B981] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Guardrails</span>
          </button>
        </div>
      </div>

      {/* Row 1: 4 Hero Metric Cards (Image 2 standard format) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Threats Detected */}
        <div className="bg-[#15171F] border border-[#20242E] p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden shadow-card hover:border-[#10B981] transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#0D2820] border border-[#10B981] text-[#10B981] flex items-center justify-center shadow-sm">
              <Radio className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#8C92A4] flex-1 ml-3">Threats Detected</span>
          </div>
          <div className="flex items-end justify-between z-10">
            <div>
              <div className="text-3xl font-black text-[#F8FAFC] tracking-tight leading-none">47</div>
              <div className="text-[11px] text-[#10B981] mt-1.5 font-medium">+12% from last hour</div>
            </div>
            <Sparkline color="#10B981" id="blue-kpi-1" data={[20, 25, 32, 28, 38, 42, 47]} />
          </div>
        </div>

        {/* Metric 2: Requests Blocked */}
        <div className="bg-[#15171F] border border-[#20242E] p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden shadow-card hover:border-[#2D3342] transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#1E222D] border border-[#2D3342] text-[#3B82F6] flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#8C92A4] flex-1 ml-3">Requests Blocked</span>
          </div>
          <div className="flex items-end justify-between z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-[#F8FAFC] tracking-tight leading-none">42</span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-[#0D2820] text-[#10B981] border border-[#10B981]/30 font-mono">
                  89.4%
                </span>
              </div>
              <div className="text-[11px] text-[#585E70] mt-1.5 font-medium">89.4% block rate</div>
            </div>
            <Sparkline color="#3B82F6" id="blue-kpi-2" data={[15, 22, 28, 30, 35, 39, 42]} />
          </div>
        </div>

        {/* Metric 3: Active Guardrails */}
        <div className="bg-[#15171F] border border-[#20242E] p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden shadow-card hover:border-[#2D3342] transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#1E222D] border border-[#2563EB] text-[#60A5FA] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#8C92A4] flex-1 ml-3">Active Guardrails</span>
          </div>
          <div className="flex items-end justify-between z-10">
            <div>
              <div className="text-3xl font-black text-[#F8FAFC] tracking-tight leading-none">5</div>
              <div className="text-[11px] text-[#585E70] mt-1.5 font-medium">All policies enforcing</div>
            </div>
            <Sparkline color="#60A5FA" id="blue-kpi-3" data={[5, 5, 5, 5, 5, 5, 5]} />
          </div>
        </div>

        {/* Metric 4: Containment Rate */}
        <div className="bg-[#15171F] border border-[#20242E] p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden shadow-card hover:border-[#10B981] transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#0D2820] border border-[#10B981] text-[#10B981] flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#8C92A4] flex-1 ml-3">Containment Rate</span>
          </div>
          <div className="flex items-end justify-between z-10">
            <div>
              <div className="text-3xl font-black text-[#F8FAFC] tracking-tight leading-none">99.7%</div>
              <div className="text-[11px] text-[#10B981] mt-1.5 font-medium">System Health 100%</div>
            </div>
            <Sparkline color="#10B981" id="blue-kpi-4" data={[98.5, 99.0, 99.2, 99.5, 99.7, 99.7, 99.7]} />
          </div>
        </div>
      </div>

      {/* Row 2: Defense Topology & System Components (7 cols) + Active Defenses (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Defense Topology & Infrastructure (7 cols) */}
        <div className="lg:col-span-7 bg-[#15171F] border border-[#20242E] rounded-xl p-5 shadow-card flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#20242E]">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-[#10B981]" />
                <span className="text-sm font-bold text-[#F8FAFC]">Defense Network Topology</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-[#10B981]">
                  <span className="w-2 h-0.5 bg-[#10B981]"></span> Valid Route
                </span>
                <span className="flex items-center gap-1.5 text-[#EF4444]">
                  <span className="w-2 h-0.5 bg-[#EF4444] border-b border-dashed"></span> Blocked Direct Route
                </span>
              </div>
            </div>

            {/* Topology Node Diagram */}
            <div className="py-4 font-mono">
              <div className="grid grid-cols-3 gap-3 items-center text-center">
                {/* Red Team Node */}
                <div className="p-3.5 rounded-xl bg-[#2D1217] border border-[#EF4444]/50 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-[#EF4444]/15 text-[#EF4444] mx-auto flex items-center justify-center mb-1.5">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-[#EF4444]">Red Team</div>
                  <div className="text-[10px] text-[#585E70] mt-0.5">172.28.0.0/16</div>
                </div>

                {/* Defense Gateway Node */}
                <div className="p-3.5 rounded-xl bg-[#0D2820] border border-[#10B981] shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 text-[#10B981] mx-auto flex items-center justify-center mb-1.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-[#10B981]">Defense Gateway</div>
                  <div className="text-[10px] text-[#8C92A4] mt-0.5">172.28.1.0/24</div>
                </div>

                {/* Target LLM Node */}
                <div className="p-3.5 rounded-xl bg-[#1E1B38] border border-[#6366F1]/50 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 text-[#6366F1] mx-auto flex items-center justify-center mb-1.5">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-[#6366F1]">Target LLM</div>
                  <div className="text-[10px] text-[#585E70] mt-0.5">172.28.2.0/24</div>
                </div>
              </div>

              {/* Secondary Layer Nodes */}
              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#20242E]">
                <div className="p-3 rounded-lg bg-[#12141A] border border-[#20242E] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Database className="w-4 h-4 text-[#3B82F6]" />
                    <div>
                      <div className="text-[#F8FAFC] text-xs font-bold">Threat Intel (Redis)</div>
                      <div className="text-[10px] text-[#585E70]">172.28.4.0/24</div>
                    </div>
                  </div>
                  <span className="text-xs text-[#10B981] font-bold">Connected</span>
                </div>

                <div className="p-3 rounded-lg bg-[#12141A] border border-[#20242E] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-[#10B981]" />
                    <div>
                      <div className="text-[#F8FAFC] text-xs font-bold">Evidence DB (Postgres)</div>
                      <div className="text-[10px] text-[#585E70]">172.28.5.0/24</div>
                    </div>
                  </div>
                  <span className="text-xs text-[#10B981] font-bold">Immutable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure Health Matrix */}
          <div className="pt-3 border-t border-[#20242E]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              {[
                { name: 'Defense Gateway', latency: '8ms', status: 'Healthy' },
                { name: 'Policy Engine', latency: '12ms', status: 'Healthy' },
                { name: 'Threat Analyzer', latency: '15ms', status: 'Healthy' },
                { name: 'Evidence Guard', latency: '10ms', status: 'Healthy' },
                { name: 'Response Engine', latency: '9ms', status: 'Healthy' },
                { name: 'Quarantine Service', latency: '11ms', status: 'Healthy' }
              ].map((svc, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-[#12141A] border border-[#20242E] flex items-center justify-between">
                  <span className="text-[#8C92A4] text-xs truncate mr-2">{svc.name}</span>
                  <span className="text-[11px] font-bold text-[#10B981] shrink-0">{svc.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Defenses & Guardrails (5 cols) */}
        <div className="lg:col-span-5 bg-[#15171F] border border-[#20242E] rounded-xl p-5 shadow-card flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#20242E]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                <span className="text-sm font-bold text-[#F8FAFC]">Active Guardrail Policies</span>
              </div>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#0D2820] text-[#10B981] border border-[#10B981]/40 font-bold">
                5/5 ACTIVE
              </span>
            </div>

            <div className="space-y-2.5 mt-3 text-xs font-mono">
              {activeDefenses.map((d: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-[#12141A] border border-[#20242E] hover:bg-[#191C25] transition-colors flex items-center justify-between">
                  <div className="truncate pr-2">
                    <div className="text-[#F8FAFC] text-xs font-bold truncate">{d.name}</div>
                    <div className="text-[10px] text-[#585E70] mt-0.5">{d.desc || d.version || 'v2.0'}</div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10b981] shrink-0"></span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#12141A] border border-[#20242E] flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-[#585E70] block text-[10px]">AUTOMATED RESPONSE SLA</span>
              <span className="text-[#10B981] font-bold text-xs mt-0.5 block">Sub-Second Interception (Active)</span>
            </div>
            <button
              onClick={() => navigate('/blue-team/policies')}
              className="px-3 py-1.5 rounded-lg bg-[#15171F] hover:bg-[#191C25] border border-[#10B981] text-[#10B981] hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              Configure →
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Live Security Alerts (7 cols) + Resource Usage & Recent Actions (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Live Security Alerts (7 cols) */}
        <div className="lg:col-span-7 bg-[#15171F] border border-[#20242E] rounded-xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#20242E]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                <span className="text-sm font-bold text-[#F8FAFC]">Live Security Alerts</span>
              </div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-[#12141A] border border-[#20242E] text-xs font-mono text-[#F8FAFC] rounded-lg px-3 py-1 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Severity</option>
                <option value="HIGH">High Only</option>
                <option value="MEDIUM">Medium Only</option>
                <option value="LOW">Low Only</option>
              </select>
            </div>

            <div className="overflow-x-auto mt-3 font-mono">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#101217] text-[#585E70] text-[10px] uppercase border-b border-[#20242E]">
                  <tr>
                    <th className="px-4 py-2.5">SEVERITY</th>
                    <th className="px-4 py-2.5">TIME</th>
                    <th className="px-4 py-2.5">THREAT TYPE</th>
                    <th className="px-4 py-2.5">TARGET</th>
                    <th className="px-4 py-2.5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#20242E]">
                  {[
                    { sev: 'High', time: '10:24:31', type: 'Prompt Injection', target: 'llama3.2', action: 'Blocked' },
                    { sev: 'Medium', time: '10:22:15', type: 'Data Exfiltration', target: 'llama3.2', action: 'Sanitized' },
                    { sev: 'Medium', time: '10:21:02', type: 'Context Manipulation', target: 'llama3.2', action: 'Flagged' },
                    { sev: 'Low', time: '10:19:33', type: 'Policy Bypass Attempt', target: 'llama3.2', action: 'Blocked' }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#191C25]/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.sev === 'High' ? 'bg-[#2D1217] text-[#EF4444] border border-[#EF4444]/30' :
                          row.sev === 'Medium' ? 'bg-[#2B1D08] text-[#F59E0B] border border-[#F59E0B]/30' :
                          'bg-[#1E222D] text-[#3B82F6] border border-[#2D3342]/30'
                        }`}>
                          {row.sev}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#585E70]">{row.time}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-[#F8FAFC]">{row.type}</td>
                      <td className="px-4 py-3 text-xs text-[#3B82F6]">{row.target}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-bold text-[#10B981]">{row.action}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Resource Usage & Recent Defense Actions (5 cols - Image 2 format) */}
        <div className="lg:col-span-5 bg-[#15171F] border border-[#20242E] rounded-xl p-5 shadow-card flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#20242E]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#3B82F6]" />
                <span className="text-sm font-bold text-[#F8FAFC]">Resource Usage</span>
              </div>
              <span className="text-xs font-mono text-[#585E70]">Last 1 Hour ▾</span>
            </div>

            {/* 3 Circular Gauges */}
            <div className="flex items-center justify-around py-4">
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-[#1E222D]" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-[#10B981]" strokeDasharray="28, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="absolute text-xs font-mono font-bold text-[#F8FAFC]">28%</span>
                </div>
                <span className="text-xs font-mono font-medium text-[#585E70] mt-2">CPU</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-[#1E222D]" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-[#3B82F6]" strokeDasharray="46, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="absolute text-xs font-mono font-bold text-[#F8FAFC]">46%</span>
                </div>
                <span className="text-xs font-mono font-medium text-[#585E70] mt-2">Memory</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-[#1E222D]" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-[#F59E0B]" strokeDasharray="38, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="absolute text-xs font-mono font-bold text-[#F8FAFC]">38%</span>
                </div>
                <span className="text-xs font-mono font-medium text-[#585E70] mt-2">Disk</span>
              </div>
            </div>

            {/* Recent Defense Actions */}
            <div className="pt-3 border-t border-[#20242E] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[#585E70] text-[11px] mb-1">
                <span>Recent Defense Actions</span>
                <button onClick={() => navigate('/blue-team/alerts')} className="text-[#10B981] hover:underline">View Timeline →</button>
              </div>
              <div className="p-2.5 rounded-lg bg-[#12141A] border border-[#20242E] flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-[#F8FAFC] font-bold block truncate">10:24:31 Injection Blocked</span>
                  <span className="text-[#585E70] text-[10px]">Adversarial prompt identified and blocked at gateway</span>
                </div>
                <span className="text-[10px] text-[#EF4444] font-bold shrink-0">Blocked</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#12141A] border border-[#20242E] flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-[#F8FAFC] font-bold block truncate">10:23:08 Context Sanitized</span>
                  <span className="text-[#585E70] text-[10px]">Harmful context removed from model input</span>
                </div>
                <span className="text-[10px] text-[#10B981] font-bold shrink-0">Sanitized</span>
              </div>
            </div>
          </div>

          {/* Rate Limit Bar */}
          <div className="pt-3 border-t border-[#20242E]">
            <div className="flex items-center justify-between text-xs font-mono text-[#8C92A4] mb-1.5">
              <span>Defense Rate Limit: 120 req/min</span>
              <span className="font-bold text-[#F8FAFC]">42 / 120 (35%)</span>
            </div>
            <div className="h-1.5 w-full bg-[#12141A] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#1E283C] to-[#3B82F6] w-[35%] rounded-full shadow-[0_0_6px_#3B82F6]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
