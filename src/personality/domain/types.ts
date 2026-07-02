export type MbtiDimension = "EI" | "SN" | "TF" | "JP";
export type MbtiLetter = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";
export type AnswerValue = -2 | -1 | 0 | 1 | 2;
export type PersonalityTestType = "sixteen-types";
export type PreferenceStrength = "balanced" | "slight" | "moderate" | "clear";

export type MbtiQuestion = {
  id: string;
  dimension: MbtiDimension;
  positive: MbtiLetter;
  prompt: string;
  example: string;
  leftLabel: string;
  rightLabel: string;
};

export type AnswerMap = Record<string, AnswerValue>;

export type DimensionScore = {
  left: MbtiLetter;
  right: MbtiLetter;
  winner: MbtiLetter;
  percentages: Record<string, number>;
  strength: PreferenceStrength;
  note: string;
};

export type MbtiScoreResult = {
  typeCode: string;
  dimensions: Record<MbtiDimension, DimensionScore>;
};

export type ReportSection = {
  title: string;
  body: string;
};

export type PersonalityReport = {
  id: string;
  testType: PersonalityTestType;
  userId: string;
  username: string;
  typeCode: string;
  createdAt: string;
  scores: Record<MbtiDimension, DimensionScore>;
  answers: AnswerMap;
  sections: ReportSection[];
};

export type PersonalityUser = {
  id: string;
  name: string;
  avatarColor: string;
  createdAt: string;
};
