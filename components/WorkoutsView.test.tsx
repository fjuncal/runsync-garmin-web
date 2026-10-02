import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act, create } from "react-test-renderer";
import { WorkoutsView } from "./WorkoutsView";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const items = [
  {
    workoutId: 42,
    name: "Intervalado 6x2",
    sportType: "running",
    estimatedDuration: 1800,
  },
];

function renderView(overrides: Record<string, unknown> = {}) {
  const props = {
    items,
    loading: false,
    onRefresh: () => undefined,
    onDelete: async () => undefined,
    addToast: () => undefined,
    ...overrides,
  };
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(<WorkoutsView {...props} />);
  });
  return renderer!;
}

function buttonWithLabel(renderer: ReturnType<typeof create>, label: string) {
  return renderer.root.findAllByType("button").find((button) =>
    button.children.some((child) => String(child).includes(label)),
  );
}

test("renderiza loading e lista vazia", () => {
  const loading = renderView({ items: [], loading: true });
  assert.ok(loading.root.findAll((node) => node.children.includes("Carregando treinos...")).length);
  act(() => loading.unmount());

  const empty = renderView({ items: [] });
  assert.ok(empty.root.findAll((node) => node.children.includes("Nenhum treino salvo")).length);
  act(() => empty.unmount());
});

test("exige confirmação, cancelar não chama DELETE e sucesso fecha o modal", async () => {
  let deleteCalls = 0;
  const renderer = renderView({
    onDelete: async () => {
      deleteCalls += 1;
    },
  });

  await act(async () => {
    renderer.root.findByProps({ "aria-label": "Excluir Intervalado 6x2" }).props.onClick();
  });
  assert.equal(renderer.root.findByProps({ role: "dialog" }).props["aria-modal"], "true");

  await act(async () => {
    buttonWithLabel(renderer, "Cancelar")?.props.onClick();
  });
  assert.throws(() => renderer.root.findByProps({ role: "dialog" }));
  assert.equal(deleteCalls, 0);

  await act(async () => {
    renderer.root.findByProps({ "aria-label": "Excluir Intervalado 6x2" }).props.onClick();
  });
  await act(async () => {
    await buttonWithLabel(renderer, "Excluir treino")?.props.onClick();
  });
  assert.equal(deleteCalls, 1);
  assert.throws(() => renderer.root.findByProps({ role: "dialog" }));
  act(() => renderer.unmount());
});

test("falha mantém o modal e mostra feedback de erro", async () => {
  const toasts: unknown[][] = [];
  const renderer = renderView({
    onDelete: async () => {
      throw new Error("storage unavailable");
    },
    addToast: (...args: unknown[]) => toasts.push(args),
  });

  await act(async () => {
    renderer.root.findByProps({ "aria-label": "Excluir Intervalado 6x2" }).props.onClick();
  });
  await act(async () => {
    await buttonWithLabel(renderer, "Excluir treino")?.props.onClick();
  });

  assert.ok(renderer.root.findByProps({ role: "dialog" }));
  assert.equal(toasts[0][0], "error");
  act(() => renderer.unmount());
});
