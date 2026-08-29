export type DurationType = "time" | "distance" | "lap";
export type WorkoutStepType = "warmup" | "run" | "interval" | "recovery" | "cooldown" | "repeat";
export type TargetType = "pace" | "heart_rate" | "heart_rate_zone";

export type WorkoutTarget =
  | { type: "pace"; min: string; max: string }
  | { type: "heart_rate"; min: number; max: number }
  | { type: "heart_rate_zone"; zone: number };

export type WorkoutDuration =
  | { type: "time"; value: any }
  | { type: "distance"; value: any }
  | ({ type: "lap" } & { value?: any });

export type WorkoutStep = {
  type: WorkoutStepType;
  duration?: WorkoutDuration;
  target?: any;
  description?: string;
  iterations?: number;
  steps?: WorkoutStep[];
};

export type WorkoutPayload = {
  name: string;
  date?: string | null;
  description?: string;
  steps: WorkoutStep[];
};

export type GarminStatus = {
  connected: boolean;
  email?: string | null;
};

export type CalendarWorkout = {
  workout_id?: string | null;
  scheduled_id?: string | null;
  name: string;
  date?: string | null;
  raw?: unknown;
};

export type HistoryItem = {
  id: number | string;
  workout_id: string;
  scheduled_id?: string | null;
  name: string;
  date?: string | null;
  status: string;
  created_at: string;
};

export type Toast = {
  id: number;
  tone: "success" | "error" | "info";
  title: string;
  message?: string;
};

// Calendar placeholders are intentionally combined with numeric day cells.
declare global {
  interface Array<T> {
    concat(...items: any[]): any[];
  }
}

declare global {
  interface Array<T> {
    concat(...items: any[]): any[];
  }
}
