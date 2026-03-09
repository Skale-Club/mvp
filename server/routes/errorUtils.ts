export function safeErrorMessage(err: unknown, fallback: string = "An unexpected error occurred"): string {
  const message = err instanceof Error ? err.message : String(err);
  if (process.env.NODE_ENV === "production") {
    console.error(`[error] ${fallback}:`, message);
    return fallback;
  }
  return message;
}
