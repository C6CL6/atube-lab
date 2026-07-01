import { describe, expect, it } from "vitest";
import { getSnakeCloudRecordsEndpoint } from "./cloudRecords";

describe("贪吃蛇在线排行榜接口", () => {
  it("GitHub Pages 和本机都指向生产 Cloudflare API", () => {
    expect(getSnakeCloudRecordsEndpoint("localhost")).toBe("https://atube.ccwu.cc/api/snake/records");
    expect(getSnakeCloudRecordsEndpoint("c6cl6.github.io")).toBe("https://atube.ccwu.cc/api/snake/records");
  });

  it("正式自定义域名使用同源 API", () => {
    expect(getSnakeCloudRecordsEndpoint("atube.ccwu.cc")).toBe("/api/snake/records");
  });
});
