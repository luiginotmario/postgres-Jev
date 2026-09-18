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
import { SupabaseConnect } from "./SupabaseConnect";
import { api } from "./api";
import type { DataRow, Dataset, SearchResult } from "./types";

const pageSize = 10;
const avatarColors = [
  "bg-sage-100 text-sage-600",
  "bg-[#f2ebe2] text-[#8e7761]",
  "bg-[#e7eef0] text-[#71878f]",
  "bg-[#eee8f0] text-[#8b7599]",
  "bg-[#efeae6] text-[#8c7769]",
];
const iconButton =
  "flex size-8 items-center justify-center rounded-md text-sage-400 hover:bg-sage-100 hover:text-sage-700 disabled:opacity-25";

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
  const [busy, setBusy] = useState<"search" | "generate" | "connect" | null>(
    null,
  );
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
      const response = await api<SearchResult>("search", {
        query,
        version: dataset.version,
        datasetToken: dataset.token,
        source: dataset.source?.type,
      });
      setResult(response);
      if (response.dataset) setDataset(response.dataset);
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
      setDataset(
        await api<Dataset>("generate", { datasetToken: dataset?.token }),
      );
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
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-8 sm:pt-16">
      <header className="mb-9 text-center sm:mb-12">
        <h1 className="font-display text-[52px] leading-[1.02] font-normal tracking-[-1.5px] text-sage-900 sm:text-[68px] sm:tracking-[-2px]">
          Skip the syntax.
          <br />
          <em className="font-normal text-sage-500">Ask your database.</em>
        </h1>
        <p className="mt-5 text-xs leading-7 text-sage-600 sm:text-sm">
          Search by what you mean. No embeddings, no index.
          <br />
          Just a table, a question, and{" "}
          <code className="text-xs text-sage-700">jev()</code>.
        </p>
      </header>
      <SupabaseConnect
        allowed={dataset?.localConnections ?? false}
        busy={!!busy || !dataset}
        connected={!!dataset?.source}
        onBusy={(value) => setBusy(value ? "connect" : null)}
        onConnected={(value) => {
          setDataset(value);
          setResult(null);
          setQuery("");
          setError("");
          setPage(0);
        }}
      />
      {dataset?.source && (
        <p className="mb-3 text-xs text-sage-500">
          {dataset.title} · {dataset.source.tables.length} tables · up to{" "}
          {dataset.source.limit} rows · refreshed on every search
          {dataset.source.capped ? " · Showing a capped subset per table" : ""}
          {dataset.rows.length === 0
            ? " · No visible rows: check SELECT/RLS policies or the table contents."
            : ""}
        </p>
      )}
      <form
        onSubmit={search}
        className="mb-3 flex items-center gap-3 rounded-lg border border-sage-300 bg-white p-3 pl-4 shadow-xs focus-within:border-sage-500 sm:pl-5"
      >
        <Search
          size={17}
          className="shrink-0 text-sage-400"
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
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-sage-800 outline-none! placeholder:text-sage-400 sm:text-sm"
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
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sage-800 text-white transition-colors hover:bg-sage-700 active:scale-[.97] disabled:opacity-30 motion-reduce:transform-none"
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

      {dataset && (
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 px-1 text-xs text-sage-500">
          <code
            className="min-w-0 break-words leading-relaxed"
            aria-label="Jev query"
          >
            <span className="text-sage-700">jev</span>
            {"(" +
              (dataset.source ? "database" : dataset.kind) +
              ", " +
              JSON.stringify(query.trim() || dataset.examples[0]) +
              ")"}
          </code>
        </div>
      )}

      {dataset?.live && !dataset.source && (
        <div
          className="mb-5 flex flex-wrap gap-2"
          aria-label="Example searches"
        >
          {dataset.examples.slice(0, 3).map((example) => (
            <button
              key={example}
              type="button"
              disabled={!!busy}
              onClick={() => {
                setQuery(example);
                input.current?.focus();
              }}
              className="rounded-md border border-sage-200 bg-sage-50 px-2.5 py-1.5 text-left text-[11px] leading-relaxed text-sage-600 transition-colors hover:border-sage-400 hover:bg-sage-100 disabled:opacity-40"
            >
              {example}
            </button>
          ))}
        </div>
      )}

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
        className="overflow-hidden rounded-lg border border-sage-200 bg-white"
      >
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-sage-200 bg-sage-50/50 px-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sage-600">
              {dataset?.title ?? "Loading…"}
            </span>
            <span className="text-sage-400">
              {rows.length} {result ? "matches" : "rows"}
            </span>
            {result && (
              <button
                onClick={clearSearch}
                disabled={!!busy}
                className="ml-1 text-sage-500 underline underline-offset-2"
              >
                Reset
              </button>
            )}
          </div>
          <span
            className="text-[11px] text-sage-400"
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
            <thead className="bg-sage-50 text-sage-500">
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
            <tbody className="divide-y divide-sage-100">
              {rows.slice(page * pageSize, (page + 1) * pageSize).map((row) => (
                <tr key={row.id} className="hover:bg-sage-50/70">
                  {dataset?.columns.map((column, index) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3.5 leading-relaxed ${index === 0 ? "font-medium text-sage-800" : "text-sage-500"} ${!!dataset?.source || ["description", "notes", "skills"].includes(column.key) ? "min-w-56 max-w-sm" : "whitespace-nowrap"}`}
                    >
                      {column.key === "name" ? (
                        <span className="inline-flex items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className={
                              "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[9px] font-normal " +
                              avatarColors[
                                String(row.id)
                                  .split("")
                                  .reduce(
                                    (sum, char) => sum + char.charCodeAt(0),
                                    0,
                                  ) % avatarColors.length
                              ]
                            }
                          >
                            {String(row.name)
                              .split(" ")
                              .map((part) => part[0])
                              .join("")}
                          </span>
                          {displayValue(row, column.key)}
                        </span>
                      ) : column.key === "work_mode" ||
                        column.key === "status" ? (
                        <span
                          className={
                            "inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] " +
                            (["Remote", "Online"].includes(
                              String(row[column.key]),
                            )
                              ? "border-sage-200 bg-sage-100 text-sage-700"
                              : "border-sage-100 bg-sage-50 text-sage-600")
                          }
                        >
                          <span className="size-1 rounded-full bg-current opacity-60" />
                          {displayValue(row, column.key)}
                        </span>
                      ) : (
                        displayValue(row, column.key)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={dataset?.columns.length ?? 1}
                    className="h-40 px-4 text-center text-sage-400"
                  >
                    {dataset ? "No matching records." : "Loading records…"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-sage-200 px-3 py-2 text-[11px] tabular-nums text-sage-400">
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
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-sage-200 bg-white px-3 py-2 text-xs text-sage-600 transition-colors hover:bg-sage-50 active:scale-[.98] disabled:opacity-40 motion-reduce:transform-none"
      >
        {busy === "generate" ? (
          <LoaderCircle
            size={14}
            className="animate-spin motion-reduce:animate-none"
          />
        ) : (
          <Shuffle size={14} />
        )}
        {busy === "generate"
          ? "Generating…"
          : dataset?.source
            ? "Disconnect & use demo data"
            : "Generate random database"}
      </button>
    </main>
  );
}
