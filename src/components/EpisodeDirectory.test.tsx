import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EpisodeDirectory } from "./EpisodeDirectory";
import type { Work } from "../types/work";

const episodes: Work[] = [
  {
    id: "protagonist-1",
    title: "主角1",
    category: "audio-story",
    bvid: "BV1P4Go6NEPf",
    cover: "/covers/protagonist.jpg",
    description: "第一集",
    series: "主角",
    episode: 1,
    featured: false,
    copyrightStatus: "unauthorized-reading"
  },
  {
    id: "protagonist-2",
    title: "主角2",
    category: "audio-story",
    bvid: "BV1W4Go6NEDs",
    cover: "/covers/protagonist.jpg",
    description: "第二集",
    series: "主角",
    episode: 2,
    featured: false,
    copyrightStatus: "unauthorized-reading"
  }
];

describe("分集目录", () => {
  it("可以按集数搜索并选择播放", async () => {
    const onPlay = vi.fn();
    render(<EpisodeDirectory episodes={episodes} onPlay={onPlay} />);
    await userEvent.type(screen.getByRole("searchbox"), "2");
    expect(screen.queryByText("主角1")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "播放 主角2" }));
    expect(onPlay).toHaveBeenCalledWith(episodes[1]);
  });
});
