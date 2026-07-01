export type Direction = "up" | "down" | "left" | "right";

export type Point = {
  x: number;
  y: number;
};

export type SnakeGameState = {
  width: number;
  height: number;
  snake: Point[];
  direction: Direction;
  nextDirection: Direction;
  food: Point;
  score: number;
  speedLevel: number;
  isGameOver: boolean;
  seed: number;
  startedAt: string;
  recorded: boolean;
};

const DEFAULT_WIDTH = 28;
const DEFAULT_HEIGHT = 20;

const moves: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function samePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function isOpposite(a: Direction, b: Direction) {
  return moves[a].x + moves[b].x === 0 && moves[a].y + moves[b].y === 0;
}

function nextSeed(seed: number) {
  return (seed * 1664525 + 1013904223) >>> 0;
}

function spawnFood(width: number, height: number, snake: Point[], seed: number) {
  const emptyCells: Point[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const point = { x, y };
      if (!snake.some((segment) => samePoint(segment, point))) {
        emptyCells.push(point);
      }
    }
  }

  if (emptyCells.length === 0) {
    return { food: snake[0], seed, isGameOver: true };
  }

  const next = nextSeed(seed);
  return {
    food: emptyCells[next % emptyCells.length],
    seed: next,
    isGameOver: false,
  };
}

export function createSnakeGame(options: { seed?: number } = {}): SnakeGameState {
  const width = DEFAULT_WIDTH;
  const height = DEFAULT_HEIGHT;
  const center = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  const snake = [
    center,
    { x: center.x - 1, y: center.y },
    { x: center.x - 2, y: center.y },
  ];
  const seededFood = spawnFood(width, height, snake, options.seed ?? Date.now());

  return {
    width,
    height,
    snake,
    direction: "right",
    nextDirection: "right",
    food: seededFood.food,
    score: 0,
    speedLevel: 1,
    isGameOver: seededFood.isGameOver,
    seed: seededFood.seed,
    startedAt: new Date().toISOString(),
    recorded: false,
  };
}

export function changeDirection(game: SnakeGameState, direction: Direction): SnakeGameState {
  if (isOpposite(direction, game.direction)) {
    return game;
  }
  return { ...game, nextDirection: direction, direction };
}

export function stepSnakeGame(game: SnakeGameState): SnakeGameState {
  if (game.isGameOver) {
    return game;
  }

  const move = moves[game.nextDirection];
  const newHead = {
    x: game.snake[0].x + move.x,
    y: game.snake[0].y + move.y,
  };
  const ateFood = samePoint(newHead, game.food);
  const nextSnake = ateFood ? [newHead, ...game.snake] : [newHead, ...game.snake.slice(0, -1)];
  const hitsWall = newHead.x < 0 || newHead.y < 0 || newHead.x >= game.width || newHead.y >= game.height;
  const hitsSelf = nextSnake.slice(1).some((segment) => samePoint(segment, newHead));

  if (hitsWall || hitsSelf) {
    return { ...game, isGameOver: true };
  }

  if (!ateFood) {
    return {
      ...game,
      snake: nextSnake,
      direction: game.nextDirection,
    };
  }

  const score = game.score + 10;
  const spawned = spawnFood(game.width, game.height, nextSnake, game.seed);

  return {
    ...game,
    snake: nextSnake,
    direction: game.nextDirection,
    food: spawned.food,
    score,
    speedLevel: 1 + Math.floor(score / 50),
    isGameOver: spawned.isGameOver,
    seed: spawned.seed,
  };
}

export function frameDelayMs(speedLevel: number) {
  return Math.max(110, 240 - (speedLevel - 1) * 18);
}
