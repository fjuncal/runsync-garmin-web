"use client";

import {
  Activity as ActivityIcon,
  Check,
  ChevronRight,
  Clipboard,
  Code2,
  Copy,
  Gauge,
  HeartPulse,
  Loader2,
  RefreshCw,
  Ruler,
  Thermometer,
  Timer,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { ActivityDetail, ActivitySummary, Toast } from "../lib/types";

function formatDate(value?: unknown) {
  if (!value) return "Data não informada";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
}

function formatDistance(value?: unknown) {
  const distance = Number(value);
  if (!Number.isFinite(distance)) return "—";
  return distance >= 1000
    ? `${(distance / 1000).toFixed(2).replace(".", ",")} km`
    : `${Math.round(distance)} m`;
}

function formatDuration(value?: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = Math.round(seconds % 60);
  if (hours) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  return `${minutes}min ${String(remainder).padStart(2, "0")}s`;
}

function formatNumber(value?: unknown, suffix = "") {
  if (value === undefined || value === null || value === "") return "—";
  return `${String(value)}${suffix}`;
}

function activityTitle(activity: ActivitySummary) {
  return activity.name || "Corrida sem nome";
}

function DetailMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: typeof Ruler;
}) {
  return (
    <div className="activity-metric">
      <span className="activity-metric-icon">
        <Icon size={15} />
      </span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function DataBlock({ title, value }: { title: string; value?: unknown[] }) {
  if (!value?.length) return null;
  return (
    <section className="activity-data-block">
      <div className="activity-data-heading">
        <h3>{title}</h3>
        <span>{value.length} itens</span>
      </div>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}

function ActivityDetailPanel({
  activity,
  onClose,
  addToast,
}: {
  activity: ActivitySummary;
  onClose: () => void;
  addToast: (tone: Toast["tone"], title: string, message?: string) => void;
}) {
  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setDetail(null);
    setCopied(false);
    setShowRaw(false);
    void api(`/api/activities/${encodeURIComponent(String(activity.activityId))}`)
      .then((result) => {
        if (active) setDetail(result as ActivityDetail);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar a atividade.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activity.activityId]);

  async function copyJson() {
    if (!detail) return;
    const coachExport = detail.coachExport || {
      summary: detail.summary,
      laps: detail.laps,
      splits: detail.splits,
    };
    const json = JSON.stringify(coachExport, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      addToast(
        "info",
        "JSON copiado",
        "A versão compacta está na área de transferência.",
      );
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      addToast("error", "Não foi possível copiar", "Selecione o JSON manualmente.");
    }
  }

  const summary = detail?.summary || activity;
  return (
    <aside className="activity-detail" aria-label="Detalhes da atividade">
      <div className="activity-detail-header">
        <div>
          <span className="eyebrow">Leitura completa</span>
          <h2>{activityTitle(summary)}</h2>
          <p>{formatDate(summary.startTime)}</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Fechar detalhe">
          <X size={18} />
        </button>
      </div>

      {loading && (
        <div className="loading-state activity-loading">
          <Loader2 className="spin" size={22} /> Consultando Garmin…
        </div>
      )}
      {error && <div className="inline-error">{error}</div>}
      {!loading && detail && (
        <>
          <div className="activity-metrics">
            <DetailMetric label="Distância" value={formatDistance(summary.distanceMeters)} icon={Ruler} />
            <DetailMetric label="Tempo" value={formatDuration(summary.durationSeconds)} icon={Timer} />
            <DetailMetric label="Pace médio" value={formatNumber(summary.averagePace, " /km")} icon={Gauge} />
            <DetailMetric label="FC média" value={formatNumber(summary.averageHeartRate, " bpm")} icon={HeartPulse} />
            <DetailMetric label="FC máxima" value={formatNumber(summary.maxHeartRate, " bpm")} icon={HeartPulse} />
            {summary.movingTimeSeconds !== undefined && (
              <DetailMetric label="Moving time" value={formatDuration(summary.movingTimeSeconds)} icon={Timer} />
            )}
          </div>

          <div className="activity-extra-grid">
            {summary.maxPace !== undefined && <span><small>Melhor pace</small><strong>{formatNumber(summary.maxPace, " /km")}</strong></span>}
            {summary.calories !== undefined && <span><small>Calorias</small><strong>{formatNumber(summary.calories, " kcal")}</strong></span>}
            {summary.cadence !== undefined && <span><small>Cadência</small><strong>{formatNumber(summary.cadence, " spm")}</strong></span>}
            {summary.elevationGain !== undefined && <span><small>Elevação +</small><strong>{formatNumber(summary.elevationGain, " m")}</strong></span>}
            {summary.elevationLoss !== undefined && <span><small>Elevação −</small><strong>{formatNumber(summary.elevationLoss, " m")}</strong></span>}
            {summary.temperature !== undefined && <span><small>Temperatura</small><strong><Thermometer size={13} /> {formatNumber(summary.temperature, " °C")}</strong></span>}
            {summary.trainingEffect !== undefined && <span><small>Training effect</small><strong>{formatNumber(summary.trainingEffect)}</strong></span>}
            {summary.vo2Max !== undefined && <span><small>VO₂ max</small><strong>{formatNumber(summary.vo2Max)}</strong></span>}
          </div>

          <DataBlock title="Voltas" value={detail.laps} />
          <DataBlock title="Splits" value={detail.splits} />
          <DataBlock title="Intervalos" value={detail.intervals} />
          <DataBlock title="Zonas de frequência cardíaca" value={detail.heartRateZones} />
          <DataBlock title="Zonas de pace" value={detail.paceZones} />

          <section className="activity-raw-block">
            <div className="activity-data-heading">
              <div>
                <span className="eyebrow">Exportação</span>
                <h3><Clipboard size={16} /> JSON para o Coach</h3>
              </div>
              <button className="secondary-button" onClick={copyJson}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "JSON copiado" : "Copiar JSON para o Coach"}
              </button>
            </div>
            <p><Clipboard size={14} /> Exporta somente <code>summary</code>, <code>laps</code> e <code>splits</code>. O raw não entra.</p>
          </section>

          <section className="activity-raw-block activity-debug-block">
            <div className="activity-data-heading">
              <div>
                <span className="eyebrow">Diagnóstico</span>
                <h3><Code2 size={16} /> Raw completo da Garmin</h3>
              </div>
              <button
                className="secondary-button"
                onClick={() => setShowRaw((current) => !current)}
              >
                {showRaw ? "Ocultar raw" : "Mostrar raw"}
              </button>
            </div>
            {showRaw ? (
              <pre>{JSON.stringify(detail.raw, null, 2)}</pre>
            ) : (
              <p><Code2 size={14} /> Raw continua disponível para debug e só é renderizado quando solicitado.</p>
            )}
          </section>
        </>
      )}
    </aside>
  );
}

export function ActivitiesView({
  items,
  loading,
  onRefresh,
  addToast,
}: {
  items: ActivitySummary[];
  loading: boolean;
  onRefresh: () => void;
  addToast: (tone: Toast["tone"], title: string, message?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ActivitySummary | null>(null);
  const filtered = useMemo(
    () => items.filter((item) => activityTitle(item).toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );

  return (
    <div className="page-stack activities-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Dados do Garmin</span>
          <h1>Atividades</h1>
          <p>Suas corridas vêm direto do Garmin Connect. Nada é salvo aqui.</p>
        </div>
        <div className="activity-toolbar">
          <label className="activity-search">
            <ActivityIcon size={16} />
            <input placeholder="Buscar corrida" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button className="secondary-button" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Atualizar
          </button>
        </div>
      </div>

      <div className={`activities-layout ${selected ? "has-detail" : ""}`}>
        <section className="panel activity-list-panel">
          <div className="activity-list-heading">
            <div>
              <span className="eyebrow">Últimas corridas</span>
              <h2>{filtered.length} {filtered.length === 1 ? "atividade" : "atividades"}</h2>
            </div>
            <span className="live-mark"><span /> Garmin ao vivo</span>
          </div>
          {loading ? (
            <div className="loading-state"><Loader2 className="spin" size={22} /> Carregando corridas…</div>
          ) : filtered.length ? (
            <div className="activity-list">
              {filtered.map((item) => (
                <button
                  className={`activity-row ${selected?.activityId === item.activityId ? "selected" : ""}`}
                  key={String(item.activityId)}
                  onClick={() => setSelected(item)}
                >
                  <span className="activity-row-mark"><ActivityIcon size={17} /></span>
                  <span className="activity-row-main">
                    <strong>{activityTitle(item)}</strong>
                    <small>{formatDate(item.startTime)} · {item.activityType || "running"}</small>
                  </span>
                  <span className="activity-row-stat"><small>Distância</small><strong>{formatDistance(item.distanceMeters)}</strong></span>
                  <span className="activity-row-stat"><small>Tempo</small><strong>{formatDuration(item.durationSeconds)}</strong></span>
                  <span className="activity-row-stat"><small>Pace</small><strong>{formatNumber(item.averagePace, " /km")}</strong></span>
                  <span className="activity-row-stat"><small>FC média</small><strong>{formatNumber(item.averageHeartRate, " bpm")}</strong></span>
                  <ChevronRight className="activity-row-arrow" size={17} />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state activity-empty">
              <div className="empty-icon"><ActivityIcon size={22} /></div>
              <strong>{query ? "Nenhuma corrida encontrada" : "Nenhuma corrida disponível"}</strong>
              <p>{query ? "Tente outro nome." : "Quando houver atividades no Garmin, elas aparecerão aqui."}</p>
            </div>
          )}
        </section>
        {selected && <ActivityDetailPanel activity={selected} onClose={() => setSelected(null)} addToast={addToast} />}
      </div>
    </div>
  );
}
