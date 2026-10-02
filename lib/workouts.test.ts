import test from "node:test";
import assert from "node:assert/strict";
import { removeWorkoutById, workoutDeletePath } from "./workouts.ts";

test("constrói rota de exclusão somente para ID positivo", () => {
  assert.equal(workoutDeletePath(123), "/api/workouts/123");
  assert.throws(() => workoutDeletePath(0));
  assert.throws(() => workoutDeletePath("not-an-id"));
});

test("remove apenas o treino confirmado pelo ID", () => {
  const items = [
    { workoutId: 1, name: "A" },
    { workoutId: 2, name: "B" },
  ];
  assert.deepEqual(removeWorkoutById(items, 1), [{ workoutId: 2, name: "B" }]);
});
