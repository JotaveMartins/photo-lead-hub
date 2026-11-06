// Only the explicit admin destination can survive the login redirect.
// External URLs, protocol-relative URLs and arbitrary paths are rejected.
export const adminClientReturnPath = (value: unknown): string =>
  typeof value === "string" && /^\/admin\/clientes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value : "/";
