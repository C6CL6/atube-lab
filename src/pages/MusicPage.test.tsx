import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MusicPage } from "./MusicPage";

describe("AI歌曲专题页", () => {
  it("按原创歌曲和音乐实验展示完整作品目录", () => {
    render(
      <MemoryRouter>
        <MusicPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "AI歌曲" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "原创 AI 歌曲" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI 音乐实验" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "外卖骑手" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "归真" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "提利昂·兰尼斯特｜把羞辱锻造成武器" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "詹姆·兰尼斯特｜荣誉与爱情之间" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "站内播放" })).toHaveLength(6);
    expect(screen.getByAltText("《归真》水墨山水专题封面")).toHaveAttribute(
      "src",
      "/covers/gui-zhen-featured.png"
    );
  });
});
