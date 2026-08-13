import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveAnimal,
  createAnimal,
  getAnimal,
  getBreedSummary,
  searchAnimals,
  unarchiveAnimal,
  updateAnimal,
} from "../../src/api/animals";

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

  it("passes include_archived=true only when requested", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(emptyPage), { status: 200 })),
    );

    await searchAnimals("token123", { includeArchived: true });
    expect(mockFetch.mock.calls[0][0]).toContain("include_archived=true");

    await searchAnimals("token123", {});
    expect(mockFetch.mock.calls[1][0]).not.toContain("include_archived");
  });
});

describe("getAnimal", () => {
  it("requests the animal detail with the bearer token", async () => {
    await getAnimal("token123", 42);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/animals\/42$/);
    expect(options.method).toBe("GET");
    expect(options.headers.Authorization).toBe("Bearer token123");
  });
});

describe("createAnimal", () => {
  it("posts the payload to /animals", async () => {
    await createAnimal("token123", { animal_id: "A1", animal_type: "Dog", breed: "Beagle" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/animals$/);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      animal_id: "A1",
      animal_type: "Dog",
      breed: "Beagle",
    });
  });
});

describe("updateAnimal", () => {
  it("patches only the fields it is given", async () => {
    await updateAnimal("token123", 42, { name: "Shadow" });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/animals\/42$/);
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({ name: "Shadow" });
  });
});

describe("archiveAnimal and unarchiveAnimal", () => {
  it("posts to the archive route", async () => {
    await archiveAnimal("token123", 42);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/animals\/42\/archive$/);
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer token123");
  });

  it("posts to the unarchive route", async () => {
    await unarchiveAnimal("token123", 42);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/animals\/42\/unarchive$/);
  });
});

describe("getBreedSummary", () => {
  it("requests /animals/breed-summary with the bearer token", async () => {
    await getBreedSummary("token123");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/animals\/breed-summary$/);
    expect(options.headers.Authorization).toBe("Bearer token123");
  });

  it("builds query params from summary options", async () => {
    await getBreedSummary("token123", { q: "lab mix", animalType: "Dog", limit: 5 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/animals/breed-summary?");
    expect(url).toContain("q=lab+mix");
    expect(url).toContain("animal_type=Dog");
    expect(url).toContain("limit=5");
  });

  it("passes the rescue profile id as profile_id", async () => {
    await getBreedSummary("token123", { profileId: 3, limit: 5 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("profile_id=3");
    expect(url).not.toContain("animal_type=");
  });
});
