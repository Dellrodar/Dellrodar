import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLookupValues } from "../../src/api/lookups";

const emptyLookups = { animal_types: [], breeds: [], sexes: [], outcome_types: [] };

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue(new Response(JSON.stringify(emptyLookups), { status: 200 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getLookupValues", () => {
  it("requests /lookups with the bearer token", async () => {
    await getLookupValues("token123");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/lookups$/);
    expect(options.headers.Authorization).toBe("Bearer token123");
  });

  it("returns the parsed lookup lists", async () => {
    const lookups = {
      animal_types: ["Cat", "Dog"],
      breeds: ["Beagle"],
      sexes: ["Neutered Male"],
      outcome_types: ["Adoption"],
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(lookups), { status: 200 }));

    await expect(getLookupValues("token123")).resolves.toEqual(lookups);
  });
});
