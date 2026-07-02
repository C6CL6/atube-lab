import type { AnswerMap, DimensionScore, MbtiDimension, MbtiLetter, MbtiQuestion, MbtiScoreResult, PreferenceStrength } from "./types";

const DIMENSION_LETTERS: Record<MbtiDimension, [MbtiLetter, MbtiLetter]> = {
  EI: ["E", "I"],
  SN: ["S", "N"],
  TF: ["T", "F"],
  JP: ["J", "P"],
};

function strengthFromGap(gap: number): PreferenceStrength {
  if (gap < 8) return "balanced";
  if (gap < 18) return "slight";
  if (gap < 34) return "moderate";
  return "clear";
}

function strengthLabel(strength: PreferenceStrength) {
  return strength === "balanced" ? "倾向不明显" : strength === "slight" ? "轻微倾向" : strength === "moderate" ? "中等倾向" : "清晰倾向";
}

function scoreDimension(dimension: MbtiDimension, questions: MbtiQuestion[], answers: AnswerMap): DimensionScore {
  const [left, right] = DIMENSION_LETTERS[dimension];
  const totals: Record<string, number> = { [left]: 0, [right]: 0 };

  for (const question of questions) {
    if (question.dimension !== dimension) continue;
    const answer = answers[question.id] ?? 0;
    const opposite = question.positive === left ? right : left;
    if (answer > 0) totals[question.positive] += answer;
    if (answer < 0) totals[opposite] += Math.abs(answer);
  }

  const total = totals[left] + totals[right];
  const leftPercent = total === 0 ? 50 : Math.round((totals[left] / total) * 100);
  const rightPercent = 100 - leftPercent;
  const winner = leftPercent >= rightPercent ? left : right;
  const gap = Math.abs(leftPercent - rightPercent);
  const strength = strengthFromGap(gap);
  return {
    left,
    right,
    winner,
    percentages: { [left]: leftPercent, [right]: rightPercent },
    strength,
    note: `${winner} ${strengthLabel(strength)}${strength === "balanced" ? "，可以结合具体场景再观察。" : "。"}`,
  };
}

export function scoreMbtiAnswers(questions: MbtiQuestion[], answers: AnswerMap): MbtiScoreResult {
  const dimensions = {
    EI: scoreDimension("EI", questions, answers),
    SN: scoreDimension("SN", questions, answers),
    TF: scoreDimension("TF", questions, answers),
    JP: scoreDimension("JP", questions, answers),
  };
  return {
    typeCode: `${dimensions.EI.winner}${dimensions.SN.winner}${dimensions.TF.winner}${dimensions.JP.winner}`,
    dimensions,
  };
}
