export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Request failed.");
  return data as T;
}

export function tone(value: string | null | undefined): string {
  if (!value) return "text-text";
  if (value.startsWith("+")) return "text-profit";
  if (value.startsWith("-")) return "text-loss";
  return "text-text";
}
