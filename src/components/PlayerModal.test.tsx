import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlayerModal } from "./PlayerModal";

describe("播放器弹窗", () => {
  it("音乐作品显示嵌入播放器和普通B站入口", async () => {
    const onClose = vi.fn();
    render(
      <PlayerModal
        work={{
          id: "gui-zhen",
          title: "归真",
          category: "music-experiment",
          bvid: "BV1bU6nBrEny",
          cover: "/covers/music.jpg",
          description: "AI音乐实验",
          featured: true,
          copyrightStatus: "adaptation"
        }}
        onClose={onClose}
      />
    );

    expect(screen.getByTitle("在站内播放《归真》")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "前往B站观看" })).toHaveAttribute(
      "href",
      "https://www.bilibili.com/video/BV1bU6nBrEny"
    );
    expect(
      screen.queryByRole("link", { name: "在 B站 App 后台播放" })
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "关闭播放器" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("有声小说显示当前集的B站App后台播放入口", () => {
    render(
      <PlayerModal
        work={{
          id: "protagonist-18",
          title: "主角18",
          category: "audio-story",
          bvid: "BV1Example18",
          cover: "/covers/protagonist.jpg",
          description: "主角第18集",
          series: "主角",
          episode: 18,
          featured: false,
          copyrightStatus: "unauthorized-reading"
        }}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.queryByText("进入 B站 App 后，请在播放器中开启后台播放。")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "前往 B站观看（可在 App 内开启后台播放）"
      })
    ).toHaveAttribute(
      "href",
      "https://www.bilibili.com/video/BV1Example18"
    );
    expect(
      screen.getByRole("link", {
        name: "前往 B站观看（可在 App 内开启后台播放）"
      })
    ).toHaveAttribute("target", "_blank");
  });
});
