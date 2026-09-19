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
    return "TypeSafe is rate limited right now. Local matches are shown instead."
  }

  if (error instanceof APIConnectionError) {
    return "Could not reach TypeSafe. Check your connection; local matches are shown instead."
  }

  if (error instanceof APIError) {
    return `TypeSafe returned an error (${error.status}). Local matches are shown instead.`
  }

  if (error instanceof Error && error.name === "AbortError") {
    return "Search cancelled."
  }

  return "AI ranking failed. Local matches are shown instead."
}
