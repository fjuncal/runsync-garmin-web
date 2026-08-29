"use client";

import { Check, Code2, Copy, Search, X } from "lucide-react";
import { useState } from "react";
import type { HistoryItem } from "../lib/types";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function HistoryDetailsView({ items, loading }: { items: HistoryItem[]; loading: boolean }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const filtered = items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  const statusLabel = (status: string) => status === "scheduled_verified" ? "Verificado" : status === "scheduled_unverified" ? "Agendado" : "Criado";
  return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">Seu progresso</span><h1>Histórico</h1><p>Todos os treinos que você enviou para a Garmin.</p></div><div className="search-field"><Search size={16} /><input placeholder="Buscar treino..." value={query} onChange={(event) => setQuery(event.target.value)} /></div></div><section className="panel history-panel">{loading ? <div className="loading-state">Carregando histórico...</div> : filtered.length ? <><div className="history-table-head"><span>Treino</span><span>Data agendada</span><span>Status</span><span>Workout ID</span></div><div className="history-list">{filtered.map((item) => <button className="history-row history-row-button" key={item.id} onClick={() => setSelected(item)} aria-label={`Ver detalhes de ${item.name}`}><div className="history-name"><div className="activity-icon"><Check size={14} /></div><div><strong>{item.name}</strong><p>Enviado em {formatDate(item.created_at)}</p></div></div><span>{item.date ? formatDate(item.date) : "Sem agendamento"}</span><span className="status-pill success">{statusLabel(item.status)}</span><code>#{item.workout_id}</code></button>)}</div></> : <div className="empty-state"><div className="empty-icon"><Code2 size={22} /></div><strong>{query ? "Nenhum treino encontrado" : "Você ainda não enviou nenhum treino"}</strong><p>{query ? "Tente buscar por outro nome." : "Seu histórico aparecerá aqui após o primeiro envio."}</p></div>}</section>{selected && <div className="details-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="details-modal" role="dialog" aria-modal="true" aria-labelledby="history-detail-title" onClick={(event) => event.stopPropagation()}><div className="details-header"><div><span className="eyebrow">Detalhes do envio</span><h2 id="history-detail-title">{selected.name}</h2></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Fechar"><X size={18} /></button></div><div className="details-meta"><span><strong>Status</strong>{statusLabel(selected.status)}</span><span><strong>Agendamento</strong>{selected.date ? formatDate(selected.date) : "Sem data"}</span><span><strong>Workout ID</strong>#{selected.workout_id}</span><span><strong>Enviado em</strong>{formatDate(selected.created_at)}</span></div><div className="json-detail-heading"><span><Code2 size={15} /> Dados retornados pela API</span><button className="text-button" onClick={() => navigator.clipboard?.writeText(JSON.stringify(selected, null, 2))}><Copy size={14} /> Copiar JSON</button></div><pre className="json-detail">{JSON.stringify(selected, null, 2)}</pre><p className="detail-note">O endpoint atual de histórico retorna os metadados do envio. Para mostrar o JSON original completo, a API precisa incluir <code>payload_json</code> na resposta.</p></section></div>}</div>;
}
