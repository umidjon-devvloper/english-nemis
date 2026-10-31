import "server-only";

const API_URL = process.env.API_INTERNAL_URL;

if (!API_URL) {
  throw new Error("API_INTERNAL_URL is not configured");
}

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  cookie?: string;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { method = "GET", body, cookie } = options;

  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
    throw new Error("Invalid API endpoint");
  }

  const headers = new Headers({
    Accept: "application/json",
  });

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(503, "Backend service unavailable");
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Something went wrong";

    throw new ApiError(response.status, message);
  }

  return data as T;
}