import { describe, expect, it } from "vitest";
import { discQuestions, mbtiQuestions } from "./questions";
import { scoreDiscAnswers, scoreMbtiAnswers } from "./scoring";
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

describe("五型动物人格测验评分", () => {
  it("题库包含48道题，并平均覆盖四个DISC维度", () => {
    expect(discQuestions).toHaveLength(48);
    expect(new Set(discQuestions.map((question) => question.dimension))).toEqual(
      new Set(["D", "I", "S", "C"]),
    );

    for (const dimension of ["D", "I", "S", "C"]) {
      expect(discQuestions.filter((question) => question.dimension === dimension)).toHaveLength(12);
    }
  });

  it("题目采用左右偏好取舍，避免正向自评诱导", () => {
    const leadingPhrases = ["我会", "我愿意", "我擅长", "我喜欢", "我适合", "我容易", "我倾向于", "我更信任", "主动"];
    const promptText = discQuestions.map((question) => question.prompt).join("\n");

    expect(discQuestions.every((question) => question.leftLabel.length >= 6)).toBe(true);
    expect(discQuestions.every((question) => question.rightLabel.length >= 6)).toBe(true);
    expect(discQuestions.every((question) => question.example.startsWith("例如："))).toBe(true);

    for (const phrase of leadingPhrases) {
      expect(promptText).not.toContain(phrase);
    }
  });

  it("根据四个独立维度生成主类型、复合类型和百分比", () => {
    const answers: AnswerMap = Object.fromEntries(
      discQuestions.map((question) => [
        question.id,
        question.dimension === "D" ? 2 : question.dimension === "C" ? 1 : -1,
      ]),
    ) as AnswerMap;

    const result = scoreDiscAnswers(discQuestions, answers);

    expect(result.typeCode).toBe("DC");
    expect(result.dimensions.D.percent).toBe(100);
    expect(result.dimensions.C.percent).toBeGreaterThan(result.dimensions.I.percent);
    expect(result.dimensions.D.note).toContain("高");
  });

  it("全部中间答案时生成混合型，并标记倾向不明显", () => {
    const answers = Object.fromEntries(discQuestions.map((question) => [question.id, 0])) as AnswerMap;

    const result = scoreDiscAnswers(discQuestions, answers);

    expect(result.typeCode).toBe("MIX");
    expect(result.dimensions.D.strength).toBe("balanced");
    expect(result.dimensions.S.note).toContain("倾向不明显");
  });

  it("第一第二名接近但第三名拉开时仍生成复合类型，不误判混合型", () => {
    const answers: AnswerMap = Object.fromEntries(
      discQuestions.map((question) => [
        question.id,
        question.dimension === "D" ? 1 : question.dimension === "C" ? 1 : question.dimension === "I" ? 0 : -1,
      ]),
    ) as AnswerMap;

    const result = scoreDiscAnswers(discQuestions, answers);

    expect(result.dimensions.D.percent).toBe(result.dimensions.C.percent);
    expect(result.dimensions.D.percent - result.dimensions.I.percent).toBeGreaterThanOrEqual(8);
    expect(result.typeCode).toBe("DC");
  });
});
