const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("runsync_token") || "";
}
export function saveToken(token: string) {
  sessionStorage.setItem("runsync_token", token);
}
export function clearToken() {
  sessionStorage.removeItem("runsync_token");
}
export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, {...init, headers});
  const text = await res.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = {detail: text}; }
  if (!res.ok) {
    const err: any = new Error(body.detail || body.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}
