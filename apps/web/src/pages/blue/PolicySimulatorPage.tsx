import React, { useState } from 'react';
import {
  Play, Shield, CheckCircle2, AlertTriangle, RefreshCw,
  BarChart2, Cpu, Zap, Search, ArrowUpRight, TrendingUp,
  CheckCircle, Sliders, Check
} from 'lucide-react';

interface PolicySimulatorPageProps {
  evaluationId: string;
}

export const PolicySimulatorPage: React.FC<PolicySimulatorPageProps> = ({ evaluationId }) => {
  const [baselinePolicy, setBaselinePolicy] = useState('v2.0 (Current Production)');
  const [candidatePolicy, setCandidatePolicy] = useState('v2.6 (Edited)');
  const [testDataset, setTestDataset] = useState('Standard Adversarial Suite (25 cases)');
  const [simulating, setSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'comparison' | 'metrics' | 'report'>('results');
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const cases = [
    { id: 1, type: 'Prompt Injection', baseline: 'BLOCKED', candidate: 'BLOCKED', expected: 'BLOCKED', status: 'Pass' },
    { id: 2, type: 'Jailbreak Attempt', baseline: 'ALLOWED', candidate: 'BLOCKED', expected: 'BLOCKED', status: 'Pass' },
    { id: 3, type: 'Data Exfiltration', baseline: 'ALLOWED', candidate: 'BLOCKED', expected: 'BLOCKED', status: 'Pass' },
    { id: 4, type: 'Role Confusion', baseline: 'BLOCKED', candidate: 'BLOCKED', expected: 'BLOCKED', status: 'Pass' },
    { id: 5, type: 'Context Manipulation', baseline: 'CONFUSED', candidate: 'BLOCKED', expected: 'BLOCKED', status: 'Pass' },
    { id: 6, type: 'System Prompt Leakage', baseline: 'ALLOWED', candidate: 'BLOCKED', expected: 'BLOCKED', status: 'Pass' },
    { id: 7, type: 'Delimiter Override', baseline: 'ALLOWED', candidate: 'BLOCKED', expected: 'BLOCKED', status: 'Pass' },
    { id: 8, type: 'Canary Token Extraction', baseline: 'BLOCKED', candidate: 'BLOCKED', expected: 'BLOCKED', status: 'Pass' },
  ];

  const handleRunSimulation = async () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
    }, 800);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-8 font-mono">
      {/* Top Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#10B981]" />
            Policy Simulator & Regression Analysis
          </h1>
          <p className="text-xs text-[#8C92A4] mt-1">
            Test candidate policies against adversarial datasets and compare performance.
          </p>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={simulating}
          className="px-4 py-2.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#0C0D11] text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
        >
          <Play className={`w-4 h-4 ${simulating ? 'animate-spin' : ''}`} />
          {simulating ? 'Running Simulation...' : 'Run New Simulation'}
        </button>
      </div>

      {/* Simulation Configuration Bar */}
      <div className="p-5 rounded-xl bg-[#15171F] border border-[#20242E] shadow-card space-y-3">
        <div className="text-xs font-bold text-[#F8FAFC]">Simulation Configuration</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-[10px] text-[#585E70] uppercase tracking-wider block mb-1.5">Baseline Policy</label>
            <select
              value={baselinePolicy}
              onChange={(e) => setBaselinePolicy(e.target.value)}
              className="w-full bg-[#12141A] border border-[#20242E] text-[#F8FAFC] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#10B981]"
            >
              <option value="v2.0 (Current Production)">v2.0 (Current Production)</option>
              <option value="v1.5 (Baseline Keyword)">v1.5 (Baseline Keyword)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#585E70] uppercase tracking-wider block mb-1.5">Candidate Policy</label>
            <select
              value={candidatePolicy}
              onChange={(e) => setCandidatePolicy(e.target.value)}
              className="w-full bg-[#12141A] border border-[#20242E] text-[#10B981] font-bold rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#10B981]"
            >
              <option value="v2.6 (Edited)">v2.6 (Edited - Regex Fencing)</option>
              <option value="v2.7 (Experimental)">v2.7 (Experimental)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#585E70] uppercase tracking-wider block mb-1.5">Test Dataset</label>
            <select
              value={testDataset}
              onChange={(e) => setTestDataset(e.target.value)}
              className="w-full bg-[#12141A] border border-[#20242E] text-[#F8FAFC] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#10B981]"
            >
              <option value="Standard Adversarial Suite (25 cases)">Standard Adversarial Suite (25 cases)</option>
              <option value="OWASP LLM Top 10 Suite (40 cases)">OWASP LLM Top 10 Suite (40 cases)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs & Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#20242E] pb-1 text-xs">
        <div className="flex items-center gap-1">
          {(['results', 'comparison', 'metrics', 'report'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-[#15171F] text-[#10B981] border-t border-x border-[#20242E] font-bold'
                  : 'text-[#585E70] hover:text-[#F8FAFC]'
              }`}
            >
              {tab === 'results' ? 'Simulation Results' : tab === 'comparison' ? 'Case Comparison' : tab === 'metrics' ? 'Metrics Analysis' : 'Regression Report'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#152033] border border-[#10B981] text-[#10B981] text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Simulation Complete
          </span>
          <span className="text-xs text-[#8C92A4]">25 / 25 cases</span>
        </div>
      </div>

      {/* Row 1: Overall Results (Donut Gauges) + Improvement Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Overall Results (6 cols) */}
        <div className="lg:col-span-6 p-6 rounded-xl bg-[#15171F] border border-[#20242E] shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-[#20242E] pb-3">
            <span className="text-xs font-bold text-[#F8FAFC]">Overall Results</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-[#EF4444]">● Blocked</span>
              <span className="text-[#10B981]">● Defended</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center text-center">
            {/* Baseline Donut */}
            <div className="p-4 rounded-xl bg-[#12141A] border border-[#20242E]">
              <div className="text-[11px] text-[#585E70] font-bold">Baseline (v2.0)</div>
              <div className="relative w-24 h-24 mx-auto my-3 flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90">
                  <circle cx="48" cy="48" r="36" stroke="#152033" strokeWidth="6" fill="none" />
                  <circle
                    cx="48"
                    cy="48"
                    r="36"
                    stroke="#EF4444"
                    strokeWidth="6"
                    strokeDasharray="226"
                    strokeDashoffset="54"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-lg font-black text-[#F8FAFC]">76.0%</div>
                </div>
              </div>
              <div className="text-xs font-bold text-[#F8FAFC]">19 / 25 blocked</div>
              <div className="text-[10px] text-[#EF4444] mt-0.5">2 false positives</div>
            </div>

            {/* Candidate Donut */}
            <div className="p-4 rounded-xl bg-[#12141A] border border-[#10B981] shadow-sm">
              <div className="text-[11px] text-[#10B981] font-bold">Candidate (v2.6)</div>
              <div className="relative w-24 h-24 mx-auto my-3 flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90">
                  <circle cx="48" cy="48" r="36" stroke="#152033" strokeWidth="6" fill="none" />
                  <circle
                    cx="48"
                    cy="48"
                    r="36"
                    stroke="#10B981"
                    strokeWidth="6"
                    strokeDasharray="226"
                    strokeDashoffset="18"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-lg font-black text-[#10B981]">92.0%</div>
                </div>
              </div>
              <div className="text-xs font-bold text-[#F8FAFC]">23 / 25 blocked</div>
              <div className="text-[10px] text-[#10B981] mt-0.5">0 false positives</div>
            </div>
          </div>
        </div>

        {/* Improvement Metrics (6 cols) */}
        <div className="lg:col-span-6 p-6 rounded-xl bg-[#15171F] border border-[#20242E] shadow-card flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#20242E] pb-3 mb-4">
              <span className="text-xs font-bold text-[#F8FAFC]">Improvement Metrics</span>
              <span className="text-[11px] text-[#10B981]">vs Baseline v2.0</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-xl bg-[#12141A] border border-[#20242E]">
                <div className="text-2xl font-black text-[#10B981]">+16.0%</div>
                <div className="text-[10px] text-[#8C92A4] mt-1">Block Rate Increase</div>
              </div>

              <div className="p-4 rounded-xl bg-[#12141A] border border-[#20242E]">
                <div className="text-2xl font-black text-[#10B981]">-50.0%</div>
                <div className="text-[10px] text-[#8C92A4] mt-1">False Positive Reduction</div>
              </div>

              <div className="p-4 rounded-xl bg-[#12141A] border border-[#20242E]">
                <div className="text-2xl font-black text-[#10B981]">0</div>
                <div className="text-[10px] text-[#8C92A4] mt-1">New Regressions</div>
              </div>
            </div>
          </div>

          {/* Banner */}
          <div className="p-4 rounded-xl bg-[#152033] border border-[#10B981] flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-[#10B981] shrink-0" />
            <p className="text-xs text-[#F8FAFC] leading-relaxed">
              Candidate policy showed significant improvement with no detected regressions. Safe for gateway deployment.
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: Per-Case Results (7 cols) + Performance Comparison (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Per-Case Results Table (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-[#15171F] border border-[#20242E] shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#20242E] pb-3">
            <span className="text-xs font-bold text-[#F8FAFC]">Per-Case Results (25)</span>
            <div className="flex items-center gap-2">
              <select className="bg-[#12141A] border border-[#20242E] text-[11px] text-[#F8FAFC] rounded-lg px-2.5 py-1">
                <option>All Cases</option>
                <option>Failed Only</option>
                <option>Regressed Only</option>
              </select>
              <select className="bg-[#12141A] border border-[#20242E] text-[11px] text-[#F8FAFC] rounded-lg px-2.5 py-1">
                <option>All Categories</option>
                <option>Prompt Injection</option>
                <option>Jailbreak</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] text-[#585E70] uppercase border-b border-[#20242E]">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">ATTACK TYPE</th>
                  <th className="py-2 px-3">BASELINE</th>
                  <th className="py-2 px-3">CANDIDATE</th>
                  <th className="py-2 px-3">EXPECTED</th>
                  <th className="py-2 px-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20242E]/50">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-[#152033]/40">
                    <td className="py-2.5 px-3 text-[#585E70]">{c.id}</td>
                    <td className="py-2.5 px-3 text-[#F8FAFC] font-semibold">{c.type}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.baseline === 'BLOCKED' ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                      }`}>
                        {c.baseline}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/15 text-[#10B981]">
                        {c.candidate}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#8C92A4]">{c.expected}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[#10B981] font-bold flex items-center justify-end gap-1">
                        <Check className="w-3.5 h-3.5" /> {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Comparison (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-[#15171F] border border-[#20242E] shadow-card flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#20242E] pb-3 mb-4">
              <span className="text-xs font-bold text-[#F8FAFC]">Performance Comparison</span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-[#585E70]">■ Baseline v2.0</span>
                <span className="text-[#10B981]">■ Candidate v2.6</span>
              </div>
            </div>

            {/* Custom Bar Comparison Visualization */}
            <div className="space-y-5 pt-2">
              {/* Metric 1: Block Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8C92A4]">Block Rate</span>
                  <span className="text-[#10B981] font-bold">76% → 92%</span>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-[#12141A] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#585E70] h-full rounded-full w-[76%]"></div>
                  </div>
                  <div className="w-full bg-[#12141A] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#10B981] h-full rounded-full w-[92%] shadow-[0_0_8px_#10B981]"></div>
                  </div>
                </div>
              </div>

              {/* Metric 2: False Positives */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8C92A4]">False Positives</span>
                  <span className="text-[#10B981] font-bold">16% → 8%</span>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-[#12141A] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#EF4444] h-full rounded-full w-[16%]"></div>
                  </div>
                  <div className="w-full bg-[#12141A] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#10B981] h-full rounded-full w-[8%]"></div>
                  </div>
                </div>
              </div>

              {/* Metric 3: Response Time */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8C92A4]">Response Overhead</span>
                  <span className="text-[#10B981] font-bold">129ms → 115ms</span>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-[#12141A] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#585E70] h-full rounded-full w-[65%]"></div>
                  </div>
                  <div className="w-full bg-[#12141A] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#3B82F6] h-full rounded-full w-[58%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#20242E] text-xs text-[#585E70] text-center">
            Evaluated against 25 standardized adversarial probes
          </div>
        </div>
      </div>
    </div>
  );
};
