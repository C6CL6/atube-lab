import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";

describe("网站导航", () => {
  it("保留数独入口，删除测验和贪吃蛇入口", () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "AI音乐" })).toHaveAttribute("href", "/music");
    expect(screen.getByRole("link", { name: "声音叙事" })).toHaveAttribute("href", "/#stories");
    expect(screen.getByRole("link", { name: "数独" })).toHaveAttribute("href", "/sudoku");
    expect(screen.queryByText("测验")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "性格测试" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "贪吃蛇" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "AI学习" })).not.toBeInTheDocument();
  });

  it("不再显示创作手记入口", () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );

    expect(screen.queryByRole("link", { name: "创作手记" })).not.toBeInTheDocument();
  });
});
