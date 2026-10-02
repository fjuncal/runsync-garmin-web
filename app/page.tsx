"use client";

import {
  Activity,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  ClipboardList,
  CloudUpload,
  Copy,
  FileJson,
  Gauge,
  Home as HomeIcon,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sun,
  Trash2,
  Watch,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, clearToken, getToken, saveToken } from "../lib/api";
import { ActivitiesView } from "../components/ActivitiesView";
import { WorkoutsView } from "../components/WorkoutsView";
import { parseWorkoutJson, validateWorkoutPayload } from "../lib/workout-json";
import { removeWorkoutById, workoutDeletePath } from "../lib/workouts";
import type {
  ActivitySummary,
  CalendarWorkout,
  GarminWorkout,
  GarminStatus,
  Toast,
  WorkoutDuration,
  WorkoutPayload,
  WorkoutStep,
  WorkoutStepType,
  WorkoutTarget,
} from "../lib/types";

type Tab = "home" | "workout" | "calendar" | "workouts" | "activities" | "garmin";
type EditorMode = "visual" | "json";
type ConnectionState = "loading" | "connected" | "disconnected" | "error";

const stepLabels: Record<WorkoutStepType, string> = {
  warmup: "Aquecimento",
  run: "Corrida",
  interval: "Intervalo",
  recovery: "Recuperação",
  cooldown: "Desaquecimento",
  repeat: "Repetição",
};
const stepIcons: Record<WorkoutStepType, typeof Activity> = {
  warmup: Activity,
  run: Gauge,
  interval: Zap,
  recovery: RefreshCw,
  cooldown: ArrowDown,
  repeat: ListChecks,
};
const emptyDuration = (): WorkoutDuration => ({ type: "time", value: 300 });
const defaultStep = (type: WorkoutStepType = "run"): WorkoutStep => ({
  type,
  duration: type === "cooldown" ? { type: "lap" } : emptyDuration(),
});
const defaultPayload: WorkoutPayload = {
  name: "TESTE RENDER",
  date: null,
  description: "Teste backend em producao",
  steps: [
    { type: "warmup", duration: { type: "time", value: 300 } },
    {
      type: "run",
      duration: { type: "time", value: 60 },
      target: { type: "pace", min: "6:30", max: "6:00" },
    },
    { type: "cooldown", duration: { type: "lap" } },
  ],
};

function payloadToText(payload: WorkoutPayload) {
  const value = { ...payload };
  if (value.date === undefined) delete value.date;
  if (!value.description) delete value.description;
  return JSON.stringify(value, null, 2);
}
function friendlyError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "Não foi possível concluir a operação.";
  if (/failed to fetch|network|fetch/i.test(message))
    return "O servidor está indisponível. Tente novamente em alguns instantes.";
  if (/401|senha inválida/i.test(message))
    return "Senha incorreta. Confira seus dados e tente novamente.";
  return (
    message.replace(/^HTTP \d+:?\s*/i, "") ||
    "Não foi possível concluir a operação."
  );
}
function dateKey(value?: string | null) {
  if (!value) return "";
  const match = String(value).match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] || "";
}
function localDateKey(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  const normalized = dateKey(value);
  const parsed = new Date(
    withTime || !normalized ? value : `${normalized}T12:00:00`,
  );
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(
    "pt-BR",
    withTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" },
  ).format(parsed);
}
function formatDuration(duration?: WorkoutDuration) {
  if (!duration) return "Sem duração";
  if (duration.type === "lap") return "Até pressionar LAP";
  if (duration.type === "distance")
    return duration.value >= 1000
      ? `${duration.value / 1000} km`
      : `${duration.value} m`;
  const minutes = Math.floor(duration.value / 60);
  const seconds = duration.value % 60;
  return seconds ? `${minutes}min ${seconds}s` : `${minutes} min`;
}
function formatTarget(target?: WorkoutTarget) {
  if (!target) return "Sem alvo";
  if (target.type === "pace") return `${target.min} – ${target.max} /km`;
  if (target.type === "heart_rate") return `${target.min} – ${target.max} bpm`;
  return `Zona ${target.zone}`;
}
function stepSummary(step: WorkoutStep) {
  return step.type === "repeat"
    ? `${step.repeat || 2}x · ${step.steps?.length || 0} etapas`
    : `${formatDuration(step.duration)}${step.target ? ` · ${formatTarget(step.target)}` : ""}`;
}
function visualToPayload(
  name: string,
  description: string,
  date: string,
  steps: WorkoutStep[],
): WorkoutPayload {
  const clean = (items: WorkoutStep[]): WorkoutStep[] =>
    items.map((step) => ({
      ...step,
      ...(step.type === "repeat"
        ? {
            repeat: Math.max(2, Number(step.repeat) || 2),
            steps: clean(step.steps || []),
          }
        : {}),
    }));
  return {
    name: name.trim() || "Treino de corrida",
    description: description.trim() || undefined,
    date: date || undefined,
    steps: clean(steps),
  };
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Zap size={compact ? 18 : 21} />
      </div>
      <div>
        <div className="brand-name">RunSync</div>
        {!compact && (
          <div className="brand-tagline">Treinos que acompanham você</div>
        )}
      </div>
    </div>
  );
}
function ToastStack({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
}) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <div className="toast-icon">
            {toast.tone === "success" ? (
              <Check size={16} />
            ) : toast.tone === "error" ? (
              <X size={16} />
            ) : (
              <Activity size={16} />
            )}
          </div>
          <div>
            <strong>{toast.title}</strong>
            {toast.message && <p>{toast.message}</p>}
          </div>
          <button
            className="icon-button small"
            onClick={() => dismiss(toast.id)}
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={22} />
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
      {action && (
        <button className="text-button" onClick={action}>
          {actionLabel} <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

function AppNav({
  tab,
  setTab,
  garmin,
  mobile = false,
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  garmin: GarminStatus;
  mobile?: boolean;
}) {
  const items: { id: Tab; label: string; icon: typeof HomeIcon }[] = [
    { id: "home", label: "Visão geral", icon: HomeIcon },
    { id: "workout", label: "Novo treino", icon: Plus },
    { id: "calendar", label: "Calendário", icon: CalendarDays },
    { id: "workouts", label: "Meus treinos", icon: ClipboardList },
    { id: "activities", label: "Atividades", icon: Activity },
    { id: "garmin", label: "Conexão Garmin", icon: Watch },
  ];
  return (
    <nav className={mobile ? "mobile-nav" : "sidebar-nav"}>
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`nav-item ${tab === id ? "active" : ""}`}
          onClick={() => setTab(id)}
        >
          <Icon size={18} />
          <span>{label}</span>
          {id === "garmin" && (
            <span
              className={`nav-status ${garmin.connected ? "online" : ""}`}
            />
          )}
        </button>
      ))}
    </nav>
  );
}

