import { describe, expect, it } from "vitest";
import { changeDirection, createSnakeGame, stepSnakeGame } from "./snake";

describe("贪吃蛇规则", () => {
  it("按桌面版尺寸和初始蛇身开局", () => {
    const game = createSnakeGame({ seed: 7 });

    expect(game.width).toBe(28);
    expect(game.height).toBe(20);
    expect(game.direction).toBe("right");
    expect(game.snake).toEqual([
      { x: 14, y: 10 },
      { x: 13, y: 10 },
      { x: 12, y: 10 },
    ]);
    expect(game.score).toBe(0);
    expect(game.speedLevel).toBe(1);
    expect(game.isGameOver).toBe(false);
    expect(game.food).not.toEqual(expect.objectContaining({ x: 14, y: 10 }));
  });

  it("阻止直接反向移动", () => {
    const game = createSnakeGame({ seed: 7 });

    expect(changeDirection(game, "left").direction).toBe("right");
    expect(changeDirection(game, "up").direction).toBe("up");
  });

  it("吃到食物后加 10 分、增长一节并提升速度等级", () => {
    const game = {
      ...createSnakeGame({ seed: 7 }),
      snake: [
        { x: 14, y: 10 },
        { x: 13, y: 10 },
        { x: 12, y: 10 },
      ],
      food: { x: 15, y: 10 },
      score: 40,
    };

    const next = stepSnakeGame(game);

    expect(next.score).toBe(50);
    expect(next.speedLevel).toBe(2);
    expect(next.snake).toHaveLength(4);
    expect(next.snake[0]).toEqual({ x: 15, y: 10 });
    expect(next.food).not.toEqual({ x: 15, y: 10 });
  });

  it("撞墙后游戏结束并保持当前位置", () => {
    const game = {
      ...createSnakeGame({ seed: 7 }),
      snake: [
        { x: 27, y: 10 },
        { x: 26, y: 10 },
        { x: 25, y: 10 },
      ],
      food: { x: 0, y: 0 },
    };

    const next = stepSnakeGame(game);

    expect(next.isGameOver).toBe(true);
    expect(next.snake).toEqual(game.snake);
  });
});
