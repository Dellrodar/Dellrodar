import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listRescueProfiles, searchRescueMatches } from "../../src/api/rescueProfiles";

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listRescueProfiles", () => {
  it("requests /rescue-profiles with the auth token", async () => {
    await listRescueProfiles("token123");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/rescue-profiles$/);
    expect(options.headers.Authorization).toBe("Bearer token123");
  });
});

describe("searchRescueMatches", () => {
  it("requests the profile's matches endpoint", async () => {
    await searchRescueMatches("token123", 2);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/rescue-profiles\/2\/matches$/);
  });

  it("builds pagination params", async () => {
    await searchRescueMatches("token123", 2, { page: 3, pageSize: 25 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/rescue-profiles/2/matches?");
    expect(url).toContain("page=3");
    expect(url).toContain("page_size=25");
  });
});
