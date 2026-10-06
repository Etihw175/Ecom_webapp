/** Only allow same-origin relative paths as post-login redirect targets. */
export function safeCallbackUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.startsWith("/login") || value.startsWith("/register")) return null;
  return value;
}
