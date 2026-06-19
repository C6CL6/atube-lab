import { describe, expect, it } from "vitest";
import { getBilibiliEmbedUrl, getBilibiliVideoUrl } from "./bilibili";

describe("B站链接", () => {
  it("生成可嵌入播放器与原视频链接", () => {
    expect(getBilibiliEmbedUrl("BV1bU6nBrEny")).toContain("bvid=BV1bU6nBrEny");
    expect(getBilibiliVideoUrl("BV1bU6nBrEny")).toBe(
      "https://www.bilibili.com/video/BV1bU6nBrEny"
    );
  });
});
