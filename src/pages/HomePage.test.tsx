import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HomePage } from "./HomePage";

describe("首页音乐专题入口", () => {
  it("只展示 AI歌曲专题入口，不在首页罗列歌曲目录", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /AI歌曲.*进入专题与作品目录/ })).toHaveAttribute(
      "href",
      "/music"
    );
    expect(screen.queryByRole("heading", { name: "外卖骑手" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "原创 AI 歌曲" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /AI歌曲.*进入专题与作品目录/ }).querySelector("img"))
      .toHaveAttribute("src", "/covers/gui-zhen-featured.png");
  });
});
