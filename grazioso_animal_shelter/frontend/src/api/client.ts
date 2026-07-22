const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const request = async <TResponse>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<TResponse> => {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((data: { detail?: string }) => data.detail)
      .catch(() => undefined);
    throw new ApiError(response.status, detail ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
};

export const apiClient = {
  get: <TResponse>(path: string, token?: string | null) =>
    request<TResponse>(path, { method: "GET", token }),
  post: <TResponse>(path: string, body: unknown, token?: string | null) =>
    request<TResponse>(path, { method: "POST", body, token }),
  patch: <TResponse>(path: string, body: unknown, token?: string | null) =>
    request<TResponse>(path, { method: "PATCH", body, token }),
};
