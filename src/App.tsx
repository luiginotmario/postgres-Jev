import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  Shuffle,
  X,
} from "lucide-react";
import { api } from "./api";
import type { DataRow, Dataset, SearchResult } from "./types";

const pageSize = 10;
const iconButton =
  "flex size-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-25";

function displayValue(row: DataRow, column: string): string {
  if (column === "temperature_c") return `${row[column]}°C`;
  if (column === "humidity_pct" || column === "battery_pct")
    return `${row[column]}%`;
  return String(row[column] ?? "—");
}

export function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState<"search" | "generate" | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    api<Dataset>("dataset")
      .then((value) => {
        if (active) setDataset(value);
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);

  function clearSearch() {
    setQuery("");
    setResult(null);
    setError("");
    setPage(0);
    input.current?.focus();
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !dataset) return;
    if (!query.trim()) {
      clearSearch();
      return;
    }
    setBusy("search");
    setError("");
    try {
      setResult(
        await api<SearchResult>("search", { query, version: dataset.version }),
      );
      setPage(0);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    if (busy) return;
    setBusy("generate");
    setError("");
    try {
      setDataset(await api<Dataset>("generate", {}));
      setQuery("");
      setResult(null);
      setPage(0);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setBusy(null);
    }
  }

  const rows = result
    ? result.results
        .filter(({ probability }) => probability >= 0.7)
        .sort((a, b) => b.probability - a.probability)
        .map(({ row }) => row)
    : (dataset?.rows ?? []);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-16">
      <form
        onSubmit={search}
        className="mb-6 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2 pl-4 shadow-xs focus-within:border-neutral-400"
      >
        <Search
          size={17}
          className="shrink-0 text-neutral-400"
          aria-hidden="true"
        />
        <input
          ref={input}
          aria-label="Search records"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={500}
          placeholder={
            dataset
              ? `Search ${dataset.title.toLowerCase()}… e.g. ${dataset.examples[0].toLowerCase()}`
              : "Search records…"
          }
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-neutral-800 outline-none! placeholder:text-neutral-400 sm:text-sm"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={clearSearch}
            disabled={!!busy}
            className={iconButton}
          >
            <X size={15} />
          </button>
        )}
        <button
          type="submit"
          aria-label="Search"
          disabled={!!busy || !dataset || !query.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-white transition-colors hover:bg-neutral-700 active:scale-[.97] disabled:opacity-30 motion-reduce:transform-none"
        >
          {busy === "search" ? (
            <LoaderCircle
              size={16}
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <ArrowRight size={17} />
          )}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700"
        >
          <span>{error}</span>
          <button
            aria-label="Dismiss error"
            onClick={() => setError("")}
            className="p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <section
        aria-label="Records"
        aria-busy={!!busy}
        className="overflow-hidden rounded-lg border border-neutral-200"
      >
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-neutral-200 px-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-600">
              {dataset?.title ?? "Loading…"}
            </span>
            <span className="text-neutral-400">
              {rows.length} {result ? "matches" : "rows"}
            </span>
            {result && (
              <button
                onClick={clearSearch}
                disabled={!!busy}
                className="ml-1 text-neutral-500 underline underline-offset-2"
              >
                Reset
              </button>
            )}
          </div>
          <span
            className="text-[11px] text-neutral-400"
            title={
              dataset?.live
                ? "Live model judgments"
                : "Example queries use offline rules until a server API key is configured."
            }
          >
            {result && `${result.elapsed < 1 ? "<1" : result.elapsed} ms · `}
            {dataset?.live ? "Live" : "Demo"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                {dataset?.columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 font-normal"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.slice(page * pageSize, (page + 1) * pageSize).map((row) => (
                <tr key={row.id} className="hover:bg-neutral-50/70">
                  {dataset?.columns.map((column, index) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3.5 leading-relaxed ${index === 0 ? "font-medium text-neutral-800" : "text-neutral-500"} ${column.key === "description" ? "min-w-64 max-w-sm" : "whitespace-nowrap"}`}
                    >
                      {displayValue(row, column.key)}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={dataset?.columns.length ?? 1}
                    className="h-40 px-4 text-center text-neutral-400"
                  >
                    {dataset ? "No matching records." : "Loading records…"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2 text-[11px] tabular-nums text-neutral-400">
          <span>
            {rows.length ? page * pageSize + 1 : 0}–
            {Math.min((page + 1) * pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              aria-label="Previous page"
              className={iconButton}
              disabled={page === 0 || !!busy}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              {page + 1} / {pages}
            </span>
            <button
              aria-label="Next page"
              className={iconButton}
              disabled={page >= pages - 1 || !!busy}
              onClick={() => setPage((value) => value + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
      <button
        onClick={generate}
        disabled={!!busy || !dataset}
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 transition-colors hover:bg-neutral-50 active:scale-[.98] disabled:opacity-40 motion-reduce:transform-none"
      >
        {busy === "generate" ? (
          <LoaderCircle
            size={14}
            className="animate-spin motion-reduce:animate-none"
          />
        ) : (
          <Shuffle size={14} />
        )}
        {busy === "generate" ? "Generating…" : "Generate random database"}
      </button>
    </main>
  );
}
