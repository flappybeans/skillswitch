export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// formData.get() returns string | File | null. We only ever want strings.
export function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}