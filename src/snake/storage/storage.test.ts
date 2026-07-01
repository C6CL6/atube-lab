import { beforeEach, describe, expect, it } from "vitest";
import { loadHighScore, saveHighScore } from "./storage";

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
});
