const defaultDenyList = ["password", "secret_key", "api_key"];

export function getDenyList(): string[] {
  const configured = process.env.AUDIT_DENYLIST;

  if (!configured) {
    return [...defaultDenyList];
  }

  return configured
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
