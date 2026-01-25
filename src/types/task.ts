export const TaskStatus = {
  Pending: 'Pending',
  Running: 'Running',
  Completed: 'Completed',
  Failed: 'Failed',
  Cancelled: 'Cancelled'
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export type TaskType =
  | 'ImportSkill'
  | 'ScanSkill'
  | 'ScanRepository'
  | 'Download'
  | 'Other';

export const ProgressStage = {
  Queued: 'Queued',
  Preparing: 'Preparing',
  Downloading: 'Downloading',
  Scanning: 'Scanning',
  Analyzing: 'Analyzing',
  Installing: 'Installing',
  Finalizing: 'Finalizing',
  Completed: 'Completed',
  Failed: 'Failed',
  Cancelled: 'Cancelled'
} as const;

export type ProgressStage = typeof ProgressStage[keyof typeof ProgressStage];

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
