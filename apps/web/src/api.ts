const configuredGateway = import.meta.env.VITE_GATEWAY_URL as string | undefined;
export const GATEWAY: string =
  configuredGateway === "same-origin"
    ? ""
    : configuredGateway === undefined
      ? "http://127.0.0.1:8000"
      : configuredGateway;

const TOKEN_KEY = "bastionloop-admin-token";

export function adminToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "dev-admin-token";
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${adminToken()}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${GATEWAY}${path}`, { ...init, headers });
  if (!response.ok) throw new ApiError(response.status, await parseError(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
  },
  async download(path: string, filename: string): Promise<void> {
    const response = await fetch(`${GATEWAY}${path}`, {
      headers: { Authorization: `Bearer ${adminToken()}` },
    });
    if (!response.ok) throw new ApiError(response.status, await parseError(response));
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};

export function getRun(runId: string) {
  return api.get<any>(`/v1/runs/${encodeURIComponent(runId)}`);
}

export function getFinding(findingId: string, verify = true) {
  return api.get<any>(`/v1/findings/${encodeURIComponent(findingId)}?verify=${verify}`);
}
