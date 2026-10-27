import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RedTeamLayout } from './layouts/RedTeamLayout';
import { BlueTeamLayout } from './layouts/BlueTeamLayout';
import { ModelOpsLayout } from './layouts/ModelOpsLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Red Team Pages
import { AttackDashboardPage } from './pages/red/AttackDashboardPage';
import { CampaignsPage } from './pages/red/CampaignsPage';
import { AttackPlaygroundPage } from './pages/red/AttackPlaygroundPage';
import { TestLibraryPage } from './pages/red/TestLibraryPage';
import { ExecutionTimelinePage } from './pages/red/ExecutionTimelinePage';
import { FindingsPage } from './pages/red/FindingsPage';
import { RegressionPage } from './pages/red/RegressionPage';
import { PayloadVaultPage } from './pages/red/PayloadVaultPage';
import { EvaluationReportsPage } from './pages/red/EvaluationReportsPage';
import { SandboxStatusPage } from './pages/red/SandboxStatusPage';

// Blue Team Pages
import { DefenseOverviewPage } from './pages/blue/DefenseOverviewPage';
import { LiveAlertsPage } from './pages/blue/LiveAlertsPage';
import { DefensePoliciesPage } from './pages/blue/DefensePoliciesPage';
import { DetectionRulesPage } from './pages/blue/DetectionRulesPage';
import { PolicySimulatorPage } from './pages/blue/PolicySimulatorPage';
import { DeploymentHistoryPage } from './pages/blue/DeploymentHistoryPage';
import { RegressionResultsPage } from './pages/blue/RegressionResultsPage';
import { ThreatIntelPage } from './pages/blue/ThreatIntelPage';
import { EvidenceMonitorPage } from './pages/blue/EvidenceMonitorPage';
import { ResponsePlaybooksPage } from './pages/blue/ResponsePlaybooksPage';
import { SystemHealthPage } from './pages/blue/SystemHealthPage';

// Model Ops Pages
import { ModelPlaygroundPage } from './pages/model/ModelPlaygroundPage';
import { ProvidersPage } from './pages/model/ProvidersPage';
import { InferenceTracesPage } from './pages/model/InferenceTracesPage';
import { RuntimeHealthPage } from './pages/model/RuntimeHealthPage';
import { SessionIsolationPage } from './pages/model/SessionIsolationPage';
import { ContaminationPage } from './pages/model/ContaminationPage';

// Admin Pages
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { UsersPage } from './pages/admin/UsersPage';
import { RbacPage } from './pages/admin/RbacPage';
import { EvaluationsAdminPage } from './pages/admin/EvaluationsAdminPage';
import { InfrastructurePage } from './pages/admin/InfrastructurePage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { EvidenceAdminPage } from './pages/admin/EvidenceAdminPage';
import { ResourceGovernorAdminPage } from './pages/admin/ResourceGovernorAdminPage';
import { PassportAdminPage } from './pages/admin/PassportAdminPage';
import { SystemSettingsPage } from './pages/admin/SystemSettingsPage';

