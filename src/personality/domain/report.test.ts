import { describe, expect, it } from "vitest";
import { discQuestions, mbtiQuestions } from "./questions";
import { buildDiscReport, buildPersonalityReport, formatReportText } from "./report";
import { scoreDiscAnswers, scoreMbtiAnswers } from "./scoring";
import type { AnswerMap, PersonalityUser } from "./types";

const user: PersonalityUser = {
  id: "u-1",
  name: "阿土伯",
  avatarColor: "#913f30",
  createdAt: "2026-07-02T00:00:00.000Z",
};

describe("性格测试报告", () => {
  it("MBTI报告使用新的MBTI命名", () => {
    const answers = Object.fromEntries(mbtiQuestions.map((question) => [question.id, 0])) as AnswerMap;
    const report = buildPersonalityReport(user, scoreMbtiAnswers(mbtiQuestions, answers), answers);

    expect(formatReportText(report)).toContain("阿土伯的MBTI 人格倾向报告");
    expect(formatReportText(report)).not.toContain("16型人格倾向报告");
  });

  it("五型动物人格测验报告包含测试类型、四维结果和协作建议", () => {
    const answers = Object.fromEntries(
      discQuestions.map((question) => [question.id, question.dimension === "D" ? 2 : question.dimension === "C" ? 1 : -1]),
    ) as AnswerMap;
    const report = buildDiscReport(user, scoreDiscAnswers(discQuestions, answers), answers);

    expect(report.testType).toBe("disc");
    expect(report.typeCode).toBe("DC");
    expect(report.sections.map((section) => section.title)).toContain("合作建议");
    expect(formatReportText(report)).toContain("阿土伯的五型动物人格测验报告");
    expect(formatReportText(report)).toContain("D: 100%");
  });
});
