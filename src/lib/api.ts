const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const WS_BASE = import.meta.env.VITE_WS_URL || "http://localhost:3001";

function getToken(): string | null {
  return localStorage.getItem("arcane-token");
}

function setToken(token: string) {
  localStorage.setItem("arcane-token", token);
}

function clearToken() {
  localStorage.removeItem("arcane-token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "请求失败" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export { API_BASE, WS_BASE, getToken, setToken, clearToken, request };