export async function api<T>(route: string, body?: object): Promise<T> {
  const response = await fetch(
    `/api/${route}`,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.error === "string" ? data.error : "Request failed.",
    );
  return data as T;
}
