import {
  APIConnectionError,
  APIError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "@typesafe-ai/sdk"

export function describeSearchError(error: unknown): string {
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) {
    return "TypeSafe rejected this API key. Check it in Settings and try again."
  }

  if (error instanceof RateLimitError) {
    return "TypeSafe is rate limited right now. Wait a moment and try again."
  }

  if (error instanceof APIConnectionError) {
    return "Could not reach TypeSafe. Check your connection and try again."
  }

  if (error instanceof APIError) {
    return `TypeSafe returned an error (${error.status}). Try again later.`
  }

  if (error instanceof Error && error.name === "AbortError") {
    return "Search cancelled."
  }

  return "Jev search failed. Check your bookmarks permission and try again."
}
