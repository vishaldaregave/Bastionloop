import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, Lock, LogOut, User, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Role, Evaluation, UserProfile } from '../types';

interface NavbarProps {
  currentUser: UserProfile;
  onLogout: () => void;
  evaluations: Evaluation[];
  selectedEvalId: string;
  onSelectEval: (id: string) => void;
  chainValid: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  evaluations,
  selectedEvalId,
  onSelectEval,
  chainValid,
}) => {
  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'RED_TEAM':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'BLUE_TEAM':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'MODEL_OPERATOR':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 sticky top-0 shadow-subtle">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-base tracking-wider text-slate-900">BASTIONLOOP</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
              ZERO-TRUST LAB
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">Trust the Test — AI Safety Infrastructure</p>
        </div>
      </div>

      {/* Central Active Evaluation Selector */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-slate-500 font-mono font-semibold hidden md:inline">EVALUATION:</span>
        <div className="relative">
          <select
            value={selectedEvalId}
            onChange={(e) => onSelectEval(e.target.value)}
            className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-mono font-medium text-slate-800 rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-sm"
          >
            {evaluations.length === 0 ? (
              <option value="">No evaluations available</option>
            ) : (
              evaluations.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.id} — {ev.project_name} ({ev.target_model})
                </option>
              ))
            )}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Right Controls: Security Status, Authenticated User & Sign Out */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Security Indicator */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>SANDBOX: <span className="text-emerald-700 font-semibold">ISOLATED</span></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
            {chainValid ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>EVIDENCE: <span className="text-emerald-700 font-semibold">VALID</span></span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                <span>EVIDENCE: <span className="text-red-600 font-bold">TAMPERED</span></span>
              </>
            )}
          </div>
        </div>

        {/* Authenticated User Badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800 font-mono">{currentUser.username}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${getRoleBadge(currentUser.role)}`}>
              {currentUser.role.replace('_', ' ')}
            </span>
          </div>

          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all cursor-pointer ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
