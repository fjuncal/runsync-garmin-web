import type { GarminWorkout } from "./types";

export function workoutDeletePath(workoutId: number | string) {
  const numericId = Number(workoutId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error("ID de treino inválido.");
  }
  return `/api/workouts/${encodeURIComponent(String(numericId))}`;
}

export function removeWorkoutById(
  items: GarminWorkout[],
  workoutId: number,
): GarminWorkout[] {
  return items.filter((item) => item.workoutId !== workoutId);
}