function StepEditor({
  step,
  onChange,
  onRemove,
  onDuplicate,
  nested = false,
}: {
  step: WorkoutStep;
  onChange: (step: WorkoutStep) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  nested?: boolean;
}) {
  const Icon = stepIcons[step.type];
  const duration = step.duration || emptyDuration();
  const setDuration = (next: WorkoutDuration) =>
    onChange({ ...step, duration: next });
  const setTarget = (target?: WorkoutTarget) => onChange({ ...step, target });
  return (
    <div className={`step-editor ${nested ? "nested" : ""}`}>
      <div className="step-editor-head">
        <div className="step-number">
          <Icon size={16} />
        </div>
        <select
          value={step.type}
          onChange={(e) =>
            onChange({
              ...step,
              type: e.target.value as WorkoutStepType,
              duration:
                e.target.value === "cooldown"
                  ? { type: "lap" }
                  : step.duration || emptyDuration(),
            })
          }
        >
          {Object.entries(stepLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div className="step-actions">
          <button
            className="icon-button"
            onClick={onDuplicate}
            title="Duplicar"
          >
            <Copy size={15} />
          </button>
          <button
            className="icon-button danger"
            onClick={onRemove}
            title="Remover"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {step.type === "repeat" ? (
        <div className="repeat-editor">
          <label>
            Repetir{" "}
            <input
              type="number"
              min={2}
              max={99}
              value={step.repeat || 2}
              onChange={(e) =>
                onChange({ ...step, repeat: Number(e.target.value) })
              }
            />
            <span>vezes</span>
          </label>
          <div className="nested-steps">
            {(step.steps || []).map((child, index) => (
              <StepEditor
                key={index}
                step={child}
                nested
                onChange={(next) =>
                  onChange({
                    ...step,
                    steps: step.steps?.map((item, i) =>
                      i === index ? next : item,
                    ),
                  })
                }
                onRemove={() =>
                  onChange({
                    ...step,
                    steps: step.steps?.filter((_, i) => i !== index),
                  })
                }
                onDuplicate={() =>
                  onChange({
                    ...step,
                    steps: [...(step.steps || []), { ...child }],
                  })
                }
              />
            ))}
          </div>
          <button
            className="text-button"
            onClick={() =>
              onChange({
                ...step,
                steps: [...(step.steps || []), defaultStep("run")],
              })
            }
          >
            <Plus size={14} /> Adicionar etapa na repetição
          </button>
        </div>
      ) : (
        <>
          <div className="editor-row">
            <div>
              <label>Duração</label>
              <select
                value={duration.type}
                onChange={(e) =>
                  setDuration(
                    e.target.value === "lap"
                      ? { type: "lap" }
                      : {
                          type: e.target.value as "time" | "distance",
                          value:
                            duration.type === e.target.value
                              ? duration.value
                              : e.target.value === "time"
                                ? 300
                                : 1000,
                        },
                  )
                }
              >
                <option value="time">Tempo</option>
                <option value="distance">Distância</option>
                <option value="lap">LAP</option>
              </select>
            </div>
            {duration.type === "time" && (
              <div className="duration-inputs">
                <label>
                  Minutos
                  <input
                    type="number"
                    min={0}
                    value={Math.floor(duration.value / 60)}
                    onChange={(e) =>
                      setDuration({
                        type: "time",
                        value:
                          Number(e.target.value) * 60 + (duration.value % 60),
                      })
                    }
                  />
                </label>
                <label>
                  Segundos
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={duration.value % 60}
                    onChange={(e) =>
                      setDuration({
                        type: "time",
                        value:
                          Math.floor(duration.value / 60) * 60 +
                          Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
            )}
            {duration.type === "distance" && (
              <div>
                <label>Metros</label>
                <input
                  type="number"
                  min={1}
                  value={duration.value}
                  onChange={(e) =>
                    setDuration({
                      type: "distance",
                      value: Number(e.target.value),
                    })
                  }
                />
              </div>
            )}
          </div>
          <div className="editor-row target-row">
            <div>
              <label>Alvo</label>
              <select
                value={step.target?.type || "none"}
                onChange={(e) => {
                  const value = e.target.value;
                  setTarget(
                    value === "pace"
                      ? { type: "pace", min: "5:00", max: "5:30" }
                      : value === "heart_rate"
                        ? { type: "heart_rate", min: 140, max: 170 }
                        : value === "heart_rate_zone"
                          ? { type: "heart_rate_zone", zone: 3 }
                          : undefined,
                  );
                }}
              >
                <option value="none">Sem alvo</option>
                <option value="pace">Pace</option>
                <option value="heart_rate">Frequência cardíaca</option>
                <option value="heart_rate_zone">Zona de FC</option>
              </select>
            </div>
            {step.target?.type === "pace" && (
              <div className="duration-inputs">
                <label>
                  Pace mínimo
                  <input
                    value={step.target.min}
                    placeholder="5:00"
                    onChange={(e) =>
                      setTarget({ ...step.target, min: e.target.value })
                    }
                  />
                </label>
                <label>
                  Pace máximo
                  <input
                    value={step.target.max}
                    placeholder="5:30"
                    onChange={(e) =>
                      setTarget({ ...step.target, max: e.target.value })
                    }
                  />
                </label>
              </div>
            )}
            {step.target?.type === "heart_rate" && (
              <div className="duration-inputs">
                <label>
                  FC mínima
                  <input
                    type="number"
                    value={step.target.min}
                    onChange={(e) =>
                      setTarget({ ...step.target, min: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  FC máxima
                  <input
                    type="number"
                    value={step.target.max}
                    onChange={(e) =>
                      setTarget({ ...step.target, max: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
            )}
            {step.target?.type === "heart_rate_zone" && (
              <div>
                <label>Zona</label>
                <select
                  value={step.target.zone}
                  onChange={(e) =>
                    setTarget({
                      type: "heart_rate_zone",
                      zone: Number(e.target.value),
                    })
                  }
                >
                  {[1, 2, 3, 4, 5].map((zone) => (
                    <option key={zone} value={zone}>
                      Zona {zone}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function StepPreview({
  steps,
  level = 0,
}: {
  steps: WorkoutStep[];
  level?: number;
}) {
  return (
    <div className={`preview-steps ${level ? "preview-nested" : ""}`}>
      {steps.map((step, index) => {
        const Icon = stepIcons[step.type];
        return (
          <div key={index} className="preview-step">
            <div className="preview-icon">
              <Icon size={15} />
            </div>
            <div className="preview-copy">
              <strong>{stepLabels[step.type]}</strong>
              <span>{stepSummary(step)}</span>
              {step.type === "repeat" && step.steps && (
                <StepPreview steps={step.steps} level={level + 1} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkoutComposer({
  addToast,
  onSent,
}: {
  addToast: (tone: Toast["tone"], title: string, message?: string) => void;
  onSent: () => void;
}) {
  const [mode, setMode] = useState<EditorMode>("visual");
  const [name, setName] = useState(defaultPayload.name);
  const [description, setDescription] = useState(
    defaultPayload.description || "",
  );
  const [date, setDate] = useState(defaultPayload.date || "");
  const [steps, setSteps] = useState<WorkoutStep[]>(defaultPayload.steps);
  const [text, setText] = useState(payloadToText(defaultPayload));
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState(false);
  const [jsonError, setJsonError] = useState("");
  const payload = useMemo(
    () =>
      mode === "visual"
        ? visualToPayload(name, description, date, steps)
        : parseWorkoutJson(text).payload,
    [mode, name, description, date, steps, text],
  );
  function switchMode(next: EditorMode) {
    if (next === "json" && mode === "visual") {
      const visualPayload = visualToPayload(name, description, date, steps);
      setText(
        payloadToText({ ...visualPayload, date: visualPayload.date || null }),
      );
    }
    setMode(next);
    setJsonError("");
  }
  function validateJson() {
    const parsed = parseWorkoutJson(text);
    const error = parsed.error || validateWorkoutPayload(parsed.payload);
    if (error) {
      setJsonError(error);
      return false;
    }
    setJsonError("");
    return true;
  }
  async function pasteJson() {
    editorRef.current?.focus();
    if (!navigator.clipboard?.readText) {
      addToast(
        "info",
        "Cole manualmente",
        "Toque no editor e use a opção de colar do celular.",
      );
      return;
    }
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
      const parsed = parseWorkoutJson(clipboardText);
      const error = parsed.error || validateWorkoutPayload(parsed.payload);
      setJsonError(error);
      addToast(
        error ? "error" : "success",
        error ? "JSON inválido" : "JSON colado",
        error || "Revise o treino ou clique em Validar e enviar.",
      );
    } catch {
      addToast(
        "info",
        "Cole manualmente",
        "A permissão do clipboard foi negada. Toque no editor e cole pelo celular.",
      );
      editorRef.current?.focus();
    }
  }
  async function copyWorkoutJson() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      addToast("info", "JSON copiado", "O treino está na área de transferência.");
    } catch {
      addToast("error", "Não foi possível copiar", "Selecione o JSON manualmente.");
    }
  }
  async function send() {
    if (!validateJson() || !payload) return;
    setBusy(true);
    try {
      await api("/api/workouts/validate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const result = (await api("/api/workouts/send", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as { message: string };
      addToast("success", "Treino enviado com sucesso", result.message);
      onSent();
    } catch (error) {
      addToast("error", "Não foi possível enviar", friendlyError(error));
    } finally {
      setBusy(false);
    }
  }
  function updateStep(index: number, next: WorkoutStep) {
    setSteps((current) =>
      current.map((item, i) => (i === index ? next : item)),
    );
  }
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Preparação</span>
          <h1>Novo treino</h1>
          <p>
            Monte sua sessão e envie para o Garmin Connect em poucos passos.
          </p>
        </div>
        <div className="heading-actions">
          <button
            className={`mode-button ${mode === "visual" ? "active" : ""}`}
            onClick={() => switchMode("visual")}
          >
            <Settings2 size={16} /> Editor visual
          </button>
          <button
            className={`mode-button ${mode === "json" ? "active" : ""}`}
            onClick={() => switchMode("json")}
          >
            <FileJson size={16} /> JSON avançado
          </button>
        </div>
      </div>
      {mode === "visual" ? (
        <div className="composer-grid">
          <section className="panel composer-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Detalhes do treino</span>
                <h2>O que você vai fazer?</h2>
              </div>
              <span className="step-count">{steps.length} etapas</span>
            </div>
            <div className="field-grid">
              <label>
                Nome do treino
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Lagoa · 6x2 min"
                />
              </label>
              <label>
                Data <span className="optional">opcional</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>
            <label>
              Descrição <span className="optional">opcional</span>
              <textarea
                className="small-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Uma nota para lembrar o objetivo da sessão"
              />
            </label>
            <div className="section-heading stages-heading">
              <div>
                <span className="eyebrow">Estrutura</span>
                <h2>Etapas do treino</h2>
              </div>
            </div>
            <div className="step-editors">
              {steps.map((step, index) => (
                <div key={index} className="step-with-move">
                  <div className="move-controls">
                    <button
                      className="icon-button small"
                      disabled={index === 0}
                      onClick={() =>
                        setSteps((current) => {
                          const next = [...current];
                          [next[index - 1], next[index]] = [
                            next[index],
                            next[index - 1],
                          ];
                          return next;
                        })
                      }
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      className="icon-button small"
                      disabled={index === steps.length - 1}
                      onClick={() =>
                        setSteps((current) => {
                          const next = [...current];
                          [next[index + 1], next[index]] = [
                            next[index],
                            next[index + 1],
                          ];
                          return next;
                        })
                      }
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>
                  <StepEditor
                    step={step}
                    onChange={(next) => updateStep(index, next)}
                    onRemove={() =>
                      setSteps((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                    onDuplicate={() =>
                      setSteps((current) => [
                        ...current.slice(0, index + 1),
                        { ...step },
                        ...current.slice(index + 1),
                      ])
                    }
                  />
                </div>
              ))}
            </div>
            <div className="add-step-row">
              <select id="add-step" defaultValue="run">
                <option value="warmup">Aquecimento</option>
                <option value="run">Corrida</option>
                <option value="interval">Intervalo</option>
                <option value="recovery">Recuperação</option>
                <option value="cooldown">Desaquecimento</option>
                <option value="repeat">Repetição</option>
              </select>
              <button
                className="text-button"
                onClick={() => {
                  const select = document.getElementById(
                    "add-step",
                  ) as HTMLSelectElement;
                  const type = select.value as WorkoutStepType;
                  setSteps((current) => [
                    ...current,
                    type === "repeat"
                      ? {
                          type,
                          repeat: 6,
                          steps: [
                            defaultStep("interval"),
                            defaultStep("recovery"),
                          ],
                        }
                      : defaultStep(type),
                  ]);
                }}
              >
                <Plus size={16} /> Adicionar etapa
              </button>
            </div>
          </section>
          <aside className="panel preview-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Ao vivo</span>
                <h2>Prévia do treino</h2>
              </div>
              <div className="preview-dot">
                <span /> Garmin
              </div>
            </div>
            <div className="preview-title">
              <h3>{name || "Treino sem nome"}</h3>
              {date && (
                <span>
                  <CalendarDays size={14} /> {formatDate(date)}
                </span>
              )}
              {description && <p>{description}</p>}
            </div>
            <StepPreview steps={steps} />
            <div className="send-box">
              <div className="send-box-icon">
                <CloudUpload size={19} />
              </div>
              <div>
                <strong>Pronto para sincronizar?</strong>
                <p>
                  {date
                    ? "O treino será criado e agendado na sua Garmin."
                    : "O treino será criado na sua Garmin."}
                </p>
              </div>
            </div>
            <button
              className="primary-button full"
              onClick={send}
              disabled={busy || !steps.length || !name.trim()}
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="spin" /> Enviando...
                </>
              ) : (
                <>
                  <CloudUpload size={17} /> Enviar para Garmin
                </>
              )}
            </button>
          </aside>
        </div>
      ) : (
        <section className="panel json-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Modo avançado</span>
              <h2>JSON do treino</h2>
              <p>Use o formato estruturado quando quiser ter controle total.</p>
            </div>
            <div className="json-actions">
              <button
                className="secondary-button"
                onClick={() => void pasteJson()}
              >
                <Clipboard size={15} /> Colar JSON
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  const parsed = parseWorkoutJson(text);
                  if (!parsed.error && parsed.payload) {
                    setText(JSON.stringify(parsed.payload, null, 2));
                    setJsonError("");
                  } else {
                    setJsonError(
                      parsed.error || "Não foi possível formatar este JSON.",
                    );
                  }
                }}
              >
                <SparklesIcon /> Formatar
              </button>
              <button
                className="secondary-button"
                onClick={() => void copyWorkoutJson()}
              >
                <Clipboard size={15} /> Copiar
              </button>
            </div>
          </div>
          <textarea
            ref={editorRef}
            className="json-editor"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setJsonError("");
            }}
            spellCheck={false}
            aria-label="JSON do treino"
          />
          {jsonError && <div className="inline-error">{jsonError}</div>}
          <div className="json-footer">
            <span>
              <ShieldCheck size={15} /> Compatível com a API RunSync
            </span>
            <button className="primary-button" onClick={send} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={17} className="spin" /> Enviando...
                </>
              ) : (
                <>
                  <CloudUpload size={17} /> Validar e enviar
                </>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
function SparklesIcon() {
  return <Zap size={15} />;
}

function HomeDashboard({
  garmin,
  calendar,
  activities,
  setTab,
}: {
  garmin: GarminStatus;
  calendar: CalendarWorkout[];
  activities: ActivitySummary[];
  setTab: (tab: Tab) => void;
}) {
  const upcoming = calendar
    .filter(
      (item) => item.date && item.date >= new Date().toISOString().slice(0, 10),
    )
    .slice(0, 3);
  return (
    <div className="page-stack">
      <div className="hero">
        <div>
          <span className="eyebrow">Seu ritmo, sua rotina</span>
          <h1>
            Bom treino<span className="accent-dot">.</span>
          </h1>
          <p>
            Crie sessões estruturadas e mantenha sua Garmin sempre pronta para o
            próximo desafio.
          </p>
        </div>
        <button className="primary-button" onClick={() => setTab("workout")}>
          <Plus size={17} /> Criar treino
        </button>
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <Activity className="hero-icon" size={96} />
      </div>
      <div className="stats-grid">
        <button className="stat-card" onClick={() => setTab("garmin")}>
          <div className={`stat-icon ${garmin.connected ? "green" : "orange"}`}>
            <Watch size={19} />
          </div>
          <div>
            <span>Status Garmin</span>
            <strong>{garmin.connected ? "Conectada" : "Desconectada"}</strong>
          </div>
          <span
            className={`status-pill ${garmin.connected ? "success" : "warning"}`}
          >
            {garmin.connected ? "Online" : "Ação necessária"}
          </span>
        </button>
        <button className="stat-card" onClick={() => setTab("activities")}>
          <div className="stat-icon purple">
            <Activity size={19} />
          </div>
          <div>
            <span>Última corrida</span>
            <strong>{activities[0]?.name || "Nenhuma ainda"}</strong>
          </div>
          <span className="stat-link">
            Ver atividades <ChevronRight size={14} />
          </span>
        </button>
        <button className="stat-card" onClick={() => setTab("calendar")}>
          <div className="stat-icon blue">
            <CalendarDays size={19} />
          </div>
          <div>
            <span>Próximo treino</span>
            <strong>
              {upcoming[0] ? formatDate(upcoming[0].date) : "Nenhum"}
            </strong>
          </div>
          <span className="stat-link">
            Calendário <ChevronRight size={14} />
          </span>
        </button>
        <div className="stat-card">
          <div className="stat-icon teal">
            <Wifi size={19} />
          </div>
          <div>
            <span>API RunSync</span>
            <strong>Operacional</strong>
          </div>
          <span className="status-pill success">Online</span>
        </div>
      </div>
      <div className="content-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Agenda</span>
              <h2>Próximos treinos</h2>
            </div>
            <button className="text-button" onClick={() => setTab("calendar")}>
              Ver todos <ChevronRight size={15} />
            </button>
          </div>
          {upcoming.length ? (
            <div className="list-stack">
              {upcoming.map((item, index) => (
                <div
                  className="upcoming-item"
                  key={`${item.workout_id}-${index}`}
                >
                  <div className="date-block">
                    <strong>{item.date?.slice(8, 10)}</strong>
                    <span>
                      {item.date
                        ? new Intl.DateTimeFormat("pt-BR", { month: "short" })
                            .format(new Date(`${item.date}T12:00:00`))
                            .replace(".", "")
                        : ""}
                    </span>
                  </div>
                  <div>
                    <strong>{item.name}</strong>
                    <p>Workout #{item.workout_id || "—"}</p>
                  </div>
                  <span className="status-pill neutral">Agendado</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Sua agenda está livre"
              description="Crie seu próximo treino para começar."
              action={() => setTab("workout")}
              actionLabel="Criar treino"
            />
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Sincronizações</span>
              <h2>Atividade recente</h2>
            </div>
            <button className="text-button" onClick={() => setTab("activities")}>
              Ver tudo <ChevronRight size={15} />
            </button>
          </div>
          {activities.length ? (
            <div className="list-stack">
              {activities.slice(0, 4).map((item) => (
                <div className="activity-item" key={String(item.activityId)}>
                  <div className="activity-icon">
                    <Activity size={15} />
                  </div>
                  <div>
                    <strong>{item.name || "Corrida sem nome"}</strong>
                    <p>
                      {formatDate(item.startTime, true)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="Nenhuma corrida ainda"
              description="As atividades disponíveis na Garmin aparecerão aqui."
              action={() => setTab("activities")}
              actionLabel="Ver atividades"
            />
          )}
        </section>
      </div>
    </div>
  );
}

function CalendarView({
  items,
  loading,
  month,
  setMonth,
  onRefresh,
}: {
  items: CalendarWorkout[];
  loading: boolean;
  month: Date;
  setMonth: (date: Date) => void;
  onRefresh: () => void;
}) {
  const [selectedItem, setSelectedItem] = useState<CalendarWorkout | null>(
    null,
  );
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarWorkout[]>();
    items.forEach((item) => {
      const key = dateKey(item.date);
      if (!key) return;
      grouped.set(key, [...(grouped.get(key) || []), item]);
    });
    return grouped;
  }, [items]);
  const visibleItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const left = dateKey(a.date) || "9999-99-99";
        const right = dateKey(b.date) || "9999-99-99";
        return left.localeCompare(right) || a.name.localeCompare(b.name);
      }),
    [items],
  );
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const today = localDateKey();
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Planejamento</span>
          <h1>Calendário Garmin</h1>
          <p>Visualize o que vem pela frente e mantenha a consistência.</p>
        </div>
        <button className="secondary-button" onClick={onRefresh}>
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>
      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="calendar-toolbar">
            <button
              className="icon-button"
              onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <h2>
              {new Intl.DateTimeFormat("pt-BR", {
                month: "long",
                year: "numeric",
              }).format(month)}
            </h2>
            <button
              className="icon-button"
              onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
            >
              <ChevronRight size={18} />
            </button>
            <button
              className="text-button today-button"
              onClick={() => setMonth(new Date())}
            >
              Hoje
            </button>
          </div>
          <div className="weekdays">
            {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {cells.map((day, index) => {
              const date = day
                ? `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : "";
              const dayItems = itemsByDate.get(date) || [];
              return (
                <div
                  className={`calendar-cell ${day ? "" : "blank"} ${date === today ? "today" : ""}`}
                  key={`${date || "blank"}-${index}`}
                >
                  {day && (
                    <>
                      <span className="day-number">{day}</span>
                      {dayItems.length > 0 && (
                        <div className="calendar-workouts">
                          {dayItems.slice(0, 3).map((item, itemIndex) => (
                            <button
                              className="calendar-workout"
                              title={item.name}
                              key={`${item.workout_id || item.name}-${itemIndex}`}
                              onClick={() => setSelectedItem(item)}
                            >
                              <span />
                              {item.name || "Treino sem nome"}
                            </button>
                          ))}
                          {dayItems.length > 3 && (
                            <button
                              className="calendar-more"
                              onClick={() => setSelectedItem(dayItems[3])}
                            >
                              +{dayItems.length - 3} treinos
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {loading && (
            <div className="calendar-overlay">
              <Loader2 className="spin" size={22} /> Carregando calendário...
            </div>
          )}
          {!loading && !itemsByDate.size && (
            <EmptyState
              icon={CalendarDays}
              title="Nenhum treino com data neste mês"
              description={
                items.length
                  ? "Há treinos sem data agendada. Veja a lista ao lado."
                  : "Escolha uma data ao criar seu próximo treino."
              }
            />
          )}
        </section>
        <aside className="panel calendar-list-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Lista rápida</span>
              <h2>Treinos do mês</h2>
              <p>
                {visibleItems.length} treino
                {visibleItems.length === 1 ? "" : "s"} encontrado
                {visibleItems.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {visibleItems.length ? (
            <div className="list-stack">
              {visibleItems.map((item, index) => {
                const key = dateKey(item.date);
                return (
                  <button
                    className={`calendar-list-item calendar-list-button ${selectedItem === item ? "selected" : ""}`}
                    key={`${item.workout_id || item.name}-${key}-${index}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="date-block small">
                      <strong>{key ? key.slice(8, 10) : "—"}</strong>
                      <span>
                        {key
                          ? new Intl.DateTimeFormat("pt-BR", {
                              month: "short",
                            })
                              .format(new Date(`${key}T12:00:00`))
                              .replace(".", "")
                          : "sem data"}
                      </span>
                    </div>
                    <div>
                      <strong>{item.name || "Treino sem nome"}</strong>
                      <p>Workout #{item.workout_id || "—"}</p>
                    </div>
                    <ChevronRight className="calendar-list-arrow" size={15} />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="muted-copy">Nenhum treino neste período.</p>
          )}
          {selectedItem && (
            <div className="calendar-selection">
              <div className="calendar-selection-head">
                <span className="eyebrow">Treino selecionado</span>
                <button
                  className="icon-button small"
                  onClick={() => setSelectedItem(null)}
                  aria-label="Fechar detalhes"
                >
                  <X size={14} />
                </button>
              </div>
              <strong>{selectedItem.name || "Treino sem nome"}</strong>
              <p>
                {dateKey(selectedItem.date)
                  ? formatDate(dateKey(selectedItem.date))
                  : "Sem data agendada"}
              </p>
              {selectedItem.workout_id && (
                <code>Workout #{selectedItem.workout_id}</code>
              )}
            </div>
          )}
          {items.some((item) => !dateKey(item.date)) && (
            <p className="calendar-unassigned">
              <CalendarDays size={14} /> Alguns treinos ainda estão sem data
              agendada.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function GarminView({
  status,
  state,
  onConnect,
  busy,
  addToast,
}: {
  status: GarminStatus;
  state: ConnectionState;
  onConnect: (
    email: string,
    password: string,
    mfa: string,
  ) => Promise<"mfa" | "ok">;
  busy: boolean;
  addToast: (tone: Toast["tone"], title: string, message?: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfa, setMfa] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [showForm, setShowForm] = useState(!status.connected);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await onConnect(email, password, mfa);
      if (result === "mfa") setNeedsMfa(true);
      else {
        setNeedsMfa(false);
        setShowForm(false);
        setPassword("");
        setMfa("");
        addToast(
          "success",
          "Garmin conectada",
          "Sua conta está pronta para sincronizar treinos.",
        );
      }
    } catch (error) {
      addToast("error", "Falha na conexão", friendlyError(error));
    }
  }
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Integração</span>
          <h1>Conexão Garmin</h1>
          <p>
            Uma conexão segura para enviar seus treinos direto para o relógio.
          </p>
        </div>
      </div>
      <section
        className={`connection-card ${status.connected ? "connected" : ""}`}
      >
        <div className="connection-visual">
          <div className="watch-orbit">
            <Watch size={44} />
          </div>
          <div className="connection-pulse" />
        </div>
        <div className="connection-copy">
          <span
            className={`status-pill ${status.connected ? "success" : "warning"}`}
          >
            {state === "loading"
              ? "Verificando..."
              : status.connected
                ? "Conectada"
                : "Desconectada"}
          </span>
          <h2>
            {status.connected
              ? "Garmin Connect está pronta"
              : "Conecte sua conta Garmin"}
          </h2>
          <p>
            {status.connected
              ? `Conta conectada${status.email ? ` como ${status.email}` : ""}. Seus próximos treinos serão enviados com segurança.`
              : "Conecte uma vez para começar a enviar treinos estruturados sem cadastro manual."}
          </p>
          {(!status.connected || showForm) && (
            <form className="garmin-form" onSubmit={submit}>
              <label>
                E-mail Garmin
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                />
              </label>
              <label>
                Senha Garmin
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required={!needsMfa}
                />
              </label>
              {needsMfa && (
                <label>
                  Código de verificação
                  <input
                    inputMode="numeric"
                    value={mfa}
                    onChange={(e) => setMfa(e.target.value)}
                    placeholder="Código enviado pela Garmin"
                    required
                  />
                </label>
              )}
              <button className="primary-button" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={16} className="spin" /> Conectando...
                  </>
                ) : needsMfa ? (
                  "Confirmar código"
                ) : (
                  "Conectar Garmin"
                )}
              </button>
            </form>
          )}
          {status.connected && !showForm && (
            <button className="secondary-button" onClick={() => setShowForm(true)}>
              <RefreshCw size={15} /> Reconectar
            </button>
          )}
          <div className="security-note">
            <ShieldCheck size={17} />
            <span>
              <strong>Seus dados estão protegidos.</strong> A senha Garmin é
              usada somente durante a autenticação e nunca é armazenada. O
              backend guarda apenas os tokens temporários da sessão; eles podem
              desaparecer quando o Render reiniciar.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [garmin, setGarmin] = useState<GarminStatus>({ connected: false });
  const [garminState, setGarminState] = useState<ConnectionState>("loading");
  const [garminBusy, setGarminBusy] = useState(false);
  const [calendar, setCalendar] = useState<CalendarWorkout[]>([]);
  const [workouts, setWorkouts] = useState<GarminWorkout[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  function addToast(tone: Toast["tone"], title: string, message?: string) {
    const id = Date.now();
    setToasts((current) => [...current, { id, tone, title, message }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      5000,
    );
  }
  useEffect(() => {
    setAuthenticated(!!getToken());
    const storedTheme = window.localStorage.getItem("runsync_theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setDarkMode(storedTheme ? storedTheme === "dark" : prefersDark);
    document.documentElement.classList.toggle(
      "dark",
      storedTheme === "dark" || (!storedTheme && prefersDark),
    );
  }, []);
  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      document.documentElement.classList.toggle("dark", next);
      window.localStorage.setItem("runsync_theme", next ? "dark" : "light");
      return next;
    });
  }
  async function refreshGarmin() {
    setGarminState("loading");
    try {
      const result = (await api("/api/garmin/status")) as GarminStatus;
      setGarmin(result);
      setGarminState(result.connected ? "connected" : "disconnected");
    } catch {
      setGarminState("error");
    }
  }
  async function loadData(targetMonth = month) {
    setLoadingData(true);
    try {
      const calendarResult = await api(
        `/api/calendar?year=${targetMonth.getFullYear()}&month=${targetMonth.getMonth() + 1}`,
      );
      const garminItems =
        (calendarResult as { items?: CalendarWorkout[] }).items || [];
      setCalendar(garminItems);
    } catch (error) {
      addToast(
        "error",
        "Não foi possível carregar os dados",
        friendlyError(error),
      );
    } finally {
      setLoadingData(false);
    }
  }
  async function loadActivities() {
    setActivitiesLoading(true);
    try {
      const result = await api("/api/activities?limit=20&type=running");
      setActivities(Array.isArray(result) ? (result as ActivitySummary[]) : []);
    } catch (error) {
      if (tab === "activities") {
        addToast("error", "Não foi possível carregar as atividades", friendlyError(error));
      }
    } finally {
      setActivitiesLoading(false);
    }
  }
  async function loadWorkouts() {
    setWorkoutsLoading(true);
    try {
      const result = await api("/api/workouts?limit=100&start=0");
      setWorkouts(Array.isArray(result) ? (result as GarminWorkout[]) : []);
    } catch (error) {
      if (tab === "workouts") {
        addToast("error", "NÃ£o foi possÃ­vel carregar os treinos", friendlyError(error));
      }
    } finally {
      setWorkoutsLoading(false);
    }
  }
  async function deleteWorkout(workoutId: number) {
    await api(workoutDeletePath(workoutId), { method: "DELETE" });
    setWorkouts((current) => removeWorkoutById(current, workoutId));
  }
  useEffect(() => {
    if (authenticated) {
      void refreshGarmin();
      void loadData();
      void loadActivities();
      void loadWorkouts();
    }
  }, [authenticated]);
  useEffect(() => {
    if (authenticated && tab === "calendar") void loadData(month);
  }, [month]);
  useEffect(() => {
    if (authenticated && tab === "activities") void loadActivities();
  }, [tab]);
  useEffect(() => {
    if (authenticated && tab === "workouts") void loadWorkouts();
  }, [tab]);
  function navigate(next: Tab) {
    setTab(next);
    setMobileOpen(false);
  }
  async function doLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const result = (await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      })) as { token: string };
      saveToken(result.token);
      setAuthenticated(true);
    } catch (error) {
      setLoginError(friendlyError(error));
    } finally {
      setLoginBusy(false);
    }
  }
  async function connectGarmin(
    email: string,
    pass: string,
    mfa: string,
  ): Promise<"mfa" | "ok"> {
    setGarminBusy(true);
    try {
      await api("/api/garmin/login", {
        method: "POST",
        body: JSON.stringify({ email, password: pass, mfa_code: mfa || null }),
      });
      await refreshGarmin();
      return "ok";
    } catch (error) {
      if ((error as { status?: number }).status === 428) return "mfa";
      throw error;
    } finally {
      setGarminBusy(false);
    }
  }
  if (!authenticated)
    return (
      <main className="auth-page">
        <div className="auth-glow" />
        <section className="auth-card">
          <Brand />
          <div className="auth-intro">
            <span className="eyebrow">Treine melhor</span>
            <h1>
              Seu próximo treino começa aqui
              <span className="accent-dot">.</span>
            </h1>
            <p>
              Crie sessões estruturadas e envie direto para o Garmin Connect.
            </p>
          </div>
          <form onSubmit={doLogin}>
            <label>
              Senha de acesso
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                autoFocus
                required
              />
            </label>
            {loginError && <div className="inline-error">{loginError}</div>}
            <button className="primary-button full" disabled={loginBusy}>
              {loginBusy ? (
                <>
                  <Loader2 size={17} className="spin" /> Conectando...
                </>
              ) : (
                <>
                  Entrar <ChevronRight size={17} />
                </>
              )}
            </button>
          </form>
          <div className="auth-footer">
            <ShieldCheck size={14} /> Ambiente privado e protegido
          </div>
        </section>
        <div className="auth-aside">
          <Activity size={30} />
          <strong>Do plano ao relógio.</strong>
          <span>Menos cadastro. Mais quilômetros.</span>
        </div>
      </main>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-label">Workspace</div>
        <AppNav tab={tab} setTab={navigate} garmin={garmin} />
        <div className="sidebar-bottom">
          <button className="theme-toggle" onClick={toggleTheme}>
            <span className="theme-toggle-icon">
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </span>
            <span>{darkMode ? "Modo claro" : "Modo escuro"}</span>
          </button>
          <div className="sidebar-status">
            <span
              className={`status-dot ${garmin.connected ? "online" : ""}`}
            />
            <div>
              <strong>Garmin</strong>
              <span>{garmin.connected ? "Conectada" : "Desconectada"}</span>
            </div>
          </div>
          <button
            className="logout-button"
            onClick={() => {
              clearToken();
              setAuthenticated(false);
            }}
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
      <div className="mobile-header">
        <button className="icon-button" onClick={() => setMobileOpen(true)}>
          <Menu size={20} />
        </button>
        <Brand compact />
        <span className={`status-dot ${garmin.connected ? "online" : ""}`} />
      </div>
      {mobileOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobileOpen(false)}
        >
          <aside className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <Brand />
              <button
                className="icon-button"
                onClick={() => setMobileOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <AppNav tab={tab} setTab={navigate} garmin={garmin} mobile />
          </aside>
        </div>
      )}
      <main className="main-content">
        {tab === "home" && (
          <HomeDashboard
            garmin={garmin}
            calendar={calendar}
            activities={activities}
            setTab={navigate}
          />
        )}
        {tab === "workout" && (
          <WorkoutComposer
            addToast={addToast}
            onSent={() => {
              void loadData();
            }}
          />
        )}
        {tab === "calendar" && (
          <CalendarView
            items={calendar}
            loading={loadingData}
            month={month}
            setMonth={setMonth}
            onRefresh={() => void loadData(month)}
          />
        )}
        {tab === "workouts" && (
          <WorkoutsView
            items={workouts}
            loading={workoutsLoading}
            onRefresh={() => void loadWorkouts()}
            onDelete={deleteWorkout}
            addToast={addToast}
          />
        )}
        {tab === "activities" && (
          <ActivitiesView
            items={activities}
            loading={activitiesLoading}
            onRefresh={() => void loadActivities()}
            addToast={addToast}
          />
        )}
        {tab === "garmin" && (
          <GarminView
            status={garmin}
            state={garminState}
            onConnect={connectGarmin}
            busy={garminBusy}
            addToast={addToast}
          />
        )}
      </main>
      <ToastStack
        toasts={toasts}
        dismiss={(id) =>
          setToasts((current) => current.filter((toast) => toast.id !== id))
        }
      />
      <nav className="mobile-bottom-nav">
        <AppNav tab={tab} setTab={navigate} garmin={garmin} mobile />
      </nav>
    </div>
  );
}
