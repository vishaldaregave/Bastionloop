import React from 'react';
import {
  Shield, Swords, ShieldAlert, Cpu, Award,
  CheckCircle2, AlertTriangle, ArrowRight, Play, RefreshCw, Lock, PlusCircle
} from 'lucide-react';
import { Evaluation, TestIntegrityPassport, BlueViewData } from '../types';
import { TrustMeter } from '../components/TrustMeter';
import { LiveFlowVisualizer } from '../components/LiveFlowVisualizer';

interface DashboardPageProps {
  evaluation: Evaluation | null;
  passport: TestIntegrityPassport | null;
  blueView: BlueViewData | null;
  onNavigate: (tab: string) => void;
  onStartEval: () => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  evaluation,
  passport,
  blueView,
  onNavigate,
  onStartEval,
  isLoading,
  onRefresh
}) => {
  if (isLoading && !evaluation) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-2xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-48 bg-slate-200 rounded-2xl w-full" />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-card max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
          <Shield className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 font-mono">No Active Evaluation Loaded</h3>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
          Create or select an adversarial evaluation session to start testing safety boundaries, monitoring sanitized telemetry, and generating verifiable integrity passports.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('evaluations')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>CREATE EVALUATION</span>
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>REFRESH STATUS</span>
          </button>
        </div>
      </div>
    );
  }

  const threatsCount = blueView?.threats_detected ?? 0;
  const attacksCount = blueView?.total_attacks ?? 0;
  const defensesCount = blueView?.defenses_active ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Hero Banner: Active Evaluation State */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-card relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 font-bold">
                ACTIVE EVALUATION
              </span>
              <span className="text-xs font-mono text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                STATUS: {evaluation.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1.5 font-mono">
              {evaluation.id} — {evaluation.project_name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Target Model: <span className="text-blue-700 font-mono font-bold">{evaluation.target_model}</span> ({evaluation.model_version}) &bull; Risk Profile: <span className="text-red-700 font-mono font-semibold">{evaluation.risk_profile}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('passport')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>TEST PASSPORT</span>
            </button>
            <button
              onClick={() => onNavigate('red_team')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Swords className="w-4 h-4 text-red-600" />
              <span>LAUNCH TEST</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Trust Score */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-mono font-semibold">TRUST SCORE</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 mt-2">
            {passport?.trust_score ?? 100}
            <span className="text-xs text-slate-400 font-normal">/100</span>
          </div>
          <div className="text-[11px] font-mono text-emerald-700 font-bold mt-1">
            {passport?.trust_tier ?? 'HIGH CONFIDENCE'}
          </div>
        </div>

        {/* KPI 2: Adversarial Attacks */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-mono font-semibold">ATTACKS TESTED</span>
            <Swords className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 mt-2">
            {attacksCount}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            {threatsCount} Intercepted / Mitigated
          </div>
        </div>

        {/* KPI 3: Active Guardrails */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-mono font-semibold">ACTIVE DEFENSES</span>
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900 mt-2">
            {defensesCount}
          </div>
          <div className="text-[11px] font-mono text-emerald-700 font-semibold mt-1">
            Zero-Trust Gateway Rules
          </div>
        </div>

        {/* KPI 4: Provenance Events */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-mono font-semibold">EVIDENCE CHAIN</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-700 mt-2">
            VALID
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            SHA-256 Hash Chained
          </div>
        </div>
      </div>

      {/* Live Flow Visualizer Component */}
      <LiveFlowVisualizer
        activeDefensesCount={defensesCount}
        modelProvider={evaluation.target_model}
      />

      {/* Lower Dual Grid: Trust Score Meter & Recent Security Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Trust Score Meter */}
        {passport && (
          <TrustMeter
            score={passport.trust_score}
            tier={passport.trust_tier}
            breakdown={passport.score_breakdown}
          />
        )}

        {/* Right: Security Findings Feed */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 font-mono">SECURITY FINDINGS</h3>
            <button
              onClick={() => onNavigate('blue_team')}
              className="text-xs font-mono font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>VIEW STUDIO</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(!blueView?.findings || blueView.findings.length === 0) ? (
              <div className="p-6 text-center text-xs font-mono text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                No active vulnerabilities detected. Target model safety within envelope.
              </div>
            ) : (
              blueView.findings.slice(0, 3).map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">{f.title}</div>
                    <div className="text-[11px] text-slate-600">{f.description}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    f.status === 'MITIGATED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {f.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
