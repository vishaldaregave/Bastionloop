import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Key, FolderKanban, Server,
  FileText, ShieldCheck, Gauge, Award, LogOut, ChevronDown,
  Shield, Lock, Bell, Settings
} from 'lucide-react';
import { UserProfile, Evaluation } from '../types';

interface AdminLayoutProps {
  currentUser: UserProfile;
  onLogout: () => void;
  evaluations: Evaluation[];
  selectedEvalId: string;
  onSelectEval: (id: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  onLogout,
  evaluations,
  selectedEvalId,
  onSelectEval,
}) => {
  const navigate = useNavigate();

  const navItems = [
    { to: '/admin/overview', label: 'Platform Overview', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users & Teams', icon: Users },
    { to: '/admin/rbac', label: 'Roles & Permissions', icon: Key },
    { to: '/admin/evaluations', label: 'Evaluations', icon: FolderKanban },
    { to: '/admin/infrastructure', label: 'Sandbox Topology', icon: Server },
    { to: '/admin/audit', label: 'Audit Logs', icon: FileText },
    { to: '/admin/evidence', label: 'Evidence Verification', icon: ShieldCheck },
    { to: '/admin/governor', label: 'Resource Governance', icon: Gauge },
    { to: '/admin/passport', label: 'Trust Passport', icon: Award },
    { to: '/admin/settings', label: 'System Settings', icon: Settings },
  ];

  const selectedEval = evaluations.find(e => e.id === selectedEvalId) || evaluations[0];

  return (
    <div className="min-h-screen bg-[#0C0D11] text-[#F0F2F6] flex flex-col font-sans selection:bg-[#2563EB] selection:text-white">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-[#111319] border-b border-[#20242E] flex items-center justify-between px-6 z-30 sticky top-0">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#15171F] border border-[#2D3342] flex items-center justify-center shadow-sm text-[#3B82F6]">
            <Shield className="w-5 h-5 fill-[#3B82F6]/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-lg tracking-wider text-[#F8FAFC]">BASTIONLOOP</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#191C25] text-[#60A5FA] border border-[#2563EB] font-bold">
                ADMIN CONTROL PLANE
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
              className="bg-[#12141A] border border-[#20242E] hover:border-[#2D3342] text-xs font-mono font-medium text-[#F0F2F6] rounded-lg px-3.5 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[#2D3342] appearance-none cursor-pointer shadow-inner min-w-[280px] max-w-[420px] truncate"
            >
              {evaluations.map((ev) => (
                <option key={ev.id} value={ev.id} className="bg-[#12141A] text-[#F0F2F6]">
                  {ev.id} — {ev.project_name} ({ev.target_model})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#60A5FA] absolute right-3 top-3 pointer-events-none" />
          </div>

          <button
            onClick={() => navigate('/admin/infrastructure')}
            className="px-3.5 py-2 rounded-lg bg-[#15171F] hover:bg-[#191C25] border border-[#2D3342] text-[#60A5FA] hover:text-[#F0F2F6] text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>MANAGE PLATFORM SECURITY</span>
          </button>

          {/* Notification Icon */}
          <div className="relative p-2 rounded-lg bg-[#12141A] border border-[#20242E] text-[#8C92A4] hover:text-white cursor-pointer transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-[9px] font-bold text-white flex items-center justify-center border border-[#111319]">
              2
            </span>
          </div>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-3 pl-3 border-l border-[#20242E]">
            <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-[#F8FAFC] font-mono leading-none">{currentUser.username}</div>
              <div className="text-[10px] text-[#60A5FA] font-bold font-mono mt-0.5">Administrator</div>
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
        <aside className="w-64 bg-[#101217] border-r border-[#20242E] flex flex-col justify-between p-4 flex-shrink-0 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#585E70] font-bold px-3">
                GOVERNANCE WORKSPACE
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
                            ? 'bg-gradient-to-r from-[#1E283C] to-[#2D3342] text-[#FFFFFF] font-bold border border-[#3B82F6] shadow-sm'
                            : 'text-[#8C92A4] hover:text-[#F0F2F6] hover:bg-[#1D212C] hover:border hover:border-[#20242E]'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Root of Trust Card */}
            <div className="p-3.5 rounded-xl bg-[#15171F] border border-[#20242E] text-xs space-y-1.5 font-mono shadow-card">
              <div className="flex items-center gap-1.5 text-[#60A5FA] font-bold text-[11px]">
                <Lock className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>ROOT OF TRUST</span>
              </div>
              <p className="text-[10px] text-[#585E70] leading-relaxed">
                Platform-wide Merkle evidence verification and container capability enforcement.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#20242E] text-[11px] font-mono space-y-1">
            <div className="text-[#585E70]">BastionLoop Control Plane v1.0</div>
            <div className="text-[#10B981] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              All Systems Operational
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-[#0C0D11] p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
