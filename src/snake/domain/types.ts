export type SnakeSkinId = "sudoku" | "ink" | "jade";

export type SnakeRecord = {
  id: string;
  userId: string;
  username: string;
  score: number;
  length: number;
  speedLevel: number;
  skin: SnakeSkinId;
  startedAt: string;
  completedAt: string;
};

export type SnakeData = {
  version: 1;
  records: SnakeRecord[];
  lastSkin: SnakeSkinId;
};
