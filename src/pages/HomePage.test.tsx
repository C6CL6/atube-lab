import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HomePage } from "./HomePage";

describe("首页音乐专题入口", () => {
  it("展示 AI歌曲专题入口和喜欢的音乐作品", () => {
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
      .toHaveAttribute("src", "/covers/ai-songs-editorial.png");

    expect(screen.getByRole("heading", { name: "喜欢的音乐作品" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "【大头针 Official】全网最火的AI歌手 神仙翻唱" })
    ).toHaveAttribute(
      "href",
      "https://www.bilibili.com/video/BV1FPrqB6Ee7/?spm_id_from=333.337.search-card.all.click&vd_source=25380840c9c4c5700ec69c919588e7ce"
    );
    expect(screen.getByRole("link", { name: "美猴王" })).toHaveAttribute(
      "href",
      "https://www.bilibili.com/video/BV1tVsHznELh/?spm_id_from=333.337.search-card.all.click"
    );
    expect(screen.getByRole("link", { name: "美猴王" })).toHaveAttribute("target", "_blank");
  });
});
