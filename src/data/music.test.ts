import { describe, expect, it } from "vitest";
import { musicWorks, validateMusicWorks } from "./music";

describe("音乐作品清单", () => {
  it("收录原创歌曲，并为 IP 主题原创歌曲保留衍生说明", () => {
    expect(musicWorks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "外卖骑手",
          bvid: "BV1iW6UBaEBo",
          category: "original-music",
          copyrightStatus: "original"
        }),
        expect.objectContaining({
          bvid: "BV19g6bBzE6a",
          category: "original-music",
          copyrightStatus: "adaptation"
        }),
        expect.objectContaining({
          bvid: "BV1y86bBdERo",
          category: "original-music",
          copyrightStatus: "adaptation"
        }),
        expect.objectContaining({
          bvid: "BV1bU6nBrEny",
          category: "original-music",
          copyrightStatus: "adaptation"
        })
      ])
    );
  });

  it("使用本地 PNG 封面且不存在重复 BV 号", () => {
    expect(musicWorks.every((work) => /^\/covers\/.+\.png$/.test(work.cover))).toBe(true);
    expect(validateMusicWorks()).toEqual([]);
  });

  it("让我们一起摇摆使用从 B 站原视频保存的封面", () => {
    expect(musicWorks.find((work) => work.id === "lets-rock")?.cover).toBe(
      "/covers/lets-rock-bilibili.png"
    );
  });

  it("以新发布的《碎碎念》替换马年拜年歌", () => {
    expect(musicWorks.find((work) => work.id === "sui-sui-nian")).toEqual(
      expect.objectContaining({
        title: "碎碎念",
        bvid: "BV1cjjE6AEqD",
        cover: "/covers/碎碎念.png"
      })
    );
    expect(musicWorks.some((work) => work.title === "马年拜年歌")).toBe(false);
  });

  it("《归真》使用黑神话封面", () => {
    expect(musicWorks.find((work) => work.id === "gui-zhen")?.cover).toBe(
      "/covers/黑神话.png"
    );
  });
});
