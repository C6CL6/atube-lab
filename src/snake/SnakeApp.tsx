import { Pause, Play, RefreshCw, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { fetchSnakeCloudRecords, submitSnakeCloudRecord } from "./api/cloudRecords";
import {
  changeDirection,
  createSnakeGame,
  frameDelayMs,
  stepSnakeGame,
  type Direction,
  type Point,
} from "./domain/snake";
import { topSnakeRecords } from "./domain/ranking";
import type { SnakeRecord, SnakeSkinId } from "./domain/types";
import { createUser, deleteUser, loadAppData, saveAppData } from "../sudoku/storage/storage";
import type { AppData } from "../sudoku/domain/types";
import {
  addLocalSnakeRecord,
  clearLocalSnakeRecords,
  loadHighScore,
  loadSnakeData,
  saveHighScore,
  saveLastSnakeSkin,
} from "./storage/storage";
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

const snakeSkins: Array<{ id: SnakeSkinId; label: string; description: string }> = [
  { id: "sudoku", label: "数独同款", description: "宣纸暖底、朱砂食物、青绿蛇身" },
  { id: "ink", label: "墨色棋盘", description: "黑白克制，适合夜间专注" },
  { id: "jade", label: "青玉棋盘", description: "温润青绿，手机上更醒目" },
];

function formatRecordTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function SnakeRankingModal({
  onlineRecords,
  localRecords,
  cloudUnavailable,
  onClearLocal,
  onClose,
}: {
  onlineRecords: SnakeRecord[];
  localRecords: SnakeRecord[];
  cloudUnavailable: boolean;
  onClearLocal: () => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"online" | "local">("online");
  const records = activeTab === "online" ? onlineRecords : localRecords;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal snake-ranking-modal" role="dialog" aria-modal="true" aria-labelledby="snake-ranking-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-title-row">
          <div>
            <p className="eyebrow">{activeTab === "online" ? "云端前十名" : "本机前十名"}</p>
            <h2 id="snake-ranking-title">贪吃蛇排行榜</h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="关闭排行榜">×</button>
        </div>
        <div className="ranking-tabs" role="tablist" aria-label="贪吃蛇排行榜类型">
          <button role="tab" aria-selected={activeTab === "online"} className={activeTab === "online" ? "is-active" : ""} onClick={() => setActiveTab("online")}>在线排行榜</button>
          <button role="tab" aria-selected={activeTab === "local"} className={activeTab === "local" ? "is-active" : ""} onClick={() => setActiveTab("local")}>本机排行榜</button>
        </div>
        {cloudUnavailable && activeTab === "online" ? <p className="ranking-warning">在线排行榜暂时不可用，本机成绩仍会保存。</p> : null}
        {activeTab === "local" ? (
          <div className="local-ranking-actions">
            <p>本机排行榜只统计当前浏览器保存的贪吃蛇成绩。</p>
            <button onClick={onClearLocal} disabled={localRecords.length === 0}>清零本机排行</button>
          </div>
        ) : null}
        {records.length === 0 ? (
          <p className="empty-ranking">完成第一局后，成绩会出现在这里。</p>
        ) : (
          <div className="ranking-list">
            <div className="ranking-row ranking-heading">
              <span>名次</span><span>玩家</span><span>分数</span><span>长度</span><span>时间</span>
            </div>
            {records.map((record, index) => (
              <div className="ranking-row snake-ranking-row" key={record.id}>
                <strong>{index + 1}</strong>
                <span>{record.username}</span>
                <strong>{record.score}</strong>
                <span>{record.length}</span>
                <span>{formatRecordTime(record.completedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function SnakeApp() {
  const [game, setGame] = useState(() => createSnakeGame());
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sudokuData, setSudokuData] = useState<AppData>(() => loadAppData());
  const [snakeData, setSnakeData] = useState(() => loadSnakeData());
  const [highScore, setHighScore] = useState(() => loadHighScore());
  const [skin, setSkin] = useState<SnakeSkinId>(() => loadSnakeData().lastSkin);
  const [name, setName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showRanking, setShowRanking] = useState(false);
  const [cloudRecords, setCloudRecords] = useState<SnakeRecord[]>([]);
  const [cloudUnavailable, setCloudUnavailable] = useState(false);

  const snakeCells = useMemo(() => new Set(game.snake.map(pointKey)), [game.snake]);
  const headKey = pointKey(game.snake[0]);
  const foodKey = pointKey(game.food);
  const activeUser = sudokuData.users.find((user) => user.id === sudokuData.activeUserId);
  const onlineRankingRecords = useMemo(
    () => cloudUnavailable ? [] : topSnakeRecords(cloudRecords),
    [cloudRecords, cloudUnavailable],
  );
  const localRankingRecords = useMemo(() => topSnakeRecords(snakeData.records), [snakeData.records]);

  const persistSudokuData = useCallback((next: AppData) => {
    setSudokuData(next);
    saveAppData(next);
  }, []);

  const refreshCloudRecords = useCallback(async () => {
    const result = await fetchSnakeCloudRecords();
    setCloudRecords(result.records);
    setCloudUnavailable(result.unavailable);
  }, []);

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

  const selectSkin = (nextSkin: SnakeSkinId) => {
    setSkin(nextSkin);
    setSnakeData(saveLastSnakeSkin(nextSkin));
  };

  const createPlayer = (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = createUser(sudokuData, name);
      persistSudokuData(created.data);
      setName("");
      setLoginError("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "无法创建用户");
    }
  };

  const switchUser = () => {
    setRunning(false);
    setPaused(false);
    persistSudokuData({ ...sudokuData, activeUserId: null });
  };

  const login = (userId: string) => {
    persistSudokuData({ ...sudokuData, activeUserId: userId });
  };

  const removeUser = (userId: string) => {
    const user = sudokuData.users.find((item) => item.id === userId);
    if (!user) return;
    if (window.confirm(`确定删除“${user.name}”吗？该玩家的数独和贪吃蛇身份都会删除。`)) {
      persistSudokuData(deleteUser(sudokuData, userId));
    }
  };

  const clearLocalRanking = () => {
    if (snakeData.records.length === 0) return;
    if (!window.confirm("确定清零本机贪吃蛇排行榜吗？这不会影响在线排行榜。")) return;
    const next = clearLocalSnakeRecords();
    setSnakeData(next);
    setHighScore(loadHighScore());
  };

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
    void refreshCloudRecords();
  }, [refreshCloudRecords]);

  useEffect(() => {
    if (game.isGameOver) {
      setRunning(false);
      if (!game.recorded && activeUser) {
        const record: SnakeRecord = {
          id: crypto.randomUUID(),
          userId: activeUser.id,
          username: activeUser.name,
          score: game.score,
          length: game.snake.length,
          speedLevel: game.speedLevel,
          skin,
          startedAt: game.startedAt,
          completedAt: new Date().toISOString(),
        };
        const nextData = addLocalSnakeRecord(record);
        setSnakeData(nextData);
        setHighScore(saveHighScore(game.score));
        setGame((current) => ({ ...current, recorded: true }));
        void submitSnakeCloudRecord(record).then(() => refreshCloudRecords());
      } else {
        setHighScore(saveHighScore(game.score));
      }
    }
  }, [activeUser, game, refreshCloudRecords, skin]);

  const statusText = game.isGameOver ? "游戏结束" : paused ? "已暂停" : running ? "进行中" : "准备开始";

  if (!activeUser) {
    return (
      <section className="snake-shell snake-shell--warm" aria-labelledby="snake-login-title">
        <div className="snake-login">
          <div>
            <p className="snake-brand">A-tube Lab</p>
            <h1 id="snake-login-title">选择玩家</h1>
            <p className="snake-intro">贪吃蛇沿用数独用户名，不用重复注册；没有名字时在这里创建。</p>
            {sudokuData.users.length > 0 ? (
              <div className="snake-user-list">
                {sudokuData.users.map((user) => (
                  <div className="snake-user-card" key={user.id}>
                    <button onClick={() => login(user.id)}>
                      <span style={{ background: user.avatarColor }}>{user.name.slice(0, 1)}</span>
                      <strong>{user.name}</strong>
                    </button>
                    <button className="snake-user-delete" onClick={() => removeUser(user.id)}>删除</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <form className="snake-create-profile" onSubmit={createPlayer}>
            <h2>{sudokuData.users.length > 0 ? "新玩家" : "创建用户名"}</h2>
            <label htmlFor="snake-username">用户名</label>
            <input
              id="snake-username"
              maxLength={12}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setLoginError("");
              }}
              placeholder="例如：阿土伯"
              autoComplete="off"
            />
            {loginError ? <p className="form-error" role="alert">{loginError}</p> : null}
            <button className="button button--primary" type="submit">开始游戏</button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className={`snake-shell snake-shell--${skin}`} aria-labelledby="snake-title">
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
          <div className="snake-player-row">
            <span className="snake-player-avatar" style={{ background: activeUser.avatarColor }}>{activeUser.name.slice(0, 1)}</span>
            <strong>{activeUser.name}</strong>
            <button onClick={switchUser}>切换玩家</button>
          </div>
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
            <button className="button button--ghost snake-reset" onClick={() => setShowRanking(true)}>
              <Trophy size={16} />
              排行榜
            </button>
          </div>

          <fieldset className="snake-skins" aria-label="游戏皮肤">
            <legend>游戏皮肤</legend>
            {snakeSkins.map((item) => (
              <label key={item.id} className={skin === item.id ? "is-active" : ""}>
                <input
                  type="radio"
                  name="snake-skin"
                  aria-label={item.label}
                  checked={skin === item.id}
                  onChange={() => selectSkin(item.id)}
                />
                <span>{item.label}</span>
                <small>{item.description}</small>
              </label>
            ))}
          </fieldset>

          <div className="snake-controls" aria-label="方向控制">
            <button aria-label="向上" onClick={() => move("up")}>↑</button>
            <button aria-label="向左" onClick={() => move("left")}>←</button>
            <button aria-label="向下" onClick={() => move("down")}>↓</button>
            <button aria-label="向右" onClick={() => move("right")}>→</button>
          </div>

          <p className="snake-help">方向键 / WASD 控制，Space 暂停，R 重开。</p>
        </aside>
      </div>
      {showRanking ? (
        <SnakeRankingModal
          onlineRecords={onlineRankingRecords}
          localRecords={localRankingRecords}
          cloudUnavailable={cloudUnavailable}
          onClearLocal={clearLocalRanking}
          onClose={() => setShowRanking(false)}
        />
      ) : null}
    </section>
  );
}
