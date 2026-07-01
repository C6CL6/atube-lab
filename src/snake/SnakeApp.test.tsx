import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SnakeApp } from "./SnakeApp";

describe("贪吃蛇玩家身份", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("沿用数独当前用户名进入游戏", () => {
    localStorage.setItem("atube-sudoku-v1", JSON.stringify({
      version: 1,
      users: [{
        id: "user-1",
        name: "阿土伯",
        avatarColor: "#913f30",
        createdAt: "2026-07-01T00:00:00.000Z",
      }],
      activeUserId: "user-1",
      games: {},
      records: [],
      lastDifficulty: "easy",
      lastBoardStyle: "decorative",
    }));

    render(<SnakeApp />);

    expect(screen.getByText("阿土伯")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "排行榜" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "数独同款" })).toBeChecked();
  });

  it("没有数独用户名时提示先创建玩家", () => {
    render(<SnakeApp />);

    expect(screen.getByRole("heading", { name: "选择玩家" })).toBeInTheDocument();
    expect(screen.getByLabelText("用户名")).toBeInTheDocument();
  });
});
