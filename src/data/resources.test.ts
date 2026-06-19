import { describe, expect, it } from "vitest";
import { learningResources, validateLearningResources } from "./resources";

describe("AI学习资料清单", () => {
  it("资料只使用B站BV号，不引用本地媒体文件", () => {
    expect(validateLearningResources()).toEqual([]);
    expect(
      learningResources.every(
        (resource) =>
          resource.status === "coming-soon" ||
          (resource.bvid?.startsWith("BV") && !resource.bvid.includes("/"))
      )
    ).toBe(true);
  });
});
