import type { SecurityIssue } from './security';

export interface CheckStatus {
  type: 'Pass' | 'Fail' | 'Warning';
}

export type CheckStatusType = 'Pass' | 'Fail' | 'Warning';

export interface PreflightCheck {
  name: string;
  status: CheckStatusType;
  message: string;
}

export interface SecurityReport {
  score: number;
  level: 'Safe' | 'Low' | 'Medium' | 'High' | 'Critical';
  issues: SecurityIssue[];
  blocked: boolean;
}

export interface PreflightResult {
  passed: boolean;
  checks: PreflightCheck[];
  security_report?: SecurityReport;
}

export interface PublishResult {
  success: boolean;
  message: string;
  skill_id?: string;
}

export interface PublishMetadata {
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
}
