import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("官网路由", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("可以通过 /sudoku 打开数独游戏页面", () => {
    render(
      <MemoryRouter initialEntries={["/sudoku"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "欢迎来到数独" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "数独" })).toHaveAttribute("href", "/sudoku");
    expect(screen.getAllByText("A-tube的灵感实验室").length).toBeGreaterThan(0);
  });

  it("进入正式数独游戏后隐藏官网导航和页脚，释放游戏空间", () => {
    const user = {
      id: "user-1",
      name: "阿土伯",
      avatarColor: "#913f30",
      createdAt: "2026-06-25T00:00:00.000Z"
    };
    const puzzle = Array.from({ length: 81 }, (_, index) => index % 9 === 0 ? 0 : ((index % 9) + 1));
    const game = {
      id: "game-1",
      difficulty: "easy",
      puzzle,
      solution: Array.from({ length: 81 }, (_, index) => (index % 9) + 1),
      values: puzzle,
      initialEmptyCount: 9,
      selectedIndex: 0,
      elapsedSeconds: 0,
      paused: false,
      completed: false,
      recorded: false,
      score: {
        difficulty: "easy",
        initialEmptyCount: 9,
        score: 0,
        streak: 0,
        mistakes: 0,
        frozen: false,
        scoredCells: []
      },
      history: [],
      startedAt: "2026-06-25T00:00:00.000Z"
    };
    localStorage.setItem("atube-sudoku-v1", JSON.stringify({
      version: 1,
      users: [user],
      activeUserId: user.id,
      games: { [user.id]: game },
      records: [],
      lastDifficulty: "easy"
    }));

    render(
      <MemoryRouter initialEntries={["/sudoku"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("grid", { name: "数独棋盘" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});
