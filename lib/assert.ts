// Used in exhaustive switches: if you forget a case, TypeScript refuses to compile.
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}