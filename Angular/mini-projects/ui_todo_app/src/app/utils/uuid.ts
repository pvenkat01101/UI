// Small helper for generating ids.
// We prefer crypto.randomUUID (modern browsers), and fall back to a simple
// UUID-like generator for older environments.

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: not a perfect UUID, but good enough for local apps.
  // We keep it simple for beginners.
  const random = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${random()}${random()}-${random()}-${random()}-${random()}-${random()}${random()}${random()}`;
}
