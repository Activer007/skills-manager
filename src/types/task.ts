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
  | 'Other';

export enum ProgressStage {
  Queued = 'Queued',
  Preparing = 'Preparing',
  Downloading = 'Downloading',
  Scanning = 'Scanning',
  Analyzing = 'Analyzing',
  Installing = 'Installing',
  Finalizing = 'Finalizing',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled'
}

export interface ProgressEvent {
  task_id: string;
  stage: ProgressStage | string;
  message: string;
  progress: number;
  percentage?: number;
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
