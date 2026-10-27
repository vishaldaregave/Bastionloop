import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Pause, Square, Plus, Shield, FlaskConical, Box,
  Filter, Target, Cpu, ChevronDown, Radio, ChevronRight,
  ArrowUpRight, Check, X, ArrowUp, ArrowDown, Send,
  ShieldCheck, ShieldAlert, Database, MessageSquare,
  AlertTriangle, Bug, Layers, Clock, Activity, RefreshCw, CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';
import { Attack, SecurityFinding } from '../../types';

interface AttackDashboardPageProps {
  evaluationId: string;
}

// Sleek Waveform Sparkline Component
const Sparkline: React.FC<{ color: string; data?: number[]; id: string }> = ({ color, data, id }) => {
  const points = data || [15, 30, 22, 40, 35, 55, 48, 68, 60, 78, 88];
  const max = Math.max(...points, 90);
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

export const AttackDashboardPage: React.FC<AttackDashboardPageProps> = ({ evaluationId }) => {
  const navigate = useNavigate();
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignStatus, setCampaignStatus] = useState<'RUNNING' | 'PAUSED' | 'IDLE'>('RUNNING');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [eventFilter, setEventFilter] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, [evaluationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [atkList, findList] = await Promise.all([
        api.listAttacks(evaluationId),
        api.listFindings(evaluationId)
      ]);
      setAttacks(atkList);
      setFindings(findList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Campaign Attack Queue items
  const [queueItems, setQueueItems] = useState([
    { num: '01', id: 'TC-INJ-01', name: 'Prompt Injection', category: 'Prompt Injection', severity: 'CRITICAL', status: 'Running' },
    { num: '02', id: 'TC-INJ-02', name: 'Role Confusion', category: 'Role Confusion', severity: 'HIGH', status: 'Pending' },
    { num: '03', id: 'TC-CAN-01', name: 'Canary Trap', category: 'Canary Trap', severity: 'CRITICAL', status: 'Pending' },
    { num: '04', id: 'TC-EXF-01', name: 'Data Exfiltration', category: 'Data Exfiltration', severity: 'HIGH', status: 'Pending' },
    { num: '05', id: 'TC-BYP-01', name: 'Multi-Lingual Jailbreak', category: 'Multi-Lingual Jailbreak', severity: 'HIGH', status: 'Pending' },
    { num: '06', id: 'TC-DAN-01', name: 'Persona Switch', category: 'Persona Switch', severity: 'MEDIUM', status: 'Pending' },
    { num: '07', id: 'TC-CTX-01', name: 'Context Manipulation', category: 'Context Manipulation', severity: 'MEDIUM', status: 'Pending' },
    { num: '08', id: 'TC-TOOL-01', name: 'Tool Abuse', category: 'Tool Abuse', severity: 'HIGH', status: 'Pending' },
    { num: '09', id: 'TC-PRIV-01', name: 'Sensitive Data', category: 'Sensitive Data', severity: 'CRITICAL', status: 'Pending' },
    { num: '10', id: 'TC-ENC-01', name: 'Instruction Encoding', category: 'Instruction Encoding', severity: 'MEDIUM', status: 'Pending' }
  ]);

  const filteredQueue = queueItems.filter(item => {
    if (selectedCategory === 'ALL') return true;
    return item.severity === selectedCategory;
  });

  const toggleSelectQueue = (id: string) => {
    setSelectedQueueIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQueueIds.length === filteredQueue.length) {
      setSelectedQueueIds([]);
    } else {
      setSelectedQueueIds(filteredQueue.map(i => i.id));
    }
  };

  const moveQueue = (direction: 'up' | 'down') => {
    if (selectedQueueIds.length === 0) return;
    const newItems = [...queueItems];
    const targetId = selectedQueueIds[0];
    const idx = newItems.findIndex(i => i.id === targetId);
    if (direction === 'up' && idx > 0) {
      const temp = newItems[idx];
      newItems[idx] = newItems[idx - 1];
      newItems[idx - 1] = temp;
    } else if (direction === 'down' && idx < newItems.length - 1) {
      const temp = newItems[idx];
      newItems[idx] = newItems[idx + 1];
      newItems[idx + 1] = temp;
    }
    setQueueItems(newItems);
  };

  const executionLogs = [
    { time: '10:24:31', event: 'Request Sent', type: 'sent', testCase: 'ATK-8F3C98', details: 'Prompt injection attempt', outcome: 'SENT', latency: '12ms' },
    { time: '10:24:32', event: 'Gateway Evaluated', type: 'block', testCase: 'ATK-8F3C98', details: 'Policy v2.6', outcome: 'BLOCKED', latency: '18ms' },
    { time: '10:24:35', event: 'Request Sent', type: 'sent', testCase: 'ATK-7B2A10', details: 'Role confusion test', outcome: 'SENT', latency: '9ms' },
    { time: '10:24:36', event: 'Defense Filtered', type: 'filter', testCase: 'ATK-7B2A10', details: 'Content filter match', outcome: 'FILTERED', latency: '14ms' },
    { time: '10:24:41', event: 'Request Sent', type: 'sent', testCase: 'ATK-5D9E43', details: 'Data exfiltration probe', outcome: 'SENT', latency: '11ms' },
    { time: '10:24:43', event: 'Model Response', type: 'allowed', testCase: 'ATK-5D9E43', details: 'Llama3.2 response received', outcome: 'ALLOWED', latency: '1.2s' },
    { time: '10:24:43', event: 'Outcome Classified', type: 'safe', testCase: 'ATK-5D9E43', details: 'No sensitive data detected', outcome: 'SAFE', latency: '-' },
    { time: '10:24:51', event: 'Request Sent', type: 'sent', testCase: 'ATK-3C8F12', details: 'System prompt extraction', outcome: 'SENT', latency: '10ms' },
    { time: '10:24:52', event: 'Model Refusal', type: 'refuse', testCase: 'ATK-3C8F12', details: 'Refused (safety policy)', outcome: 'REFUSED', latency: '842ms' },
    { time: '10:24:58', event: 'Request Sent', type: 'sent', testCase: 'ATK-9A2D11', details: 'Multi-turn jailbreak', outcome: 'SENT', latency: '13ms' },
    { time: '10:24:59', event: 'Gateway Blocked', type: 'block', testCase: 'ATK-9A2D11', details: 'Regex rule v1.5', outcome: 'BLOCKED', latency: '6ms' },
    { time: '10:25:03', event: 'Request Sent', type: 'sent', testCase: 'ATK-1F7E90', details: 'Tool use boundary test', outcome: 'SENT', latency: '11ms' },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header Row with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Adversarial Operations Center</h1>
          <p className="text-[#585E70] text-xs mt-1">
            Execute adversarial tests, analyze defense responses, and discover security weaknesses.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCampaignStatus('RUNNING')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#DC2626] to-[#EF4444] hover:from-[#EF4444] hover:to-[#F87171] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Start Campaign</span>
          </button>

          <button
            onClick={() => setCampaignStatus('PAUSED')}
            className="px-3.5 py-2 rounded-lg bg-[#15171F] hover:bg-[#191C25] border border-[#20242E] text-[#8C92A4] hover:text-[#F8FAFC] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>

          <button
            onClick={() => setCampaignStatus('IDLE')}
            className="px-3.5 py-2 rounded-lg bg-[#15171F] hover:bg-[#191C25] border border-[#20242E] text-[#8C92A4] hover:text-[#EF4444] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Square className="w-3 h-3 fill-red-500 text-red-500" />
            <span>Stop</span>
          </button>

          <button
            onClick={() => navigate('/red-team/playground')}
            className="px-3.5 py-2 rounded-lg bg-[#15171F] hover:bg-[#191C25] border border-[#EF4444]/50 hover:border-[#EF4444] text-[#F87171] hover:text-[#F8FAFC] text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Authorized Tests</span>
          </button>
        </div>
      </div>

      {/* Top 4 Hero Metric Cards (Image 2 standard format) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Campaigns */}
        <div className="bg-[#15171F] border border-[#20242E] p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden shadow-card hover:border-[#EF4444] transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#2D1217] border border-[#EF4444] text-[#EF4444] flex items-center justify-center shadow-sm">
              <Box className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#8C92A4] flex-1 ml-3">Active Campaigns</span>
          </div>
          <div className="flex items-end justify-between z-10">
            <div>
              <div className="text-3xl font-black text-[#F8FAFC] tracking-tight leading-none">3</div>
              <div className="text-[11px] text-[#585E70] mt-1.5 font-medium">2 running • 1 queued</div>
            </div>
            <Sparkline color="#EF4444" id="red-kpi-1" data={[1, 2, 2, 3, 2, 3, 3]} />
          </div>
        </div>

        {/* Card 2: Tests Executed */}
        <div className="bg-[#15171F] border border-[#20242E] p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden shadow-card hover:border-[#2D3342] transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#1E222D] border border-[#2D3342] text-[#3B82F6] flex items-center justify-center shadow-sm">
              <FlaskConical className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#8C92A4] flex-1 ml-3">Tests Executed</span>
          </div>
          <div className="flex items-end justify-between z-10">
            <div>
              <div className="text-3xl font-black text-[#F8FAFC] tracking-tight leading-none">128</div>
              <div className="text-[11px] text-[#10B981] mt-1.5 font-medium">+12% from last week</div>
            </div>
            <Sparkline color="#10B981" id="red-kpi-2" data={[30, 45, 60, 75, 90, 110, 128]} />
          </div>
        </div>

        {/* Card 3: Gateway Blocked */}
        <div className="bg-[#15171F] border border-[#20242E] p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden shadow-card hover:border-[#F59E0B] transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#271D09] border border-[#F59E0B] text-[#F59E0B] flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#8C92A4] flex-1 ml-3">Gateway Blocked</span>
          </div>
          <div className="flex items-end justify-between z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-[#F8FAFC] tracking-tight leading-none">67</span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-[#2B1D08] text-[#F59E0B] border border-[#F59E0B]/30 font-mono">
                  52.3%
                </span>
              </div>
              <div className="text-[11px] text-[#585E70] mt-1.5 font-medium">Blocked by zero-trust gateway</div>
            </div>
            <Sparkline color="#F59E0B" id="red-kpi-3" data={[20, 28, 35, 48, 52, 60, 67]} />
          </div>
        </div>

        {/* Card 4: Potential Bypasses */}
        <div className="bg-[#15171F] border border-[#20242E] p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden shadow-card hover:border-[#EF4444] transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-[#2D1217] border border-[#EF4444] text-[#EF4444] flex items-center justify-center shadow-sm">
              <Target className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#8C92A4] flex-1 ml-3">Potential Bypasses</span>
          </div>
          <div className="flex items-end justify-between z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-[#F8FAFC] tracking-tight leading-none">9</span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-[#2D1217] text-[#EF4444] border border-[#EF4444]/30 font-mono">
                  7.0%
                </span>
              </div>
              <div className="text-[11px] text-[#585E70] mt-1.5 font-medium">Requires review • 4/4 Workers online</div>
            </div>
            <Sparkline color="#EF4444" id="red-kpi-4" data={[2, 3, 4, 3, 6, 7, 9]} />
          </div>
        </div>
      </div>

      {/* Main Workspace (Spacious Balanced 2-Column Grid: 7 cols & 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Column 1: Campaign Attack Queue (7 cols) */}
        <div className="lg:col-span-7 bg-[#15171F] border border-[#20242E] rounded-xl p-5 shadow-card flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#20242E]">
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-[#EF4444]" />
                <span className="text-sm font-bold text-[#F8FAFC]">Campaign Attack Queue</span>
              </div>
              <span className="text-xs font-mono font-bold text-[#F87171] bg-[#2D1217] border border-[#5A1A24] px-2.5 py-0.5 rounded-full">
                28 test cases
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mt-3.5 pb-2 overflow-x-auto text-xs font-mono font-medium">
              {[
                { label: 'All (28)', val: 'ALL' },
                { label: 'Critical (6)', val: 'CRITICAL' },
                { label: 'High (9)', val: 'HIGH' },
                { label: 'Medium (8)', val: 'MEDIUM' },
                { label: 'Low (5)', val: 'LOW' },
              ].map(tab => (
                <button
                  key={tab.val}
                  onClick={() => setSelectedCategory(tab.val)}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer text-xs ${
                    selectedCategory === tab.val
                      ? 'bg-gradient-to-r from-[#5A1A24] to-[#7F1D1D] text-white font-bold border border-[#EF4444] shadow-sm'
                      : 'bg-[#12141A] text-[#8C92A4] hover:text-[#F8FAFC] hover:bg-[#1D212C] border border-[#20242E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-mono text-[#585E70] font-bold uppercase bg-[#12141A] rounded-lg mt-2">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedQueueIds.length === filteredQueue.length && filteredQueue.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded bg-[#111319] border-[#20242E] text-[#EF4444] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
              </div>
              <div className="col-span-1">#</div>
              <div className="col-span-4">TEST CASE</div>
              <div className="col-span-4">CATEGORY</div>
              <div className="col-span-2 text-right">STATUS</div>
            </div>

            {/* Queue List Rows */}
            <div className="mt-2 space-y-1.5 max-h-[420px] overflow-y-auto pr-1 text-xs font-mono">
              {filteredQueue.map((item) => {
                const isSelected = selectedQueueIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelectQueue(item.id)}
                    className={`grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2D1217] border-[#EF4444] text-[#F8FAFC]'
                        : 'bg-[#12141A]/60 border-[#20242E] hover:bg-[#191C25] hover:border-[#1E4870] text-[#F0F2F6]'
                    }`}
                  >
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded bg-[#111319] border-[#20242E] text-[#EF4444] focus:ring-0 w-3.5 h-3.5 pointer-events-none"
                      />
                    </div>
                    <div className="col-span-1 text-xs text-[#585E70]">{item.num}</div>
                    <div className="col-span-4 font-semibold text-xs truncate text-[#F8FAFC]">
                      {item.id}
                    </div>
                    <div className="col-span-4 text-xs text-[#8C92A4] truncate">
                      {item.name}
                    </div>
                    <div className="col-span-2 text-right">
                      {item.status === 'Running' ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#1E222D] text-[#3B82F6] border border-[#2D3342]/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse"></span>
                          Running
                        </span>
                      ) : (
                        <span className="text-xs text-[#585E70] font-medium">Pending</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3.5 mt-3 border-t border-[#20242E] flex items-center justify-between text-xs font-mono">
            <span className="text-xs text-[#585E70]">
              {selectedQueueIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => moveQueue('up')}
                className="px-3 py-1.5 rounded-lg bg-[#12141A] hover:bg-[#191C25] text-[#8C92A4] hover:text-[#F8FAFC] text-xs flex items-center gap-1.5 border border-[#20242E] cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" /> Move Up
              </button>
              <button
                onClick={() => moveQueue('down')}
                className="px-3 py-1.5 rounded-lg bg-[#12141A] hover:bg-[#191C25] text-[#8C92A4] hover:text-[#F8FAFC] text-xs flex items-center gap-1.5 border border-[#20242E] cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" /> Move Down
              </button>
              <button
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#DC2626] to-[#EF4444] hover:from-[#EF4444] hover:to-[#F87171] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Play className="w-3 h-3 fill-white" /> Run Selected ({selectedQueueIds.length})
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: Live Attack Execution Stream (5 cols) */}
        <div className="lg:col-span-5 bg-[#15171F] border border-[#20242E] rounded-xl p-5 shadow-card flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#20242E]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#EF4444] animate-pulse" />
                <span className="text-sm font-bold text-[#F8FAFC]">Live Attack Execution Stream</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0D2820] text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping"></span>
                  Live
                </span>
              </div>
              <div className="relative">
                <select
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="bg-[#12141A] border border-[#20242E] text-xs font-mono text-[#8C92A4] rounded-lg px-2.5 py-1 pr-6 appearance-none cursor-pointer"
                >
                  <option value="ALL">All Events</option>
                  <option value="BLOCKED">Blocked Only</option>
                  <option value="FILTERED">Filtered Only</option>
                  <option value="ALLOWED">Allowed Only</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#585E70] absolute right-2 top-2 pointer-events-none" />
              </div>
            </div>

            {/* Stream Table Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-mono text-[#585E70] font-bold uppercase bg-[#12141A] rounded-lg mt-2">
              <div className="col-span-2">TIME</div>
              <div className="col-span-4">EVENT</div>
              <div className="col-span-3">TEST CASE</div>
              <div className="col-span-3 text-right">OUTCOME</div>
            </div>

            {/* Execution Stream Rows */}
            <div className="mt-2 space-y-1.5 max-h-[320px] overflow-y-auto pr-1 text-xs font-mono">
              {executionLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg bg-[#12141A]/60 border border-[#20242E] hover:bg-[#191C25] text-xs transition-all"
                >
                  <div className="col-span-2 text-xs text-[#585E70]">{log.time}</div>
                  <div className="col-span-4 flex items-center gap-1.5 font-medium truncate text-[#F8FAFC]">
                    {log.type === 'sent' && <ArrowUpRight className="w-3.5 h-3.5 text-[#10B981] shrink-0" />}
                    {log.type === 'block' && <Shield className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />}
                    {log.type === 'filter' && <Filter className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />}
                    {log.type === 'allowed' && <Check className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />}
                    {log.type === 'safe' && <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />}
                    {log.type === 'refuse' && <X className="w-3.5 h-3.5 text-[#6366F1] shrink-0" />}
                    <span className="truncate">{log.event}</span>
                  </div>
                  <div className="col-span-3 font-bold text-xs text-[#3B82F6] truncate">
                    {log.testCase}
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.outcome === 'BLOCKED' ? 'bg-[#2D1217] text-[#EF4444] border border-[#EF4444]/30' :
                      log.outcome === 'FILTERED' ? 'bg-[#2B1D08] text-[#F59E0B] border border-[#F59E0B]/30' :
                      log.outcome === 'ALLOWED' ? 'bg-[#0D2820] text-[#10B981] border border-[#10B981]/30' :
                      log.outcome === 'REFUSED' ? 'bg-[#1E1B38] text-[#6366F1] border border-[#6366F1]/30' :
                      log.outcome === 'SAFE' ? 'bg-[#1E222D] text-[#3B82F6] border border-[#2D3342]/30' :
                      'bg-[#12141A] text-[#8C92A4] border border-[#20242E]'
                    }`}>
                      {log.outcome}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Outcome Distribution Breakdown Bars */}
          <div className="pt-3.5 border-t border-[#20242E] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-[#8C92A4]">
              <span className="font-bold text-[#F8FAFC]">Outcome Distribution</span>
              <span className="text-[11px] text-[#585E70]">Last 24 Hours</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {/* Gateway Blocked */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-[#EF4444]">
                    <Shield className="w-3 h-3" /> Gateway Blocked
                  </span>
                  <span className="font-bold text-[#F8FAFC]">67.8% (87)</span>
                </div>
                <div className="h-1.5 w-full bg-[#12141A] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#DC2626] to-[#EF4444] w-[67.8%] rounded-full shadow-[0_0_6px_#EF4444]"></div>
                </div>
              </div>

              {/* Defense Filtered */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-[#F59E0B]">
                    <Filter className="w-3 h-3" /> Defense Filtered
                  </span>
                  <span className="font-bold text-[#F8FAFC]">18.7% (24)</span>
                </div>
                <div className="h-1.5 w-full bg-[#12141A] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] w-[18.7%] rounded-full shadow-[0_0_6px_#F59E0B]"></div>
                </div>
              </div>

              {/* Potential Bypass */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-[#F87171]">
                    <Target className="w-3 h-3" /> Potential Bypass
                  </span>
                  <span className="font-bold text-[#F8FAFC]">7.0% (9)</span>
                </div>
                <div className="h-1.5 w-full bg-[#12141A] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#B91C1C] to-[#EF4444] w-[7.0%] rounded-full shadow-[0_0_6px_#EF4444]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section (Execution Activity Timeline + Sandbox Integrity & Resource Usage) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Execution Activity Timeline (Left 7 cols) */}
        <div className="lg:col-span-7 bg-[#15171F] border border-[#20242E] rounded-xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#20242E]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#EF4444]" />
                <span className="text-sm font-bold text-[#F8FAFC]">Execution Activity Timeline</span>
              </div>
              <button
                onClick={() => navigate('/red-team/timeline')}
                className="text-xs font-mono text-[#F87171] hover:underline flex items-center gap-1 cursor-pointer"
              >
                View Full Timeline <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Stepper Pipeline */}
            <div className="py-6 px-3">
              <div className="relative flex items-center justify-between">
                {/* Connecting Background Line */}
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gradient-to-r from-[#EF4444] via-[#F59E0B] via-[#3B82F6] to-[#10B981] -translate-y-1/2 opacity-30 z-0"></div>

                {[
                  { label: 'Request Sent', time: '10:24:31', icon: Send, color: '#EF4444', bg: '#2D1217' },
                  { label: 'Gateway Check', time: '10:24:32', icon: Shield, color: '#EF4444', bg: '#2D1217' },
                  { label: 'Defense Filter', time: '10:24:32', icon: Filter, color: '#F59E0B', bg: '#271D09' },
                  { label: 'Model Inference', time: '10:24:33', icon: Cpu, color: '#3B82F6', bg: '#1E222D' },
                  { label: 'Response Received', time: '10:24:34', icon: MessageSquare, color: '#3B82F6', bg: '#1E222D' },
                  { label: 'Outcome Class', time: '10:24:34', icon: CheckCircle2, color: '#10B981', bg: '#0D2820' },
                  { label: 'Evidence Recorded', time: '10:24:34', icon: Database, color: '#3B82F6', bg: '#1E222D' },
                ].map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="relative z-10 flex flex-col items-center group cursor-pointer">
                      <div
                        className="w-8 h-8 rounded-full border flex items-center justify-center transition-all group-hover:scale-110 shadow-md"
                        style={{ backgroundColor: step.bg, borderColor: step.color, color: step.color }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-[#F0F2F6] mt-2 font-mono text-center">
                        {step.label}
                      </span>
                      <span className="text-[9px] text-[#585E70] font-mono">
                        {step.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Findings Preview Below Timeline */}
            <div className="pt-3 border-t border-[#20242E]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#F8FAFC]">Recent Security Findings</span>
                <button
                  onClick={() => navigate('/red-team/findings')}
                  className="text-xs font-mono text-[#F87171] hover:underline"
                >
                  View All (3)
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div
                  onClick={() => navigate('/red-team/findings')}
                  className="p-3 rounded-lg bg-[#12141A] border border-[#EF4444]/40 hover:border-[#EF4444] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-[#F87171]">FIND-2026-001</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#2D1217] text-[#EF4444] border border-[#EF4444]/30">
                      CRITICAL
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8C92A4] mt-1.5 line-clamp-2">
                    Multi-lingual delimiter bypass succeeded on raw llama3.2.
                  </p>
                </div>

                <div
                  onClick={() => navigate('/red-team/findings')}
                  className="p-3 rounded-lg bg-[#12141A] border border-[#F59E0B]/40 hover:border-[#F59E0B] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-[#F59E0B]">FIND-2026-002</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#2B1D08] text-[#F59E0B] border border-[#F59E0B]/30">
                      HIGH
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8C92A4] mt-1.5 line-clamp-2">
                    Canary leakage under code interpreter framing.
                  </p>
                </div>

                <div
                  onClick={() => navigate('/red-team/findings')}
                  className="p-3 rounded-lg bg-[#12141A] border border-[#2D3342]/40 hover:border-[#2D3342] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-[#3B82F6]">FIND-2026-003</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1E222D] text-[#3B82F6] border border-[#2D3342]/30">
                      MEDIUM
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8C92A4] mt-1.5 line-clamp-2">
                    Context window manipulation partially exposed system prompt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sandbox Integrity & Resource Usage (Right 5 cols - Image 2 format) */}
        <div className="lg:col-span-5 bg-[#15171F] border border-[#20242E] rounded-xl p-5 shadow-card flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#20242E]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                <span className="text-sm font-bold text-[#F8FAFC]">Sandbox Integrity & Resources</span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#10B981] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                All Systems Nominal
              </span>
            </div>

            {/* 3 Circular Gauges (CPU, Memory, Disk) exactly like Image 2 */}
            <div className="flex items-center justify-around py-4">
              {/* CPU Gauge */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#1E222D]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#10B981]"
                      strokeDasharray="32, 100"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-xs font-mono font-bold text-[#F8FAFC]">32%</span>
                </div>
                <span className="text-xs font-mono font-medium text-[#585E70] mt-2">CPU</span>
              </div>

              {/* Memory Gauge */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#1E222D]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#3B82F6]"
                      strokeDasharray="48, 100"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-xs font-mono font-bold text-[#F8FAFC]">48%</span>
                </div>
                <span className="text-xs font-mono font-medium text-[#585E70] mt-2">Memory</span>
              </div>

              {/* Disk Gauge */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#1E222D]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#F59E0B]"
                      strokeDasharray="62, 100"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-xs font-mono font-bold text-[#F8FAFC]">62%</span>
                </div>
                <span className="text-xs font-mono font-medium text-[#585E70] mt-2">Disk</span>
              </div>
            </div>

            {/* Sandbox Status Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-3 border-t border-[#20242E]">
              <div className="p-2.5 rounded-lg bg-[#12141A] border border-[#20242E]">
                <div className="text-[#585E70] text-[10px]">Gateway v2.6.1</div>
                <div className="text-[#10B981] font-bold mt-0.5">Online</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#12141A] border border-[#20242E]">
                <div className="text-[#585E70] text-[10px]">Isolated Target</div>
                <div className="text-[#3B82F6] font-bold mt-0.5">llama3.2 Running</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#12141A] border border-[#20242E]">
                <div className="text-[#585E70] text-[10px]">Evidence Ledger</div>
                <div className="text-[#10B981] font-bold mt-0.5">1,248 records</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#12141A] border border-[#20242E]">
                <div className="text-[#585E70] text-[10px]">Network Isolation</div>
                <div className="text-[#10B981] font-bold mt-0.5">red_net Active</div>
              </div>
            </div>
          </div>

          {/* Rate Limit Bar */}
          <div className="pt-3 border-t border-[#20242E]">
            <div className="flex items-center justify-between text-xs font-mono text-[#8C92A4] mb-1.5">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#3B82F6]" /> Global Rate Limit: 60 req/min
              </span>
              <span className="font-bold text-[#F8FAFC]">16 / 60 (27%)</span>
            </div>
            <div className="h-1.5 w-full bg-[#12141A] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#1E283C] to-[#3B82F6] w-[27%] rounded-full shadow-[0_0_6px_#3B82F6]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
