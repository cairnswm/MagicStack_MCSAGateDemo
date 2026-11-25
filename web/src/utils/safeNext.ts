/** Returns `value` only if it is an in-app path (guards the post-login redirect against open redirects). */
export function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  return value
}
