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
  listing_id?: string;
  published_at?: number;
}

export interface PublishMetadata {
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
}

export type PublishStatus = 'Published' | 'Failed' | 'Pending';

export interface PublishRecord {
  id: string;
  skill_name: string;
  skill_version: string;
  skill_id: string;
  listing_id: string;
  author: string | null;
  description: string | null;
  tags: string[];
  published_at: number;
  status: PublishStatus;
  error_message: string | null;
}
