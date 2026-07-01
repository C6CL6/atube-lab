import { beforeEach, describe, expect, it } from "vitest";
import {
  addLocalSnakeRecord,
  clearLocalSnakeRecords,
  loadHighScore,
  loadSnakeData,
  saveHighScore,
  saveLastSnakeSkin,
} from "./storage";

describe("贪吃蛇本机最高分", () => {
  beforeEach(() => localStorage.clear());

  it("没有记录时返回 0", () => {
    expect(loadHighScore()).toBe(0);
  });

  it("只在新分数更高时更新最高分", () => {
    expect(saveHighScore(80)).toBe(80);
    expect(saveHighScore(30)).toBe(80);
    expect(saveHighScore(120)).toBe(120);
    expect(loadHighScore()).toBe(120);
  });

  it("保存本机成绩并按前十名排名", () => {
    const first = addLocalSnakeRecord({
      id: "r1",
      userId: "u1",
      username: "阿土伯",
      score: 30,
      length: 6,
      speedLevel: 1,
      skin: "sudoku",
      startedAt: "2026-07-01T00:00:00.000Z",
      completedAt: "2026-07-01T00:01:00.000Z",
    });
    const second = addLocalSnakeRecord({ ...first.records[0], id: "r2", score: 90 });

    expect(second.records.map((record) => record.id)).toEqual(["r2", "r1"]);
    expect(loadHighScore()).toBe(90);

    clearLocalSnakeRecords();
    expect(loadSnakeData().records).toEqual([]);
  });

  it("记住上次选择的皮肤", () => {
    saveLastSnakeSkin("ink");

    expect(loadSnakeData().lastSkin).toBe("ink");
  });
});