import { Evaluation, UserProfile } from './types';
import { api } from './services/api';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(api.getUser());
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedEvalId, setSelectedEvalId] = useState<string>('BL-2026-00001');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleExpiry = () => {
      setCurrentUser(null);
      navigate('/login');
    };
    window.addEventListener('bastionloop_session_expired', handleExpiry);
    return () => window.removeEventListener('bastionloop_session_expired', handleExpiry);
  }, [navigate]);

  useEffect(() => {
    if (currentUser) {
      loadEvaluations();
    }
  }, [currentUser]);

  const loadEvaluations = async () => {
    try {
      const evs = await api.listEvaluations();
      setEvaluations(evs);
      if (evs.length > 0) {
        if (!selectedEvalId || !evs.some(e => e.id === selectedEvalId)) {
          setSelectedEvalId(evs[0].id);
        }
      }
    } catch (e) {
      console.error('Failed loading evaluations', e);
    }
  };

  const getDefaultRouteForRole = (role: string) => {
    switch (role) {
      case 'RED_TEAM':
        return '/red-team/dashboard';
      case 'BLUE_TEAM':
        return '/blue-team/overview';
      case 'MODEL_OPERATOR':
        return '/model-ops/playground';
      case 'AUDITOR':
        return '/admin/passport';
      case 'ADMIN':
      default:
        return '/admin/overview';
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    loadEvaluations();
    const target = getDefaultRouteForRole(user.role);
    navigate(target);
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    navigate('/login');
  };

  // Auth Guard Helper
  const RequireAuth = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
    if (!currentUser) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    if (allowedRoles && !allowedRoles.includes(currentUser.role) && currentUser.role !== 'ADMIN') {
      // Role unauthorized: redirect safely to role's default workspace
      return <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />;
    }
    return <>{children}</>;
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          currentUser ? (
            <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />
          ) : (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          )
        }
      />

      {/* Root Redirection */}
      <Route
        path="/"
        element={
          currentUser ? (
            <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Red Team Workspace */}
      <Route
        path="/red-team"
        element={
          <RequireAuth allowedRoles={['RED_TEAM']}>
            <RedTeamLayout
              currentUser={currentUser!}
              onLogout={handleLogout}
              evaluations={evaluations}
              selectedEvalId={selectedEvalId}
              onSelectEval={setSelectedEvalId}
            />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AttackDashboardPage evaluationId={selectedEvalId} />} />
        <Route path="campaigns" element={<CampaignsPage evaluationId={selectedEvalId} />} />
        <Route
          path="playground"
          element={
            <AttackPlaygroundPage
              evaluationId={selectedEvalId}
              currentUser={currentUser!}
            />
          }
        />
        <Route path="library" element={<TestLibraryPage evaluationId={selectedEvalId} />} />
        <Route path="timeline" element={<ExecutionTimelinePage evaluationId={selectedEvalId} />} />
        <Route path="findings" element={<FindingsPage evaluationId={selectedEvalId} />} />
        <Route path="regression" element={<RegressionPage evaluationId={selectedEvalId} />} />
        <Route path="vault" element={<PayloadVaultPage />} />
        <Route path="reports" element={<EvaluationReportsPage />} />
        <Route path="sandbox" element={<SandboxStatusPage />} />
      </Route>

      {/* Blue Team Workspace */}
      <Route
        path="/blue-team"
        element={
          <RequireAuth allowedRoles={['BLUE_TEAM']}>
            <BlueTeamLayout
              currentUser={currentUser!}
              onLogout={handleLogout}
              evaluations={evaluations}
              selectedEvalId={selectedEvalId}
              onSelectEval={setSelectedEvalId}
            />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<DefenseOverviewPage evaluationId={selectedEvalId} />} />
        <Route path="alerts" element={<LiveAlertsPage evaluationId={selectedEvalId} />} />
        <Route path="policies" element={<DefensePoliciesPage evaluationId={selectedEvalId} />} />
        <Route path="rules" element={<DetectionRulesPage evaluationId={selectedEvalId} />} />
        <Route path="simulator" element={<PolicySimulatorPage evaluationId={selectedEvalId} />} />
        <Route path="deployments" element={<DeploymentHistoryPage evaluationId={selectedEvalId} />} />
        <Route path="regression" element={<RegressionResultsPage evaluationId={selectedEvalId} />} />
        <Route path="threat-intel" element={<ThreatIntelPage />} />
        <Route path="evidence" element={<EvidenceMonitorPage evaluationId={selectedEvalId} />} />
        <Route path="playbooks" element={<ResponsePlaybooksPage />} />
        <Route path="health" element={<SystemHealthPage />} />
      </Route>

      {/* Model Operator Workspace */}
      <Route
        path="/model-ops"
        element={
          <RequireAuth allowedRoles={['MODEL_OPERATOR']}>
            <ModelOpsLayout
              currentUser={currentUser!}
              onLogout={handleLogout}
              evaluations={evaluations}
              selectedEvalId={selectedEvalId}
              onSelectEval={setSelectedEvalId}
            />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="playground" replace />} />
        <Route path="playground" element={<ModelPlaygroundPage evaluationId={selectedEvalId} />} />
        <Route path="models" element={<ProvidersPage />} />
        <Route path="traces" element={<InferenceTracesPage evaluationId={selectedEvalId} />} />
        <Route path="health" element={<RuntimeHealthPage />} />
        <Route path="sessions" element={<SessionIsolationPage evaluationId={selectedEvalId} />} />
        <Route path="contamination" element={<ContaminationPage evaluationId={selectedEvalId} />} />
      </Route>

      {/* Admin Control Plane */}
      <Route
        path="/admin"
        element={
          <RequireAuth allowedRoles={['ADMIN', 'AUDITOR']}>
            <AdminLayout
              currentUser={currentUser!}
              onLogout={handleLogout}
              evaluations={evaluations}
              selectedEvalId={selectedEvalId}
              onSelectEval={setSelectedEvalId}
            />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<AdminOverviewPage evaluationId={selectedEvalId} />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="rbac" element={<RbacPage />} />
        <Route
          path="evaluations"
          element={
            <EvaluationsAdminPage
              evaluations={evaluations}
              selectedEvalId={selectedEvalId}
              onSelectEval={setSelectedEvalId}
              onRefresh={loadEvaluations}
            />
          }
        />
        <Route path="infrastructure" element={<InfrastructurePage />} />
        <Route path="audit" element={<AuditLogsPage evaluationId={selectedEvalId} />} />
        <Route path="evidence" element={<EvidenceAdminPage evaluationId={selectedEvalId} />} />
        <Route path="governor" element={<ResourceGovernorAdminPage evaluationId={selectedEvalId} />} />
        <Route path="passport" element={<PassportAdminPage evaluationId={selectedEvalId} />} />
        <Route path="settings" element={<SystemSettingsPage />} />
      </Route>

      {/* Fallback Catch-all */}
      <Route
        path="*"
        element={
          currentUser ? (
            <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
