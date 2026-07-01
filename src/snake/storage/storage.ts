const HIGH_SCORE_KEY = "atube-lab:snake:high-score";

export function loadHighScore() {
  const raw = localStorage.getItem(HIGH_SCORE_KEY);
  const value = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function saveHighScore(score: number) {
  const next = Math.max(loadHighScore(), score);
  localStorage.setItem(HIGH_SCORE_KEY, String(next));
  return next;
}
