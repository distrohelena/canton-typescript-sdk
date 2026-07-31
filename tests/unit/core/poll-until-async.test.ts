import { describe, expect, it, vi } from "vitest";
import { pollUntilAsync } from "../../../src/core/polling/poll-until-async.js";

describe("pollUntilAsync", () => {
    it("returns an immediate match without sleeping", async () => {
        const readAsync = vi.fn(async () => "ready");
        const sleepAsync = vi.fn(async () => {});

        await expect(pollUntilAsync({
            timeoutMs: 10,
            pollIntervalMs: 5,
            readAsync,
            match: value => value === "ready",
            createTimeoutError: () => new Error("timed out"),
            now: () => 0,
            sleepAsync,
        })).resolves.toBe("ready");

        expect(readAsync).toHaveBeenCalledTimes(1);
        expect(sleepAsync).not.toHaveBeenCalled();
    });

    it("retries until a later value matches", async () => {
        let now = 0;
        let attempt = 0;
        const sleeps: number[] = [];

        await expect(pollUntilAsync({
            timeoutMs: 10,
            pollIntervalMs: 3,
            readAsync: async () => ++attempt,
            match: value => value === 3,
            createTimeoutError: () => new Error("timed out"),
            now: () => now,
            sleepAsync: async milliseconds => {
                sleeps.push(milliseconds);
                now += milliseconds;
            },
        })).resolves.toBe(3);

        expect(sleeps).toEqual([3, 3]);
    });

    it("supports a zero interval when reads make progress", async () => {
        let attempt = 0;
        const sleepAsync = vi.fn(async () => {});

        await expect(pollUntilAsync({
            timeoutMs: 10,
            pollIntervalMs: 0,
            readAsync: async () => ++attempt,
            match: value => value === 2,
            createTimeoutError: () => new Error("timed out"),
            now: () => 0,
            sleepAsync,
        })).resolves.toBe(2);

        expect(sleepAsync).toHaveBeenCalledWith(0);
    });

    it("clamps sleep to the deadline and starts no read at the deadline", async () => {
        let now = 0;
        let attempt = 0;
        const sleeps: number[] = [];

        await expect(pollUntilAsync({
            timeoutMs: 10,
            pollIntervalMs: 7,
            readAsync: async () => ++attempt,
            match: () => false,
            createTimeoutError: last => new Error(`last=${last}`),
            now: () => now,
            sleepAsync: async milliseconds => {
                sleeps.push(milliseconds);
                now += milliseconds;
            },
        })).rejects.toThrow("last=2");

        expect(attempt).toBe(2);
        expect(sleeps).toEqual([7, 3]);
    });

    it("lets an in-flight read finish after the deadline without another sleep or read", async () => {
        let now = 0;
        const readAsync = vi.fn(async () => {
            now = 11;
            return "late";
        });
        const sleepAsync = vi.fn(async () => {});

        await expect(pollUntilAsync({
            timeoutMs: 10,
            pollIntervalMs: 5,
            readAsync,
            match: () => false,
            createTimeoutError: last => new Error(`last=${last}`),
            now: () => now,
            sleepAsync,
        })).rejects.toThrow("last=late");

        expect(readAsync).toHaveBeenCalledTimes(1);
        expect(sleepAsync).not.toHaveBeenCalled();
    });
});
