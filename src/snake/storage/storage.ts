import { rankSnakeRecords, topSnakeRecords } from "../domain/ranking";
import type { SnakeData, SnakeRecord, SnakeSkinId } from "../domain/types";

const HIGH_SCORE_KEY = "atube-lab:snake:high-score";
const STORAGE_KEY = "atube-lab:snake-v1";

export function createEmptySnakeData(): SnakeData {
  return {
    version: 1,
    records: [],
    lastSkin: "sudoku",
  };
}

export function loadSnakeData(): SnakeData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptySnakeData();
    const parsed = JSON.parse(raw) as SnakeData;
    if (parsed.version !== 1 || !Array.isArray(parsed.records)) return createEmptySnakeData();
    return {
      version: 1,
      records: topSnakeRecords(parsed.records),
      lastSkin: parsed.lastSkin === "ink" || parsed.lastSkin === "jade" ? parsed.lastSkin : "sudoku",
    };
  } catch {
    return createEmptySnakeData();
  }
}

export function saveSnakeData(data: SnakeData) {
  const next = { ...data, records: topSnakeRecords(data.records) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function addLocalSnakeRecord(record: SnakeRecord) {
  const data = loadSnakeData();
  return saveSnakeData({
    ...data,
    records: rankSnakeRecords([...data.records, record]).slice(0, 10),
  });
}

export function clearLocalSnakeRecords() {
  const data = loadSnakeData();
  return saveSnakeData({ ...data, records: [] });
}

export function saveLastSnakeSkin(skin: SnakeSkinId) {
  const data = loadSnakeData();
  return saveSnakeData({ ...data, lastSkin: skin });
}

export function loadHighScore() {
  const dataBest = loadSnakeData().records.reduce((best, record) => Math.max(best, record.score), 0);
  const raw = localStorage.getItem(HIGH_SCORE_KEY);
  const value = raw ? Number.parseInt(raw, 10) : 0;
  const legacyBest = Number.isFinite(value) && value > 0 ? value : 0;
  return Math.max(dataBest, legacyBest);
}

export function saveHighScore(score: number) {
  const next = Math.max(loadHighScore(), score);
  localStorage.setItem(HIGH_SCORE_KEY, String(next));
  return next;
}
