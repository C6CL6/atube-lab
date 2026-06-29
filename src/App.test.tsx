import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("临时访问 /guandan 时回到首页基准内容", () => {
    render(
      <MemoryRouter initialEntries={["/guandan"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /让算法参与创作/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "在线掼蛋" })).not.toBeInTheDocument();
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
      <MemoryRouter initialEntries={["/sudoku?window=game"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("grid", { name: "数独棋盘" })).toBeInTheDocument();
    expect(screen.queryByText("阿土伯灵感实验室出品")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "关闭游戏窗口" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "返回主页" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "排行榜" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("点击难度开始正式游戏时打开可缩放游戏窗口", async () => {
    const focus = vi.fn();
    const open = vi.spyOn(window, "open").mockReturnValue({ focus } as unknown as Window);
    const user = {
      id: "user-1",
      name: "阿土伯",
      avatarColor: "#913f30",
      createdAt: "2026-06-25T00:00:00.000Z"
    };
    localStorage.setItem("atube-sudoku-v1", JSON.stringify({
      version: 1,
      users: [user],
      activeUserId: user.id,
      games: {},
      records: [],
      lastDifficulty: "easy"
    }));
    const userAction = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/sudoku"]}>
        <App />
      </MemoryRouter>
    );

    await userAction.click(screen.getByRole("button", { name: "新手 轻松热身" }));

    await waitFor(() => {
      expect(open).toHaveBeenCalledWith(
        "/sudoku?window=game",
        "atube-sudoku-game",
        expect.stringContaining("resizable=yes"),
      );
    });
    expect(focus).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".sudoku-app--playing")).not.toBeInTheDocument();
  });

  it("游戏窗口尚未开局时不锁定为正式游戏布局，手机端仍可滚动选择难度", () => {
    const user = {
      id: "user-1",
      name: "阿土伯",
      avatarColor: "#913f30",
      createdAt: "2026-06-25T00:00:00.000Z"
    };
    localStorage.setItem("atube-sudoku-v1", JSON.stringify({
      version: 1,
      users: [user],
      activeUserId: user.id,
      games: {},
      records: [],
      lastDifficulty: "easy"
    }));

    render(
      <MemoryRouter initialEntries={["/sudoku?window=game"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "选择游戏界面与难度" })).toBeInTheDocument();
    expect(document.querySelector(".sudoku-app--playing")).not.toBeInTheDocument();
  });
});
