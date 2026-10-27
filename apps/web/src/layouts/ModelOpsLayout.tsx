import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Cpu, Layers, Activity, HeartPulse, Lock,
  Bug, Play, LogOut, ChevronDown, RotateCcw, Shield
} from 'lucide-react';
import { UserProfile, Evaluation } from '../types';

interface ModelOpsLayoutProps {
  currentUser: UserProfile;
  onLogout: () => void;
  evaluations: Evaluation[];
  selectedEvalId: string;
  onSelectEval: (id: string) => void;
}

export const ModelOpsLayout: React.FC<ModelOpsLayoutProps> = ({
  currentUser,
  onLogout,
  evaluations,
  selectedEvalId,
  onSelectEval,
}) => {
  const navigate = useNavigate();

  const navItems = [
    { to: '/model-ops/playground', label: 'Model Playground', icon: Cpu },
    { to: '/model-ops/models', label: 'Providers & Models', icon: Layers },
    { to: '/model-ops/traces', label: 'Inference Traces', icon: Activity },
    { to: '/model-ops/health', label: 'Runtime Health', icon: HeartPulse },
    { to: '/model-ops/sessions', label: 'Session Isolation', icon: Lock },
    { to: '/model-ops/contamination', label: 'Contamination Checks', icon: Bug },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Model Ops Top Navbar */}
      <header className="h-16 bg-white border-b border-purple-100 flex items-center justify-between px-6 z-30 sticky top-0 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-md shadow-purple-500/25 text-white">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base tracking-wider text-slate-900">BASTIONLOOP</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 font-bold">
                MODEL OPERATOR LAB
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Target LLM Sandboxing & Context Lifecycle</p>
          </div>
        </div>

        {/* Evaluation Selector & Run Model Test CTA */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedEvalId}
              onChange={(e) => onSelectEval(e.target.value)}
              className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-mono font-medium text-slate-800 rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer"
            >
              {evaluations.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.id} — {ev.project_name} ({ev.target_model})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <button
            onClick={() => navigate('/model-ops/playground')}
            className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>RUN MODEL TEST</span>
          </button>
        </div>

        {/* User Info & Sign Out */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900 font-mono">{currentUser.username}</div>
            <div className="text-[10px] text-purple-700 font-bold font-mono">MODEL OPERATOR</div>
          </div>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1">
        {/* Left Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)] shadow-subtle flex-shrink-0">
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-800 font-bold px-3">
                MODEL RUNTIME LAB
              </span>
              <nav className="mt-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 text-purple-600" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Runtime Isolation Card */}
            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs space-y-1.5 font-mono">
              <div className="flex items-center gap-1.5 text-purple-800 font-bold text-[11px]">
                <Lock className="w-3.5 h-3.5 text-purple-600" />
                <span>SESSION ISOLATION</span>
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                Volatile context destroyed across evaluations to prevent canary contamination leakage.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 text-center text-[10px] font-mono text-slate-500">
            BastionLoop Model Lab v1.0
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
