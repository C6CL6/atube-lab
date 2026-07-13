import { Activity, Download, Network, ShieldCheck } from "lucide-react";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

const checksum = "c73338010ba9cbd1d0d3dd60c074365598fb61458a651c3ea0139cc66d4f81fd";

export function RouterPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="router-hero">
          <div className="page-shell router-hero__inner">
            <div>
              <p className="eyeline">HOME NETWORK · MACOS</p>
              <h1>Mac OS软路由</h1>
              <p className="router-hero__intro">
                将一台 Mac 作为家庭网络的软路由管理终端，集中查看运行状态，并管理既有的网络转发运行时。
              </p>
              <a className="button button--primary" href="/downloads/Mac-OS软路由.dmg" download>
                <Download size={17} aria-hidden="true" /> 下载 macOS 版
              </a>
            </div>
            <div className="router-status" aria-label="软路由状态概览">
              <Network size={34} aria-hidden="true" />
              <strong>家庭网络管理</strong>
              <span>状态查看 · 启动与停止 · 自动启动</span>
            </div>
          </div>
        </section>

        <section className="section page-shell">
          <header className="section-heading">
            <div><p className="eyeline">ROUTER MANAGEMENT</p><h2>为现有网络运行时提供桌面管理</h2></div>
            <p>界面只负责清晰地呈现状态与操作入口，网络变更仍由 macOS 的管理员授权确认。</p>
          </header>
          <div className="router-feature-grid">
            <article>
              <Activity size={22} aria-hidden="true" />
              <h3>状态一目了然</h3>
              <p>查看软路由运行状态与已连接设备信息，快速判断服务是否就绪。</p>
            </article>
            <article>
              <Network size={22} aria-hidden="true" />
              <h3>管理既有运行时</h3>
              <p>围绕已有网络转发环境进行启动、停止和自动启动管理，不重写原有网络配置。</p>
            </article>
            <article>
              <ShieldCheck size={22} aria-hidden="true" />
              <h3>系统授权可见</h3>
              <p>涉及网络或启动项的变更会由 macOS 请求管理员授权，便于明确每次操作的边界。</p>
            </article>
          </div>
        </section>

        <section className="router-download">
          <div className="page-shell router-download__inner">
            <div>
              <p className="eyeline">MACOS DISTRIBUTION</p>
              <h2>下载与校验</h2>
              <p>适用于 macOS。安装包使用 Developer ID 签名，并已通过 Apple 公证。</p>
            </div>
            <div className="router-download__details">
              <a className="button button--primary" href="/downloads/Mac-OS软路由.dmg" download>
                <Download size={17} aria-hidden="true" /> 下载 macOS 版
              </a>
              <p><strong>SHA-256</strong><code>{checksum}</code></p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
