import { beforeEach, describe, expect, it } from "vitest";
import { createPersonalityUser, loadPersonalityUsers, loadReports, saveReport } from "./storage";
import type { PersonalityReport } from "../domain/types";

describe("性格测试本地存储", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("读取数独已有用户名作为测试用户", () => {
    localStorage.setItem("atube-sudoku-v1", JSON.stringify({
      version: 1,
      users: [{ id: "u-1", name: "阿土伯", avatarColor: "#913f30", createdAt: "2026-07-02T00:00:00.000Z" }],
      activeUserId: "u-1",
      games: {},
      records: [],
      lastDifficulty: "medium",
      lastBoardStyle: "decorative",
    }));

    expect(loadPersonalityUsers()).toEqual([
      { id: "u-1", name: "阿土伯", avatarColor: "#913f30", createdAt: "2026-07-02T00:00:00.000Z" },
    ]);
  });

  it("可创建用户名并保存到数独本地用户池", () => {
    const user = createPersonalityUser("老王");

    expect(user.name).toBe("老王");
    expect(loadPersonalityUsers().map((item) => item.name)).toContain("老王");
  });

  it("按用户保存和读取历史报告", () => {
    const report: PersonalityReport = {
      id: "report-1",
      testType: "sixteen-types",
      userId: "u-1",
      username: "阿土伯",
      typeCode: "INTJ",
      createdAt: "2026-07-02T00:00:00.000Z",
      scores: {
        EI: { left: "E", right: "I", winner: "I", percentages: { E: 30, I: 70 }, strength: "clear", note: "I 清晰" },
        SN: { left: "S", right: "N", winner: "N", percentages: { S: 20, N: 80 }, strength: "clear", note: "N 清晰" },
        TF: { left: "T", right: "F", winner: "T", percentages: { T: 65, F: 35 }, strength: "moderate", note: "T 中等" },
        JP: { left: "J", right: "P", winner: "J", percentages: { J: 55, P: 45 }, strength: "slight", note: "J 轻微" },
      },
      answers: { q1: 2 },
      sections: [],
    };

    saveReport(report);

    expect(loadReports("u-1")).toHaveLength(1);
    expect(loadReports("u-2")).toHaveLength(0);
  });
});
