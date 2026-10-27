import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Flame, BookOpen, Swords, Clock,
  ShieldAlert, Database, FileText, Server, LogOut,
  ChevronDown, Bell, Shield, Globe, Radio
} from 'lucide-react';
import { UserProfile, Evaluation } from '../types';

interface RedTeamLayoutProps {
  currentUser: UserProfile;
  onLogout: () => void;
  evaluations: Evaluation[];
  selectedEvalId: string;
  onSelectEval: (id: string) => void;
}

export const RedTeamLayout: React.FC<RedTeamLayoutProps> = ({
  currentUser,
  onLogout,
  evaluations,
  selectedEvalId,
  onSelectEval,
}) => {
  const navigate = useNavigate();

  const navItems = [
    { to: '/red-team/dashboard', label: 'Attack Dashboard', icon: LayoutDashboard },
    { to: '/red-team/campaigns', label: 'Campaigns', icon: Flame },
    { to: '/red-team/library', label: 'Test Library', icon: BookOpen },
    { to: '/red-team/playground', label: 'Attack Playground', icon: Swords },
    { to: '/red-team/timeline', label: 'Execution Timeline', icon: Clock },
    { to: '/red-team/findings', label: 'Findings', icon: ShieldAlert },
    { to: '/red-team/vault', label: 'Payload Vault', icon: Database },
    { to: '/red-team/reports', label: 'Evaluation Reports', icon: FileText },
    { to: '/red-team/sandbox', label: 'Sandbox Status', icon: Server },
  ];

  const currentEval = evaluations.find(e => e.id === selectedEvalId) || evaluations[0];

  return (
    <div className="min-h-screen bg-[#06080d] text-[#e2e8f0] flex flex-col font-sans selection:bg-[#ef4444] selection:text-white">
      {/* Top Header Navbar */}
      <header className="h-16 bg-[#07090e] border-b border-[#1f141b] flex items-center justify-between px-5 z-30 sticky top-0">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-[#2a0b12] to-[#120508] border border-[#ef4444]/60 flex items-center justify-center shadow-sm text-[#ef4444]">
            <Shield className="w-5 h-5 fill-[#ef4444]/20 text-[#ef4444]" />
            <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-red-500/20 pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-black text-lg tracking-wider text-white">BASTIONLOOP</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#1c080d] text-[#ff3355] border border-[#ff3355]/40 font-bold tracking-wider">
                RED TEAM OPERATIONS
              </span>
            </div>
            <p className="text-[11px] text-[#78859b] font-medium hidden sm:block leading-tight">
              Adversarial AI Safety & Exploit Testing Lab
            </p>
          </div>
        </div>

        {/* Center: Evaluation Selector & Right Profile/Status */}
        <div className="flex items-center gap-3.5">
          {/* Active Evaluation Context Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedEvalId}
              onChange={(e) => onSelectEval(e.target.value)}
              className="bg-[#0b0f19] border border-[#221620] hover:border-[#ef4444]/60 text-xs font-mono font-medium text-[#d4dde8] rounded-lg pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#ef4444] appearance-none cursor-pointer shadow-inner min-w-[280px] md:min-w-[360px] max-w-[440px] truncate transition-colors"
            >
              {evaluations.length > 0 ? (
                evaluations.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-[#0b0f19] text-[#e2e8f0]">
                    {ev.id} — {ev.project_name} ({ev.target_model})
                  </option>
                ))
              ) : (
                <option value="BL-2026-89835" className="bg-[#0b0f19] text-[#e2e8f0]">
                  BL-2026-89835 — Llama-3.2 Safety Benchmark '26 (llama3.2)
                </option>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-[#8a96a8] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Sandbox Health Indicator */}
          <div className="hidden lg:flex items-center gap-2.5 bg-[#0b0f19] border border-[#17212f] px-3.5 py-1.5 rounded-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
            </span>
            <div className="text-left leading-tight">
              <div className="text-xs font-semibold text-white">Sandbox Online</div>
              <div className="text-[10px] text-[#78859b]">4/4 workers healthy</div>
            </div>
          </div>

          {/* Notification Icon */}
          <div className="relative p-2 rounded-lg bg-[#0b0f19] border border-[#221620] text-[#8C92A4] hover:text-white cursor-pointer transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ef4444] text-[9px] font-bold text-white flex items-center justify-center border border-[#07090e]">
              3
            </span>
          </div>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-[#1f141b]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#dc2626] to-[#ef4444] text-white font-bold text-xs flex items-center justify-center shadow-sm ring-1 ring-red-400/30">
              {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'R'}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-white font-mono leading-none">
                {currentUser.username || 'red_operator'}
              </div>
              <div className="text-[10px] text-[#ef4444] font-bold font-mono mt-0.5">Red Team</div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-[#585E70] hover:text-[#ef4444] hover:bg-[#1a080d] rounded-lg border border-transparent hover:border-[#ef4444]/40 transition-all cursor-pointer ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-60 bg-[#07090e] border-r border-[#1f141b] flex flex-col justify-between p-3.5 flex-shrink-0 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#585E70] font-bold px-2">
                RED TEAM WORKSPACE
              </span>
              <nav className="mt-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-[#2D1217] to-[#1a070c] text-white font-semibold border border-[#ef4444] shadow-sm'
                            : 'text-[#8c9baeff] hover:text-white hover:bg-[#0f1420] hover:border hover:border-[#1f141b]'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0 text-[#ef4444]" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Operation Status Card */}
            <div className="p-3 rounded-xl bg-[#0b0f19] border border-[#1f141b] space-y-2 font-mono shadow-sm">
              <span className="text-[10px] font-bold text-[#585E70] uppercase tracking-wider">
                OPERATION STATUS
              </span>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#2D1217] border border-[#ef4444]/40 flex items-center justify-center text-[#ef4444] shrink-0">
                  <Globe className="w-4 h-4 text-[#ef4444]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-[#ef4444] leading-tight">Active Campaign</div>
                  <div className="text-xs font-semibold text-white truncate">Prompt Injection Suite</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Running • 85.7% complete
                  </div>
                </div>
              </div>

              {/* Status Telemetry List */}
              <div className="pt-2 border-t border-[#17212f] space-y-1.5 text-[10px]">
                <div className="flex items-center gap-2 text-[#8C92A4]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Gateway Connected</span>
                </div>
                <div className="flex items-center gap-2 text-[#8C92A4]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Target Sandbox (llama3.2)</span>
                </div>
                <div className="flex items-center gap-2 text-[#8C92A4]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Evidence Ledger</span>
                </div>
                <div className="flex items-center gap-2 text-[#8C92A4]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Telemetry Streaming</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1f141b] text-[10px] font-mono space-y-0.5 text-[#585E70]">
            <div className="text-[#8c9baeff] font-medium">BastionLoop Red Team v1.0</div>
            <div>Restricted Use • Authorized Testing Only</div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-[#06080d] p-5 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
