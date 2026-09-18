export type DatasetKind = "people" | "countries" | "numbers";

export interface DataRow {
  id: number;
  [column: string]: string | number;
}

export interface Dataset {
  token?: string;
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
  results: Judgment[];
  elapsed: number;
  evaluated: number;
  cached: number;
  mode: "live" | "demo";
}
