import type { Animal } from "./animals";
import { apiClient } from "./client";

export interface RescueProfileBreed {
  breed: string;
  weight: number;
}

export interface RescueProfile {
  id: number;
  name: string;
  animal_type: string;
  preferred_sex: string | null;
  min_age_weeks: number | null;
  max_age_weeks: number | null;
  breeds: RescueProfileBreed[];
}

export interface RescueMatch {
  animal: Animal;
  score: number;
  breed_score: number;
  age_score: number;
  sex_score: number;
  availability_score: number;
}

export interface RescueMatchPage {
  profile: RescueProfile;
  items: RescueMatch[];
  total: number;
  page: number;
  page_size: number;
}

export const listRescueProfiles = (token: string): Promise<RescueProfile[]> =>
  apiClient.get<RescueProfile[]>("/rescue-profiles", token);

export const searchRescueMatches = (
  token: string,
  profileId: number,
  { page, pageSize }: { page?: number; pageSize?: number } = {},
): Promise<RescueMatchPage> => {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (pageSize) params.set("page_size", String(pageSize));

  const query = params.toString();
  return apiClient.get<RescueMatchPage>(
    `/rescue-profiles/${profileId}/matches${query ? `?${query}` : ""}`,
    token,
  );
};
