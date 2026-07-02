import { describe, expect, it } from "vitest";
import { mbtiQuestions } from "./questions";
import { scoreMbtiAnswers } from "./scoring";
import type { AnswerMap } from "./types";

describe("16型人格倾向评分", () => {
  it("题库包含60道题，并覆盖四组维度", () => {
    expect(mbtiQuestions).toHaveLength(60);
    expect(new Set(mbtiQuestions.map((question) => question.dimension))).toEqual(
      new Set(["EI", "SN", "TF", "JP"]),
    );
    expect(mbtiQuestions.every((question) => question.prompt.length >= 12)).toBe(true);
  });

  it("每道题都有简短案例，帮助理解题意", () => {
    expect(mbtiQuestions.every((question) => question.example.startsWith("例如："))).toBe(true);
    expect(mbtiQuestions.every((question) => question.example.length >= 24 && question.example.length <= 90)).toBe(true);
  });

  it("题目避免明显价值诱导词，尽量呈现两个合理偏好", () => {
    const loadedTerms = ["正确", "受伤", "信任", "尊重", "责任", "体面", "焦虑", "不舒服", "必须", "真正"];
    const text = mbtiQuestions
      .flatMap((question) => [question.prompt, question.leftLabel, question.rightLabel, question.example])
      .join("\n");

    for (const term of loadedTerms) {
      expect(text).not.toContain(term);
    }
  });

  it("根据四组维度生成16型代码和比例", () => {
    const answers: AnswerMap = Object.fromEntries(
      mbtiQuestions.map((question) => [
        question.id,
        question.positive === "E" || question.positive === "N" || question.positive === "F" || question.positive === "P"
          ? 2
          : -2,
      ]),
    ) as AnswerMap;

    const result = scoreMbtiAnswers(mbtiQuestions, answers);

    expect(result.typeCode).toBe("ENFP");
    expect(result.dimensions.EI.winner).toBe("E");
    expect(result.dimensions.SN.winner).toBe("N");
    expect(result.dimensions.TF.winner).toBe("F");
    expect(result.dimensions.JP.winner).toBe("P");
    expect(result.dimensions.EI.percentages.E).toBeGreaterThan(70);
  });

  it("平分时仍生成类型，并标记倾向不明显", () => {
    const answers = Object.fromEntries(mbtiQuestions.map((question) => [question.id, 0])) as AnswerMap;

    const result = scoreMbtiAnswers(mbtiQuestions, answers);

    expect(result.typeCode).toBe("ESTJ");
    expect(result.dimensions.EI.strength).toBe("balanced");
    expect(result.dimensions.SN.note).toContain("倾向不明显");
  });
});
