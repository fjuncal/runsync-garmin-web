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
  repeat?: number;
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

export type ActivitySummary = {
  activityId?: number | string;
  name?: string;
  activityType?: string;
  startTime?: string;
  distanceMeters?: number;
  durationSeconds?: number;
  movingTimeSeconds?: number;
  averagePace?: string;
  maxPace?: string;
  averageHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;
  cadence?: number;
  elevationGain?: number;
  elevationLoss?: number;
  trainingEffect?: number;
  aerobicTrainingEffect?: number;
  anaerobicTrainingEffect?: number;
  vo2Max?: number;
  temperature?: number;
  [key: string]: unknown;
};

export type ActivityDetail = {
  summary: ActivitySummary;
  laps: unknown[];
  splits: unknown[];
  intervals?: unknown[];
  heartRateZones?: unknown[];
  paceZones?: unknown[];
  coachExport?: ActivityCoachExport;
  raw: Record<string, unknown>;
};

export type ActivityCoachExport = {
  summary: ActivitySummary;
  laps: unknown[];
  splits: unknown[];
};

export type ActivityListItem = ActivitySummary;

export type Toast = {
  id: number;
  tone: "success" | "error" | "info";
  title: string;
  message?: string;
};
