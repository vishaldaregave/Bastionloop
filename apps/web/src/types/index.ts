export type Role = 'ADMIN' | 'RED_TEAM' | 'BLUE_TEAM' | 'MODEL_OPERATOR' | 'VIEWER';

export type EvalStatus = 'DRAFT' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'QUARANTINED';

export interface UserProfile {
  user_id: string;
  username: string;
  email?: string;
  role: Role;
  capabilities: string[];
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

export interface Evaluation {
  id: string;
  project_name: string;
  target_model: string;
  model_version: string;
  evaluation_type: string;
  description: string;
  risk_profile: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: EvalStatus;
  disclosure_state: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Attack {
  id: string;
  evaluation_id: string;
  payload_id: string;
  payload_hash: string;
  category: string;
  severity: string;
  status: string;
  result_class: 'BLOCKED' | 'ALLOWED' | 'SANITIZED' | 'VULNERABLE' | 'UNKNOWN';
  latency_ms: number;
  submitted_by: string;
  created_at: string;
}

export interface AttackPayload {
  id: string;
  evaluation_id: string;
  prompt_text: string;
  system_context: string;
  payload_hash: string;
  created_by: string;
  created_at: string;
}

export interface AttackLibraryItem {
  id: string;
  name: string;
  category: string;
  severity: string;
  description: string;
  sample_prompt: string;
}

export interface Defense {
  id: string;
  evaluation_id: string;
  name: string;
  rule_type: string;
  pattern: string;
  action: 'BLOCK' | 'REDACT' | 'QUARANTINE' | 'LOG';
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface SecurityFinding {
  id: string;
  evaluation_id: string;
  title: string;
  category: string;
  severity: string;
  description: string;
  sanitized_metadata: Record<string, any>;
  status: 'OPEN' | 'MITIGATED' | 'ACCEPTED';
  created_at: string;
}

export interface BlueViewData {
  evaluation_id: string;
  status: string;
  total_attacks: number;
  threats_detected: number;
  defenses_active: number;
  findings: SecurityFinding[];
  sanitized_attacks: Attack[];
  active_defenses: Defense[];
}

export interface EvidenceEvent {
  id: string;
  evaluation_id: string;
  event_seq: number;
  actor: string;
  event_type: string;
  metadata_json: Record<string, any>;
  previous_event_hash: string;
  event_hash: string;
  timestamp: string;
}

export interface EvidenceVerification {
  evaluation_id: string;
  is_valid: boolean;
  total_events: number;
  genesis_hash: string;
  tip_hash: string;
  tampered_event_seq?: number | null;
  verification_message: string;
  verified_at: string;
}

export interface ContaminationCheck {
  id: string;
  evaluation_id: string;
  session_id: string;
  canary_token: string;
  probe_query: string;
  target_response: string;
  is_clean: boolean;
  isolation_status: string;
  details: Record<string, any>;
  created_at: string;
}

export interface ResourceMetric {
  id: string;
  evaluation_id: string;
  actor: string;
  cpu_usage_pct: number;
  memory_mb: number;
  request_count: number;
  latency_ms: number;
  duration_ms: number;
  fairness_score: number;
  timestamp: string;
}

export interface ResourceFairness {
  evaluation_id: string;
  fairness_score: number;
  red_resource_share_pct: number;
  blue_resource_share_pct: number;
  llm_resource_share_pct: number;
  status: string;
  recommendations: string[];
  metrics: ResourceMetric[];
}

export interface TrustScoreBreakdown {
  isolation_score: number;
  evidence_score: number;
  contamination_score: number;
  fairness_score: number;
  access_score: number;
  observability_score: number;
  overall_score: number;
  trust_tier: 'HIGH RISK' | 'NEEDS REVIEW' | 'TRUSTED' | 'HIGH CONFIDENCE';
}

export interface TestIntegrityPassport {
  evaluation_id: string;
  project_name: string;
  model_identity: string;
  model_version: string;
  isolation_status: string;
  network_policy_status: string;
  contamination_status: string;
  resource_fairness_status: string;
  attack_count: number;
  threats_mitigated: number;
  defense_events: number;
  evidence_chain_status: string;
  evidence_tip_hash: string;
  trust_score: number;
  trust_tier: string;
  score_breakdown: TrustScoreBreakdown;
  residual_risks: string[];
  cryptographic_passport_hash: string;
  issued_at: string;
  verified_by: string;
}
