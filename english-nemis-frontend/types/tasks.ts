export type TaskLanguage = "english" | "german";

export type TaskType =
  | "fill_blank"
  | "multiple_choice"
  | "translation"
  | "sentence_building"
  | "grammar_correction"
  | "reading"
  | "writing";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed";

export interface DailyTask {
  id: string;
  language: TaskLanguage;
  type: TaskType;
  title: string;
  instructions: string;
  content: Record<string, unknown>;
  estimatedMinutes: number;
  status: TaskStatus;
  order: number;
  completedAt?: string | null;
}

export interface DailyPlan {
  id: string;
  englishTargetMinutes: number;
  germanTargetMinutes: number;
  status: TaskStatus;
}

export interface TodayTasksResponse {
  success: boolean;
  date: string;
  plan: DailyPlan | null;
  tasks: DailyTask[];
}