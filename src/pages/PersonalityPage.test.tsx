import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { PersonalityPage } from "./PersonalityPage";

describe("性格测试页面", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("可选择数独用户名并进入16型人格倾向测试", async () => {
    localStorage.setItem("atube-sudoku-v1", JSON.stringify({
      version: 1,
      users: [{ id: "u-1", name: "阿土伯", avatarColor: "#913f30", createdAt: "2026-07-02T00:00:00.000Z" }],
      activeUserId: "u-1",
      games: {},
      records: [],
      lastDifficulty: "medium",
      lastBoardStyle: "decorative",
    }));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PersonalityPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "16型人格倾向测试" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /阿土伯/ }));
    await user.click(screen.getByRole("button", { name: "开始测试" }));

    expect(screen.getByText("第 1 / 60 题")).toBeInTheDocument();
    expect(screen.getByText(/参考 MBTI 常见四维框架和经典问卷的测量方向设计/)).toBeInTheDocument();
    expect(screen.getByText(/例如：/)).toBeInTheDocument();
  });

  it("测试说明不使用“原创”表述", () => {
    render(
      <MemoryRouter>
        <PersonalityPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/原创/)).not.toBeInTheDocument();
  });

  it("完成全部题目后显示报告和本机历史记录", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PersonalityPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("用户名"), "测试用户");
    await user.click(screen.getByRole("button", { name: "创建并使用" }));
    await user.click(screen.getByRole("button", { name: "开始测试" }));

    for (let index = 0; index < 60; index += 1) {
      await user.click(screen.getByRole("button", { name: "比较符合右侧" }));
    }

    expect(screen.getByRole("heading", { name: /测试用户的16型人格倾向报告/ })).toBeInTheDocument();
    expect(screen.getByText(/结果仅供自我观察、创作设定与沟通参考/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "本机历史报告" })).toBeInTheDocument();
  }, 20000);
});
