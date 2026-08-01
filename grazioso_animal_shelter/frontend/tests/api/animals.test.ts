import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchAnimals } from "../../src/api/animals";

const emptyPage = { items: [], total: 0, page: 1, page_size: 10 };

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue(new Response(JSON.stringify(emptyPage), { status: 200 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchAnimals", () => {
  it("requests /animals with no params by default", async () => {
    await searchAnimals("token123");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/animals$/);
    expect(options.headers.Authorization).toBe("Bearer token123");
  });

  it("builds query params from search options", async () => {
    await searchAnimals("token123", {
      q: "lab mix",
      animalType: "Dog",
      page: 2,
      pageSize: 25,
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/animals?");
    expect(url).toContain("q=lab+mix");
    expect(url).toContain("animal_type=Dog");
    expect(url).toContain("page=2");
    expect(url).toContain("page_size=25");
  });
});
