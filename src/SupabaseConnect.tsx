import { useState, type FormEvent } from "react";
import { Database, LoaderCircle } from "lucide-react";
import { api } from "./api";
import type { Dataset } from "./types";
interface Props {
  allowed: boolean;
  busy: boolean;
  connected: boolean;
  onBusy: (value: boolean) => void;
  onConnected: (dataset: Dataset) => void;
}
const field =
  "mt-1 w-full rounded-md border border-sage-200 bg-white px-3 py-2 text-sm text-sage-800 outline-none focus:border-sage-500";
export function SupabaseConnect({
  allowed,
  busy,
  connected,
  onBusy,
  onConnected,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setError("");
    onBusy(true);
    try {
      const dataset = await api<Dataset>("supabase/connect", values);
      form.reset();
      onConnected(dataset);
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Connection failed.");
    } finally {
      onBusy(false);
    }
  }
  return (
    <div className="mb-5">
      <button
        type="button"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-md border border-sage-200 bg-white px-3 py-2 text-xs text-sage-700 hover:bg-sage-50 disabled:opacity-40"
      >
        <Database size={14} />
        {connected ? "Change Supabase project" : "Connect Supabase"}
      </button>
      {open &&
        (allowed ? (
          <form
            onSubmit={connect}
            className="mt-3 rounded-lg border border-sage-200 bg-sage-50/50 p-4"
          >
            <p className="mb-4 text-xs leading-relaxed text-sage-600">
              Search across tables exposed by your project’s public Data API.
              Keys stay in local server memory. Loaded records are sent to Jev
              through OpenRouter when you search.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-sage-600">
                Project URL
                <input
                  name="url"
                  type="url"
                  placeholder="https://your-project.supabase.co"
                  required
                  className={field}
                />
              </label>
              <label className="text-xs text-sage-600">
                API key
                <input
                  name="apiKey"
                  type="password"
                  autoComplete="off"
                  placeholder="Your Supabase API key"
                  required
                  className={field}
                />
              </label>
            </div>
            <p className="mt-3 text-[11px] text-sage-500">
              Read-only · up to 500 rows shared across discovered tables · key
              permissions apply.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-xs text-red-700">
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-sage-800 px-3 py-2 text-xs text-white hover:bg-sage-700 disabled:opacity-40"
            >
              {busy && <LoaderCircle size={13} className="animate-spin" />}
              Connect & load tables
            </button>
          </form>
        ) : (
          <div className="mt-3 rounded-lg border border-sage-200 bg-sage-50 p-4 text-sm leading-relaxed text-sage-600">
            Connect your database from the locally running app.{" "}
            <a
              className="underline underline-offset-2"
              href="https://github.com/luiginotmario/postgres-Jev#connect-supabase-locally"
              target="_blank"
              rel="noreferrer"
            >
              Get the code and local setup instructions
            </a>
            .
          </div>
        ))}
    </div>
  );
}
