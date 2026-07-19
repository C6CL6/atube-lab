import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RouterPage } from "./RouterPage";

describe("Mac OS软路由页面", () => {
  it("提供已公证 macOS 安装包的下载和校验值", () => {
    render(
      <MemoryRouter>
        <RouterPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Mac OS软路由" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /下载 macOS 版/ })).toHaveLength(2);
    screen.getAllByRole("link", { name: /下载 macOS 版/ }).forEach((link) => {
      expect(link).toHaveAttribute("href", "/downloads/Mac-OS软路由.dmg");
    });
    expect(
      screen.getByText("3b7a4638c58a91782f7e8c6ca3be915a95d4adeb565471885814041089e10431")
    ).toBeInTheDocument();
    expect(screen.getByText(/Apple 公证/)).toBeInTheDocument();
  });

  it("说明将 Mac 的 VPN 连接共享给家庭设备的使用步骤", () => {
    render(
      <MemoryRouter>
        <RouterPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/共享其 VPN 网络连接/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "四步完成家庭网络共享" })).toBeInTheDocument();
    expect(screen.getAllByText("启动软路由")).toHaveLength(2);
    expect(screen.getByText("192.168.2.66（示例）")).toBeInTheDocument();
    expect(screen.getByText("8.8.8.8 / 1.1.1.1")).toBeInTheDocument();
    expect(screen.getByText("v1.1.0 手动收费版")).toBeInTheDocument();
    expect(screen.getByText(/免费试用 15 天/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "zhenlu139@gmail.com" })).toHaveAttribute("href", "mailto:zhenlu139@gmail.com");
  });

  it("展示软路由的仪表盘、拓扑图、设备与操作界面", () => {
    render(
      <MemoryRouter>
        <RouterPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "看看它如何管理家庭网络" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "放大查看：Mac OS软路由仪表盘与运行状态" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "放大查看：Mac OS软路由网络拓扑图" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "放大查看：Mac OS软路由设备管理列表" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "放大查看：Mac OS软路由启动与自动启动控制" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "放大查看：Mac OS软路由仪表盘与运行状态" }));
    expect(screen.getByRole("dialog", { name: "Mac OS软路由仪表盘与运行状态预览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭预览" })).toBeInTheDocument();
  });
});
