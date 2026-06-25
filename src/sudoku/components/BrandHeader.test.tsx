import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrandHeader } from "./BrandHeader";

describe("数独内部顶部栏", () => {
  it("不重复显示官网品牌标识，但保留排行榜和玩家切换", () => {
    render(
      <BrandHeader
        user={{
          id: "u1",
          name: "本地测试",
          avatarColor: "#913f30",
          createdAt: "2026-06-25T00:00:00.000Z"
        }}
        onSwitchUser={vi.fn()}
        onShowRanking={vi.fn()}
      />
    );

    expect(document.querySelector(".brand-lockup")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "排行榜" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "切换玩家" })).toBeInTheDocument();
  });
});
