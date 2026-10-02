"use client";

import {
  CalendarClock,
  ClipboardList,
  Gauge,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import React, { useState } from "react";
import type { GarminWorkout, Toast } from "../lib/types";

function formatDate(value?: string | number | null) {
  if (!value) return "Data não informada";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(parsed);
}

function formatDuration(value?: string | number | null) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "Duração não informada";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}min`;
}

function formatDistance(value?: string | number | null) {
  const meters = Number(value);
  if (!Number.isFinite(meters) || meters <= 0) return "Distância não informada";
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

export function WorkoutsView({
  items,
  loading,
  onRefresh,
  onDelete,
  addToast,
}: {
  items: GarminWorkout[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (workoutId: number) => Promise<void>;
  addToast: (tone: Toast["tone"], title: string, message?: string) => void;
}) {
  const [pending, setPending] = useState<GarminWorkout | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    try {
      await onDelete(pending.workoutId);
      addToast("success", "Treino excluído", "As atividades já realizadas foram mantidas.");
      setPending(null);
    } catch (error) {
      addToast(
        "error",
        "Não foi possível excluir o treino",
        error instanceof Error ? error.message : "Tente novamente.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-stack workouts-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Garmin Connect</span>
          <h1>Meus treinos</h1>
          <p>Consulte e remova modelos de treino salvos na Garmin.</p>
        </div>
        <button className="secondary-button" onClick={onRefresh} disabled={loading}>
          {loading ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
          Atualizar
        </button>
      </div>

      <section className="panel workouts-panel">
        <div className="workout-list-heading">
          <div>
            <span className="eyebrow">Biblioteca</span>
            <h2>{items.length} {items.length === 1 ? "treino salvo" : "treinos salvos"}</h2>
          </div>
          <ClipboardList size={20} />
        </div>
        {loading ? (
          <div className="empty-state workout-empty">
            <Loader2 size={22} className="spin" />
            <strong>Carregando treinos...</strong>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state workout-empty">
            <ClipboardList size={24} />
            <strong>Nenhum treino salvo</strong>
            <span>Crie um treino novo e envie para a Garmin para ele aparecer aqui.</span>
          </div>
        ) : (
          <div className="workout-list">
            {items.map((workout) => (
              <article className="workout-card" key={workout.workoutId}>
                <div className="workout-card-icon"><Gauge size={17} /></div>
                <div className="workout-card-main">
                  <strong title={workout.name}>{workout.name}</strong>
                  <span>{workout.sportType || "Treino Garmin"} · ID {workout.workoutId}</span>
                  <div className="workout-meta">
                    <span><CalendarClock size={13} /> {formatDate(workout.updatedAt || workout.createdAt)}</span>
                    <span>{formatDuration(workout.estimatedDuration)}</span>
                    <span>{formatDistance(workout.estimatedDistance)}</span>
                  </div>
                </div>
                <button
                  className="icon-button workout-delete"
                  title="Excluir treino"
                  aria-label={`Excluir ${workout.name}`}
                  onClick={() => setPending(workout)}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {pending && (
        <div className="details-backdrop" onClick={() => !deleting && setPending(null)}>
          <section
            className="details-modal workout-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-workout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="details-header">
              <div>
                <span className="eyebrow">Confirmar exclusão</span>
                <h2 id="delete-workout-title">Excluir este treino?</h2>
              </div>
              <button className="icon-button" onClick={() => setPending(null)} disabled={deleting} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <p className="workout-confirm-name">{pending.name}</p>
            <p className="detail-note">
              O modelo e qualquer agendamento explícito serão removidos da Garmin. Atividades já realizadas não serão apagadas.
            </p>
            <div className="workout-confirm-actions">
              <button className="secondary-button" onClick={() => setPending(null)} disabled={deleting}>
                Cancelar
              </button>
              <button className="danger-button" onClick={() => void confirmDelete()} disabled={deleting}>
                {deleting ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                {deleting ? "Excluindo..." : "Excluir treino"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
