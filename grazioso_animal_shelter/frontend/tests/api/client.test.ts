import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiClient } from "../../src/api/client";

const jsonResponse = (body: unknown, init: { status?: number } = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });

describe("apiClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a GET request without a body", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ status: "ok" }));

    const result = await apiClient.get<{ status: string }>("/health");

    expect(result).toEqual({ status: "ok" });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8000/api/v1/health");
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
  });

  it("attaches a bearer token when provided", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}));

    await apiClient.get("/auth/me", "the-token");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer the-token");
  });

  it("sends a JSON-serialized body on POST", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 1 }, { status: 201 }));

    await apiClient.post("/auth/signup", { email: "a@example.com", password: "password123" });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ email: "a@example.com", password: "password123" }));
    const headers = init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("throws an ApiError with the server-provided detail message", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ detail: "Invalid email or password" }, { status: 401 }),
    );

    await expect(
      apiClient.post("/auth/login", { email: "x", password: "y" }),
    ).rejects.toMatchObject({
      status: 401,
      message: "Invalid email or password",
    });
  });

  it("falls back to a generic message when the error body has no detail", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 500 }));

    await expect(apiClient.get("/boom")).rejects.toMatchObject({
      status: 500,
      message: "Request failed with status 500",
    });
  });

  it("thrown errors are instances of ApiError", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ detail: "nope" }, { status: 403 }));

    await expect(apiClient.get("/forbidden")).rejects.toBeInstanceOf(ApiError);
  });

  it("returns undefined for a 204 No Content response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    const result = await apiClient.patch("/admin/users/1/status", { is_active: false });

    expect(result).toBeUndefined();
  });
});
