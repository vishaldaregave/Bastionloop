import React from 'react';
import {
  LayoutDashboard, FolderKanban, Swords, ShieldAlert,
  Cpu, FileCheck2, Bug, Gauge, Award, Settings as SettingsIcon,
  ShieldCheck, Lock, CheckCircle2
} from 'lucide-react';
import { Role } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  threatCount: number;
  userRole?: Role;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, threatCount, userRole }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'evaluations', label: 'Evaluations Manager', icon: FolderKanban },
    { id: 'red_team', label: 'Red Team Operations', icon: Swords, badge: threatCount > 0 ? threatCount : undefined, color: 'text-red-600' },
    { id: 'blue_team', label: 'Blue Team Defense', icon: ShieldAlert, color: 'text-emerald-600' },
    { id: 'target_llm', label: 'Target LLM Lab', icon: Cpu, color: 'text-purple-600' },
    { id: 'evidence', label: 'Evidence & Provenance', icon: FileCheck2 },
    { id: 'contamination', label: 'Contamination Center', icon: Bug },
    { id: 'fairness', label: 'Resource Governance', icon: Gauge },
    { id: 'passport', label: 'Trust Passport', icon: Award, highlight: true },
    { id: 'settings', label: 'Admin & RBAC', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)] shadow-subtle flex-shrink-0">
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 px-3 font-bold">
            OPERATIONAL WORKSPACES
          </span>
          <nav className="mt-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left ${
                    isActive
                      ? item.highlight
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-semibold'
                        : 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                      : item.highlight
                      ? 'text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 border border-blue-200/60 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? (item.highlight ? 'text-white' : 'text-blue-600') : (item.color || 'text-slate-500')}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="bg-red-100 text-red-700 border border-red-200 text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !isActive && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                      FLAGSHIP
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Security Assurance Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-mono text-[11px] font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ZERO-TRUST ENFORCED</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Actors run in isolated network namespaces. Raw payloads vaulted separately with confidential dual-custody access.
          </p>
          <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-200">
            <span>ISOLATION</span>
            <span className="text-emerald-700 font-bold">HARDENED</span>
          </div>
        </div>
      </div>

      {/* Version Tag */}
      <div className="pt-4 border-t border-slate-200 text-center">
        <p className="text-[10px] font-mono text-slate-500 font-semibold">
          BastionLoop Control Plane v1.0.0
        </p>
        <p className="text-[9px] font-mono text-slate-600 mt-0.5 font-medium">
          Hack in Hills '26 — Problem 04
        </p>
      </div>
    </aside>
  );
};
