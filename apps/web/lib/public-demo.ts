// Only stateless analysis and explicitly reviewed reads are public.
export function publicDemoAllows(method: string, path: string[]): boolean {
  if (path.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return false;
  const route = path.join("/");
  if (method === "POST") {
    return [
      "decisions",
      "decisions/compare",
      "decisions/replay",
      "constitution/compile",
      "receipts/verify",
    ].includes(route);
  }
  if (method !== "GET") return false;
  return (
    [
      "health",
      "config",
      "underlyings",
      "constitution",
      "constitution/history",
      "receipts",
      "agent/tasks",
      "agent/identity",
      "agent/x402",
    ].includes(route) ||
    /^explore\/[A-Za-z0-9_-]+$/.test(route) ||
    /^receipts\/[A-Za-z0-9_-]+(?:\/verify)?$/.test(route)
  );
}
