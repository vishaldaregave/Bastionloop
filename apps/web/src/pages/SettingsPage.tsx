import React from 'react';
import { Settings as SettingsIcon, Shield, Lock, Key, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Role, UserProfile } from '../types';

interface SettingsPageProps {
  currentUser: UserProfile;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold font-mono text-slate-900">SECURITY GOVERNANCE & RBAC</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 font-bold">
            ZERO-TRUST RBAC
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Review authenticated identity, assigned capabilities, and container hardening specifications.
        </p>
      </div>

      {/* Authenticated Identity Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
          <Users className="w-4 h-4 text-blue-600" />
          <span>AUTHENTICATED OPERATOR SESSION</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-semibold block mb-1">OPERATOR ID</span>
            <span className="font-bold text-slate-900 text-sm">{currentUser.user_id}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-semibold block mb-1">USERNAME</span>
            <span className="font-bold text-slate-900 text-sm">{currentUser.username}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-semibold block mb-1">ASSIGNED RBAC ROLE</span>
            <span className="font-bold text-blue-700 text-sm">{currentUser.role}</span>
          </div>
        </div>

        <div className="pt-2">
          <span className="text-xs font-mono font-bold text-slate-700 block mb-2">
            SERVER-ENFORCED CAPABILITIES:
          </span>
          <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
            {currentUser.capabilities.map((cap) => (
              <span key={cap} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-medium">
                {cap}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Container Security Hardening Profile */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>DOCKER HARDENING & ISOLATION SPECIFICATION</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-700 font-semibold">PRIVILEGE ESCALATION:</span>
            <span className="text-emerald-700 font-bold">no-new-privileges:true</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-700 font-semibold">LINUX CAPABILITIES:</span>
            <span className="text-emerald-700 font-bold">cap_drop: [ALL]</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-700 font-semibold">ROOT FILESYSTEM:</span>
            <span className="text-emerald-700 font-bold">read_only: true</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-700 font-semibold">CONTAINER USER:</span>
            <span className="text-emerald-700 font-bold">USER 10001 (Non-Root)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-700 font-semibold">NETWORK ISOLATION:</span>
            <span className="text-emerald-700 font-bold">Internal Bridge Networks</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-700 font-semibold">HOST DOCKER SOCKET:</span>
            <span className="text-emerald-700 font-bold">UNMOUNTED (Protected)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
