import { apiClient } from "./client";

export interface LookupValues {
  animal_types: string[];
  breeds: string[];
  sexes: string[];
  outcome_types: string[];
}

export const getLookupValues = (token: string): Promise<LookupValues> =>
  apiClient.get<LookupValues>("/lookups", token);
