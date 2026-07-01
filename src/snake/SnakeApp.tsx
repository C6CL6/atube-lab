import { Pause, Play, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  changeDirection,
  createSnakeGame,
  frameDelayMs,
  stepSnakeGame,
  type Direction,
  type Point,
} from "./domain/snake";
import { loadHighScore, saveHighScore } from "./storage/storage";
import "./styles.css";

const keyDirections: Record<string, Direction> = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
};

function pointKey(point: Point) {
  return `${point.x}:${point.y}`;
}

export function SnakeApp() {
  const [game, setGame] = useState(() => createSnakeGame());
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [highScore, setHighScore] = useState(() => loadHighScore());

  const snakeCells = useMemo(() => new Set(game.snake.map(pointKey)), [game.snake]);
  const headKey = pointKey(game.snake[0]);
  const foodKey = pointKey(game.food);

  const restart = useCallback(() => {
    setGame(createSnakeGame());
    setRunning(true);
    setPaused(false);
  }, []);

  const start = useCallback(() => {
    setRunning(true);
    setPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    if (!running || game.isGameOver) {
      return;
    }
    setPaused((current) => !current);
  }, [game.isGameOver, running]);

  const move = useCallback((direction: Direction) => {
    setGame((current) => changeDirection(current, direction));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = keyDirections[event.key];
      if (direction) {
        event.preventDefault();
        move(direction);
        if (!running && !game.isGameOver) {
          start();
        }
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        if (!running) {
          start();
        } else {
          togglePause();
        }
      }

      if (event.key === "r" || event.key === "R") {
        restart();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game.isGameOver, move, restart, running, start, togglePause]);

  useEffect(() => {
    if (!running || paused || game.isGameOver) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setGame((current) => stepSnakeGame(current));
    }, frameDelayMs(game.speedLevel));

    return () => window.clearInterval(timer);
  }, [game.isGameOver, game.speedLevel, paused, running]);

  useEffect(() => {
    if (game.isGameOver) {
      setRunning(false);
      setHighScore(saveHighScore(game.score));
    }
  }, [game.isGameOver, game.score]);

  const statusText = game.isGameOver ? "游戏结束" : paused ? "已暂停" : running ? "进行中" : "准备开始";

  return (
    <section className="snake-shell" aria-labelledby="snake-title">
      <div className="snake-stage">
        <div className="snake-board-wrap">
          <div
            className="snake-board"
            role="grid"
            aria-label="贪吃蛇棋盘"
            style={{
              gridTemplateColumns: `repeat(${game.width}, 1fr)`,
              gridTemplateRows: `repeat(${game.height}, 1fr)`,
            }}
          >
            {Array.from({ length: game.width * game.height }, (_, index) => {
              const point = { x: index % game.width, y: Math.floor(index / game.width) };
              const key = pointKey(point);
              const isHead = key === headKey;
              const isSnake = snakeCells.has(key);
              const isFood = key === foodKey;
              return (
                <span
                  key={key}
                  className={[
                    "snake-cell",
                    isSnake ? "snake-cell--body" : "",
                    isHead ? "snake-cell--head" : "",
                    isFood ? "snake-cell--food" : "",
                  ].filter(Boolean).join(" ")}
                  role="gridcell"
                  aria-label={isHead ? "蛇头" : isFood ? "食物" : undefined}
                />
              );
            })}
          </div>
        </div>

        <aside className="snake-panel" aria-label="贪吃蛇状态">
          <p className="snake-brand">A-tube Lab</p>
          <h1 id="snake-title">贪吃蛇</h1>
          <p className="snake-intro">经典耐玩版，吃到红色食物得分，速度会随分数提升。</p>

          <div className="snake-score-grid">
            <div>
              <span>本局得分</span>
              <strong>{game.score}</strong>
            </div>
            <div>
              <span>最高分</span>
              <strong>{highScore}</strong>
            </div>
            <div>
              <span>速度</span>
              <strong>{game.speedLevel}</strong>
            </div>
            <div>
              <span>状态</span>
              <strong>{statusText}</strong>
            </div>
          </div>

          <p className="snake-high-score">最高分 {highScore}</p>

          <div className="snake-actions">
            <button className="button button--primary" onClick={running ? togglePause : start}>
              {running && !paused ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}
              {running && !paused ? "暂停" : "开始游戏"}
            </button>
            <button className="button button--ghost snake-reset" onClick={restart}>
              <RefreshCw size={16} />
              重新开始
            </button>
          </div>

          <div className="snake-controls" aria-label="方向控制">
            <button aria-label="向上" onClick={() => move("up")}>↑</button>
            <button aria-label="向左" onClick={() => move("left")}>←</button>
            <button aria-label="向下" onClick={() => move("down")}>↓</button>
            <button aria-label="向右" onClick={() => move("right")}>→</button>
          </div>

          <p className="snake-help">方向键 / WASD 控制，Space 暂停，R 重开。</p>
        </aside>
      </div>
    </section>
  );
}
