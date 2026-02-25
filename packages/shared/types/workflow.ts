export type WorkflowStatus = "draft" | "active" | "paused";
export type ExecutionStatus = "running" | "completed" | "failed";
export type TriggerType = "event" | "schedule" | "manual";
export type ActionType =
  | "send_email"
  | "add_tag"
  | "remove_tag"
  | "enroll_course"
  | "add_to_list"
  | "remove_from_list"
  | "wait"
  | "webhook"
  | "update_contact"
  | "create_note"
  | "condition";

export interface Workflow {
  id: number;
  tenant_id: number;
  name: string;
  description: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  status: WorkflowStatus;
  execution_count: number;
  created_at: string;
  updated_at: string;
  actions?: WorkflowAction[];
}

export interface WorkflowAction {
  id: number;
  tenant_id: number;
  workflow_id: number;
  type: ActionType;
  config: Record<string, unknown>;
  sort_order: number;
  delay_seconds: number;
  condition: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: number;
  tenant_id: number;
  workflow_id: number;
  contact_id: number;
  trigger_event: string;
  status: ExecutionStatus;
  current_step: number;
  log: unknown;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  workflow?: Workflow;
  contact?: { id: number; first_name: string; last_name: string; email: string };
}
