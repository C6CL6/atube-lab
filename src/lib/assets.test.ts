import { describe, expect, it } from "vitest";
import { appRouteUrl, assetUrl } from "./assets";

describe("asset and route URLs", () => {
  it("keeps local root URLs unchanged", () => {
    expect(appRouteUrl("/sudoku?window=game", "/")).toBe("/sudoku?window=game");
    expect(assetUrl("/covers/gui-zhen-featured.png", "/")).toBe("/covers/gui-zhen-featured.png");
  });

  it("prefixes GitHub Pages project URLs", () => {
    expect(appRouteUrl("/sudoku?window=game", "/atube-lab/")).toBe("/atube-lab/sudoku?window=game");
    expect(assetUrl("/covers/gui-zhen-featured.png", "/atube-lab/")).toBe(
      "/atube-lab/covers/gui-zhen-featured.png",
    );
  });
});
