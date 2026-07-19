import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HomePage } from "./HomePage";

describe("首页音乐专题入口", () => {
  it("展示原创 AI 歌曲专题入口和推荐 AI 歌曲", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /原创 AI 歌曲.*进入专题与作品目录/ })).toHaveAttribute(
      "href",
      "/music"
    );
    expect(screen.queryByRole("heading", { name: "外卖骑手" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "原创 AI 歌曲" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /原创 AI 歌曲.*进入专题与作品目录/ }).querySelector("img"))
      .toHaveAttribute("src", "/covers/ai-songs-editorial.png");

    expect(screen.getByRole("heading", { name: "推荐 AI 歌曲" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "【大头针】全网最火的AI歌手 神仙翻唱" })
    ).toHaveAttribute(
      "href",
      "https://www.bilibili.com/video/BV1FPrqB6Ee7/?spm_id_from=333.337.search-card.all.click&vd_source=25380840c9c4c5700ec69c919588e7ce"
    );
    expect(screen.getByRole("link", { name: "全网最火的AI歌曲 美猴王" })).toHaveAttribute(
      "href",
      "https://www.bilibili.com/video/BV1tVsHznELh/?spm_id_from=333.337.search-card.all.click"
    );
    expect(screen.getByRole("link", { name: "全网最火的AI歌曲 美猴王" })).toHaveAttribute(
      "target",
      "_blank"
    );
  });

  it("使用正式的茅盾文学奖名称", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getAllByText("陈彦 · 第十届茅盾文学奖获奖小说").length).toBeGreaterThan(0);
    expect(screen.queryByText(/矛盾文学奖/)).not.toBeInTheDocument();
  });

  it("首页显示《主角》150集已完整发布", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /《主角》/ })).toHaveTextContent("已完结 · 150 集完整发布");
  });

  it("首页提供数独游戏入口，并删除测验和贪吃蛇模块", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "数独挑战" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /进入数独游戏/ })).toHaveAttribute("href", "/sudoku");
    expect(screen.queryByRole("heading", { name: "性格测验中心" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /进入性格测试/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "贪吃蛇" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /进入贪吃蛇/ })).not.toBeInTheDocument();
  });

  it("首页提供 Mac OS 软路由详情入口", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Mac OS软路由" })).toBeInTheDocument();
    expect(screen.getByText("将 Mac 作为家庭网络的软路由管理终端，集中查看状态并控制既有运行时。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看软路由详情" })).toHaveAttribute("href", "/router");
  });

  it("不再展示创作手记模块", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.queryByRole("heading", { name: "创作手记" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "创作手记" })).not.toBeInTheDocument();
    expect(screen.queryByText(/创作手记/)).not.toBeInTheDocument();
  });

  it("不再展示AI学习模块", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.queryByRole("heading", { name: "AI 学习书房" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /进入学习专区/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/AI LEARNING ARCHIVE/)).not.toBeInTheDocument();
  });
});
