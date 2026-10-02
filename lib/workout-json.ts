import type { WorkoutPayload } from "./types";

export type WorkoutJsonParseResult = {
  payload: WorkoutPayload | null;
  error: string;
};

export function parseWorkoutJson(text: string): WorkoutJsonParseResult {
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        payload: null,
        error: "O JSON do treino deve ser um objeto.",
      };
    }
    return { payload: value as WorkoutPayload, error: "" };
  } catch {
    return { payload: null, error: "O conteúdo não é um JSON válido." };
  }
}

export function validateWorkoutPayload(payload: WorkoutPayload | null): string {
  if (!payload) return "O conteúdo não é um JSON válido.";
  if (typeof payload.name !== "string" || !payload.name.trim()) {
    return "Informe um nome para o treino.";
  }
  if (!Array.isArray(payload.steps) || !payload.steps.length) {
    return "Informe pelo menos uma etapa no treino.";
  }
  return "";
}
