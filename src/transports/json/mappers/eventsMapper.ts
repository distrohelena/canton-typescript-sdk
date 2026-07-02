export function mapJsonTransactionEvents(payload: {
  events?: unknown[];
}): readonly unknown[] {
  return payload.events ?? []
}
