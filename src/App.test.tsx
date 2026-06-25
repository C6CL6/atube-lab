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
});
