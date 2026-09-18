export type DatasetKind = "people" | "countries" | "numbers";

export interface DataRow {
  id: number | string;
  [column: string]: string | number;
}

export interface Dataset {
  token?: string;
  localConnections?: boolean;
  engine?: "postgres" | "application";
  source?: {
    type: "supabase";
    tables: string[];
    limit: number;
    capped: boolean;
  };
  kind: DatasetKind;
  title: string;
  columns: { key: string; label: string }[];
  examples: string[];
  rows: DataRow[];
  version: string;
  live: boolean;
}

export interface Judgment {
  row: DataRow;
  probability: number;
}

export interface SearchResult {
  dataset?: Dataset;
  results: Judgment[];
  elapsed: number;
  evaluated: number;
  cached: number;
  mode: "live" | "demo";
}
