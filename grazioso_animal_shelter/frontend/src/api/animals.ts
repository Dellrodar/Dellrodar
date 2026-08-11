import { apiClient } from "./client";

export interface Animal {
  id: number;
  animal_id: string;
  name: string | null;
  animal_type: string;
  breed: string;
  color: string | null;
  sex_upon_outcome: string | null;
  date_of_birth: string | null;
  outcome_type: string | null;
  outcome_subtype: string | null;
  outcome_datetime: string | null;
  age_upon_outcome_in_weeks: number | null;
  location_lat: number | null;
  location_long: number | null;
  archived_at: string | null;
}

export interface AnimalCreate {
  animal_id: string;
  name?: string | null;
  animal_type: string;
  breed: string;
  color?: string | null;
  sex_upon_outcome?: string | null;
  date_of_birth?: string | null;
  outcome_type?: string | null;
  outcome_subtype?: string | null;
  outcome_datetime?: string | null;
  age_upon_outcome_in_weeks?: number | null;
  location_lat?: number | null;
  location_long?: number | null;
}

export type AnimalUpdate = Partial<AnimalCreate>;

export interface AnimalPage {
  items: Animal[];
  total: number;
  page: number;
  page_size: number;
}

export interface AnimalSearchParams {
  q?: string;
  animalType?: string;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}

export const searchAnimals = (
  token: string,
  { q, animalType, page, pageSize, includeArchived }: AnimalSearchParams = {},
): Promise<AnimalPage> => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (animalType) params.set("animal_type", animalType);
  if (page) params.set("page", String(page));
  if (pageSize) params.set("page_size", String(pageSize));
  if (includeArchived) params.set("include_archived", "true");

  const query = params.toString();
  return apiClient.get<AnimalPage>(`/animals${query ? `?${query}` : ""}`, token);
};

export const getAnimal = (token: string, animalPk: number): Promise<Animal> =>
  apiClient.get<Animal>(`/animals/${animalPk}`, token);

export const createAnimal = (token: string, payload: AnimalCreate): Promise<Animal> =>
  apiClient.post<Animal>("/animals", payload, token);

export const updateAnimal = (
  token: string,
  animalPk: number,
  payload: AnimalUpdate,
): Promise<Animal> => apiClient.patch<Animal>(`/animals/${animalPk}`, payload, token);

export const archiveAnimal = (token: string, animalPk: number): Promise<Animal> =>
  apiClient.post<Animal>(`/animals/${animalPk}/archive`, undefined, token);

export const unarchiveAnimal = (token: string, animalPk: number): Promise<Animal> =>
  apiClient.post<Animal>(`/animals/${animalPk}/unarchive`, undefined, token);

export interface BreedCount {
  breed: string;
  count: number;
}

export interface BreedSummary {
  items: BreedCount[];
  other_count: number;
  total_animals: number;
}

export interface BreedSummaryParams {
  q?: string;
  animalType?: string;
  limit?: number;
}

export const getBreedSummary = (
  token: string,
  { q, animalType, limit }: BreedSummaryParams = {},
): Promise<BreedSummary> => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (animalType) params.set("animal_type", animalType);
  if (limit) params.set("limit", String(limit));

  const query = params.toString();
  return apiClient.get<BreedSummary>(`/animals/breed-summary${query ? `?${query}` : ""}`, token);
};
