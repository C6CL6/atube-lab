import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { PersonalityPage } from "./PersonalityPage";

function getTestCard(title: string) {
  const heading = screen.getByRole("heading", { level: 2, name: title });
  const card = heading.closest("article");
  expect(card).not.toBeNull();
  return within(card as HTMLElement);
}

describe("性格测试页面", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("可选择数独用户名并进入MBTI 人格倾向测试", async () => {
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

    expect(screen.getByRole("heading", { level: 1, name: "性格测验中心" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /阿土伯/ }));
    await user.click(getTestCard("MBTI 人格倾向测试").getByRole("button", { name: "开始" }));

    expect(screen.getByRole("heading", { level: 1, name: "MBTI 人格倾向测试" })).toBeInTheDocument();
    expect(screen.getByText(/第 1 \/ 60 题/)).toBeInTheDocument();
    expect(screen.getByText(/四组人格维度上的相对倾向/)).toBeInTheDocument();
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

  it("测验入口按钮只显示开始", () => {
    render(
      <MemoryRouter>
        <PersonalityPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("button", { name: "开始" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /开始 MBTI/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /开始 五型动物/ })).not.toBeInTheDocument();
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
    await user.click(getTestCard("MBTI 人格倾向测试").getByRole("button", { name: "开始" }));

    for (let index = 0; index < 60; index += 1) {
      await user.click(screen.getByRole("button", { name: "比较符合右侧" }));
    }

    expect(screen.getByRole("heading", { name: /测试用户的MBTI 人格倾向报告/ })).toBeInTheDocument();
    expect(screen.getByText(/结果仅供自我观察、创作设定与沟通参考/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "本机历史报告" })).toBeInTheDocument();
  }, 20000);

  it("可进入五型动物人格测验并生成报告", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PersonalityPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("用户名"), "测试用户");
    await user.click(screen.getByRole("button", { name: "创建并使用" }));
    await user.click(getTestCard("五型动物人格测验").getByRole("button", { name: "开始" }));

    expect(screen.getByText(/第 1 \/ 48 题/)).toBeInTheDocument();

    for (let index = 0; index < 48; index += 1) {
      await user.click(screen.getByRole("button", { name: "比较符合右侧" }));
    }

    expect(screen.getByRole("heading", { level: 1, name: "五型动物人格测验报告" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /测试用户的五型动物人格测验报告/ })).toBeInTheDocument();
    expect(screen.getAllByText(/五型动物/).length).toBeGreaterThan(0);
    expect(screen.getByText(/合作建议/)).toBeInTheDocument();
  }, 20000);
});
