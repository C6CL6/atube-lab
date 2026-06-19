import { describe, expect, it } from "vitest";
import { audioStories, musicWorks, validateWorks } from "./works";

describe("作品清单", () => {
  it("区分原创音乐、音乐实验与未授权声音叙事", () => {
    expect(musicWorks.some((work) => work.category === "original-music")).toBe(true);
    expect(musicWorks.some((work) => work.category === "music-experiment")).toBe(true);
    expect(audioStories.every((work) => work.copyrightStatus === "unauthorized-reading")).toBe(true);
  });

  it("BV号不重复且声音叙事分集按序排列", () => {
    expect(validateWorks()).toEqual([]);
    for (const series of ["主角", "命运"] as const) {
      const episodes = audioStories
        .filter((work) => work.series === series)
        .map((work) => work.episode);
      expect(episodes).toEqual([...episodes].sort((a, b) => (a ?? 0) - (b ?? 0)));
    }
  });
});
