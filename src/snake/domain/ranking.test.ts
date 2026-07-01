import { describe, expect, it } from "vitest";
import { rankSnakeRecords, topSnakeRecords } from "./ranking";
import type { SnakeRecord } from "./types";

function record(input: Partial<SnakeRecord> & Pick<SnakeRecord, "id" | "score">): SnakeRecord {
  return {
    userId: "u1",
    username: "玩家",
    length: 3,
    speedLevel: 1,
    skin: "sudoku",
    startedAt: "2026-07-01T00:00:00.000Z",
    completedAt: "2026-07-01T00:00:00.000Z",
    ...input,
  };
}

describe("贪吃蛇排行榜", () => {
  it("按分数、长度、速度和完成时间排序", () => {
    const ranked = rankSnakeRecords([
      record({ id: "late", score: 120, completedAt: "2026-07-01T02:00:00.000Z" }),
      record({ id: "fast", score: 120, completedAt: "2026-07-01T01:00:00.000Z" }),
      record({ id: "long", score: 120, length: 8, completedAt: "2026-07-01T03:00:00.000Z" }),
      record({ id: "low", score: 80 }),
    ]);

    expect(ranked.map((item) => item.id)).toEqual(["long", "fast", "late", "low"]);
  });

  it("只保留前十名", () => {
    const records = Array.from({ length: 12 }, (_, index) => record({ id: String(index), score: index }));

    expect(topSnakeRecords(records)).toHaveLength(10);
    expect(topSnakeRecords(records)[0].score).toBe(11);
  });
});
