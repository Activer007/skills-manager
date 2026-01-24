export enum TaskStatus {
  Pending = 'Pending',
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled'
}

export type TaskType =
  | 'ImportSkill'
  | 'ScanSkill'
  | 'ScanRepository'
  | 'Download'
  | { Other: string };

export enum ProgressStage {
  Queued = 'Queued',
  Preparing = 'Preparing',
  Downloading = 'Downloading',
  Scanning = 'Scanning',
  Installing = 'Installing',
  Finalizing = 'Finalizing',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled'
}

export interface ProgressEvent {
  task_id: string;
  stage: ProgressStage;
  message: string;
  progress: number;
  percentage?: number; // Added for compatibility
  total?: number;
  current?: number;
}

export interface Task {
  id: string;
  task_type: TaskType;
  status: TaskStatus;
  title: string;
  progress?: ProgressEvent;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
}
