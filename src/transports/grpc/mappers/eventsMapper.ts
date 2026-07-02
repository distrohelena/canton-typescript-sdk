export function mapGrpcTransactionEvents(
  payload: { events?: unknown[] } | readonly unknown[]
): readonly unknown[] {
  return Array.isArray(payload) ? payload : payload.events ?? []
}
