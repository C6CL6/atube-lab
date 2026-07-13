import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RouterPage } from "./RouterPage";

describe("Mac OS软路由页面", () => {
  it("提供已公证 macOS 安装包的下载和校验值", () => {
    render(
      <MemoryRouter>
        <RouterPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Mac OS软路由" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /下载 macOS 版/ })).toHaveLength(2);
    screen.getAllByRole("link", { name: /下载 macOS 版/ }).forEach((link) => {
      expect(link).toHaveAttribute("href", "/downloads/Mac-OS软路由.dmg");
    });
    expect(
      screen.getByText("c73338010ba9cbd1d0d3dd60c074365598fb61458a651c3ea0139cc66d4f81fd")
    ).toBeInTheDocument();
    expect(screen.getByText(/Apple 公证/)).toBeInTheDocument();
  });
});
