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
}

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
}

export const searchAnimals = (
  token: string,
  { q, animalType, page, pageSize }: AnimalSearchParams = {},
): Promise<AnimalPage> => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (animalType) params.set("animal_type", animalType);
  if (page) params.set("page", String(page));
  if (pageSize) params.set("page_size", String(pageSize));

  const query = params.toString();
  return apiClient.get<AnimalPage>(`/animals${query ? `?${query}` : ""}`, token);
};
