export function mapGrpcTransactionEvents(
    payload: { events?: unknown[] } | readonly unknown[],
): readonly unknown[] {
    if (Array.isArray(payload)) {
        return payload;
    }

    const envelope = payload as { events?: unknown[] };

    return envelope.events ?? [];
}
