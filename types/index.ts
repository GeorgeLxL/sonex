export type PermLevel = "none" | "read" | "write";
export type ProjectStatus = "todo" | "in_progress" | "review" | "done" | "paid";
export type TaskStatus = "todo" | "progress" | "review" | "done";
export type RepeatType =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "workdays"
  | "weekends"
  | "custom";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type SalaryStatus = "draft" | "confirmed" | "paid";
export type CandidateStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "todo",
  "in_progress",
  "review",
  "done",
  "paid",
];
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  paid: "Paid",
};

export const TASK_STATUSES: TaskStatus[] = ["todo", "progress", "review", "done"];
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Todo",
  progress: "In Progress",
  review: "Review",
  done: "Done",
};

export interface Role {
  id: string;
  name: string;
  display_name: string;
  is_system: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  department_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string;
  birthday: string | null;
  timezone: string;
  is_active: boolean;
  joined_at: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  client_id: string | null;
  owner_id: string;
  status: ProjectStatus;
  deadline: string | null;
  amount: number;
  sort_order: number;
  is_archived: boolean;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  status: ProjectStatus;
  deadline: string | null;
  amount: number;
  sort_order: number;
}

export interface Task {
  id: string;
  project_id: string;
  milestone_id: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  is_urgent: boolean;
  is_important: boolean;
  assignee_id: string | null;
  due_date: string | null;
  sort_order: number;
  is_archived: boolean;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface PersonalTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  date: string | null;
  time: string | null;
  due_date: string | null;
  status: TaskStatus;
  is_recurring: boolean;
  repeat_type: RepeatType;
  repeat_interval: number;
  is_done_today: boolean;
  done_today_date: string | null;
  is_fully_complete: boolean;
  is_urgent: boolean;
  is_important: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

/** Eisenhower quadrant from the two tags. */
export type Quadrant = "do_first" | "schedule" | "plan" | "someday";
export function quadrantOf(t: { is_urgent: boolean; is_important: boolean }): Quadrant {
  if (t.is_urgent && t.is_important) return "do_first";
  if (t.is_urgent) return "schedule";
  if (t.is_important) return "plan";
  return "someday";
}
export const QUADRANT_LABEL: Record<Quadrant, string> = {
  do_first: "Urgent + Important — Do first",
  schedule: "Urgent — Schedule soon",
  plan: "Important — Plan",
  someday: "Normal — Someday",
};
