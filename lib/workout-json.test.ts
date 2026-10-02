import assert from "node:assert/strict";
import test from "node:test";
import { parseWorkoutJson, validateWorkoutPayload } from "./workout-json.ts";

test("rejects invalid JSON", () => {
  const result = parseWorkoutJson('{"name":');

  assert.equal(result.payload, null);
  assert.equal(result.error, "O conteúdo não é um JSON válido.");
});

test("keeps public repeat field unchanged", () => {
  const result = parseWorkoutJson(
    JSON.stringify({
      name: "Intervalado",
      date: null,
      steps: [
        {
          type: "repeat",
          repeat: 3,
          steps: [{ type: "run", duration: { type: "time", value: 60 } }],
        },
      ],
    }),
  );

  assert.equal(result.error, "");
  assert.equal(result.payload?.steps[0].repeat, 3);
  assert.equal("iterations" in (result.payload?.steps[0] || {}), false);
  assert.equal(validateWorkoutPayload(result.payload), "");
});

test("rejects a non-object JSON value", () => {
  const result = parseWorkoutJson("[]");

  assert.equal(result.payload, null);
  assert.equal(result.error, "O JSON do treino deve ser um objeto.");
});
