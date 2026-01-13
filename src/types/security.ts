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
