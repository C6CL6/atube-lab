import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";

describe("网站导航", () => {
  it("提供数独游戏入口", () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "数独" })).toHaveAttribute("href", "/sudoku");
  });

  it("暂时隐藏掼蛋入口", () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );

    expect(screen.queryByRole("link", { name: "掼蛋" })).not.toBeInTheDocument();
  });

  it("提供软路由入口，不再展示创作手记入口", () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "软路由" })).toHaveAttribute("href", "/router");
    expect(screen.queryByRole("link", { name: "创作手记" })).not.toBeInTheDocument();
  });
});
