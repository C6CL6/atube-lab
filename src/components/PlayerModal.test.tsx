import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlayerModal } from "./PlayerModal";

describe("播放器弹窗", () => {
  it("显示嵌入播放器、B站备用入口并支持关闭", async () => {
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
    await userEvent.click(screen.getByRole("button", { name: "关闭播放器" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
