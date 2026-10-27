import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShieldAlert, ShieldCheck, Filter,
  Play, History, BarChart3, Crosshair, FileCheck,
  BookOpen, Activity, Shield, LogOut, ChevronDown,
  Bell, Lock
} from 'lucide-react';
import { UserProfile, Evaluation } from '../types';

interface BlueTeamLayoutProps {
  currentUser: UserProfile;
  onLogout: () => void;
  evaluations: Evaluation[];
  selectedEvalId: string;
  onSelectEval: (id: string) => void;
}

export const BlueTeamLayout: React.FC<BlueTeamLayoutProps> = ({
  currentUser,
  onLogout,
  evaluations,
  selectedEvalId,
  onSelectEval,
}) => {
  const navigate = useNavigate();

  const navItems = [
    { to: '/blue-team/overview', label: 'Defense Overview', icon: LayoutDashboard },
    { to: '/blue-team/alerts', label: 'Live Alerts', icon: ShieldAlert },
    { to: '/blue-team/policies', label: 'Defense Policies', icon: ShieldCheck },
    { to: '/blue-team/rules', label: 'Detection Rules', icon: Filter },
    { to: '/blue-team/simulator', label: 'Policy Simulator', icon: Play },
    { to: '/blue-team/deployments', label: 'Deployment History', icon: History },
    { to: '/blue-team/regression', label: 'Regression Results', icon: BarChart3 },
    { to: '/blue-team/threat-intel', label: 'Threat Intelligence', icon: Crosshair },
    { to: '/blue-team/evidence', label: 'Evidence Monitor', icon: FileCheck },
    { to: '/blue-team/playbooks', label: 'Response Playbooks', icon: BookOpen },
    { to: '/blue-team/health', label: 'System Health', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#0C0D11] text-[#F0F2F6] flex flex-col font-sans selection:bg-[#10B981] selection:text-[#0C0D11]">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-[#101217] border-b border-[#124B37] flex items-center justify-between px-6 z-30 sticky top-0">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0D2820] border border-[#10B981] flex items-center justify-center shadow-sm text-[#10B981]">
            <Shield className="w-5 h-5 fill-[#10B981]/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-lg tracking-wider text-[#F0F2F6]">BASTIONLOOP</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#12382C] text-[#10B981] border border-[#124B37] font-bold">
                BLUE TEAM DEFENSE
              </span>
            </div>
            <p className="text-[11px] text-[#585E70] hidden sm:block">Platform Governance, RBAC & Test Verification</p>
          </div>
        </div>

        {/* Evaluation Context Selector & Actions */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={selectedEvalId}
              onChange={(e) => onSelectEval(e.target.value)}
              className="bg-[#12141A] border border-[#124B37] hover:border-[#10B981] text-xs font-mono font-medium text-[#F0F2F6] rounded-lg px-3.5 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[#10B981] appearance-none cursor-pointer shadow-inner min-w-[280px] max-w-[420px] truncate"
            >
              {evaluations.map((ev) => (
                <option key={ev.id} value={ev.id} className="bg-[#12141A] text-[#F0F2F6]">
                  {ev.id} — {ev.project_name} ({ev.target_model})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#10B981] absolute right-3 top-3 pointer-events-none" />
          </div>

          <button
            onClick={() => navigate('/blue-team/policies')}
            className="px-3.5 py-2 rounded-lg bg-[#0D2820] hover:bg-[#12382C] border border-[#10B981] text-[#10B981] hover:text-[#F0F2F6] text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>DEFENSIVE OPERATIONS</span>
          </button>

          {/* Notification Icon */}
          <div className="relative p-2 rounded-lg bg-[#12141A] border border-[#124B37] text-[#91B8A7] hover:text-white cursor-pointer transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-[9px] font-bold text-white flex items-center justify-center border border-[#101217]">
              4
            </span>
          </div>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-3 pl-3 border-l border-[#124B37]">
            <div className="w-8 h-8 rounded-full bg-[#10B981] text-[#0C0D11] font-bold text-xs flex items-center justify-center shadow-sm">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-[#F0F2F6] font-mono leading-none">{currentUser.username}</div>
              <div className="text-[10px] text-[#10B981] font-bold font-mono mt-0.5">Blue Team</div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 text-[#585E70] hover:text-[#EF4444] hover:bg-[#2D1217] rounded-lg border border-transparent hover:border-[#EF4444]/40 transition-all cursor-pointer ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 bg-[#101217] border-r border-[#124B37] flex flex-col justify-between p-4 flex-shrink-0 overflow-y-auto">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#585E70] font-bold px-3">
                BLUE TEAM WORKSPACE
              </span>
              <nav className="mt-2.5 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-[#063321] to-[#134E3C] text-[#FFFFFF] font-bold border border-[#10B981] shadow-sm'
                            : 'text-[#91B8A7] hover:text-[#F0F2F6] hover:bg-[#12382C] hover:border hover:border-[#124B37]'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0 text-[#10B981]" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Defense Status Card */}
            <div className="p-3.5 rounded-xl bg-[#0D2820] border border-[#124B37] text-xs space-y-1.5 font-mono shadow-card">
              <div className="text-[10px] uppercase text-[#585E70] font-bold">DEFENSE STATUS</div>
              <div className="flex items-center gap-2 pt-0.5">
                <div className="w-7 h-7 rounded-lg bg-[#12382C] border border-[#10B981]/40 flex items-center justify-center text-[#10B981]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[#F0F2F6] font-bold text-xs leading-none">Active & Enforcing</div>
                  <div className="text-[10px] text-[#10B981] mt-0.5">12 Policies · v2.1.0</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#124B37] text-[11px] font-mono space-y-1">
            <div className="text-[#585E70]">BastionLoop Defense Studio v1.0</div>
            <div className="text-[#10B981] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              All Defenses Active
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-[#0E1520] p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
