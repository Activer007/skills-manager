export interface SecurityIssue {
  severity: 'Info' | 'Warning' | 'Error' | 'Critical';
  category: 'FileSystem' | 'Network' | 'ProcessExecution' | 'DataExfiltration' | 'DangerousFunction' | 'ObfuscatedCode' | 'Other';
  description: string;
  line_number?: number;
  code_snippet?: string;
  file_path?: string;
}

export type SecurityLevel = 'Safe' | 'Low' | 'Medium' | 'High' | 'Critical';

export interface SecurityReport {
  skill_id: string;
  score: number;
  level: SecurityLevel;
  issues: SecurityIssue[];
  recommendations: string[];
  blocked: boolean;
  hard_trigger_issues: string[];
  scanned_files: string[];
}

export interface ScanRecord {
  id: number;
  skill_id: string;
  skill_name: string;
  /** Unix timestamp in milliseconds (consistent with JavaScript Date) */
  scanned_at: number;
  score: number;
  level: SecurityLevel;
  issues_count: number;
  blocked: boolean;
}