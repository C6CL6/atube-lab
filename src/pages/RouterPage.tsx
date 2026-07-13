import { Activity, Download, Network, Power, Settings2, ShieldCheck, Wifi } from "lucide-react";
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
                将已连接 VPN 的 Mac 变成家庭网络网关。手机、Apple TV 等设备将网关设为这台 Mac 的局域网 IP，便可共享其 VPN 网络连接。
              </p>
              <a className="button button--primary" href="/downloads/Mac-OS软路由.dmg" download>
                <Download size={17} aria-hidden="true" /> 下载 macOS 版
              </a>
            </div>
            <div className="router-status" aria-label="软路由状态概览">
              <Network size={34} aria-hidden="true" />
              <strong>一台 Mac，服务全家设备</strong>
              <span>Mac 接入 VPN · 软路由转发 · 局域网设备共享</span>
            </div>
          </div>
        </section>

        <section className="section page-shell">
          <header className="section-heading">
            <div><p className="eyeline">HOME VPN GATEWAY</p><h2>让 VPN 网络连接覆盖家中设备</h2></div>
            <p>无需在每台设备上重复配置。Mac 负责连接 VPN 与网络转发，其余设备只需使用 Mac 作为网关。</p>
          </header>
          <div className="router-feature-grid">
            <article>
              <Wifi size={22} aria-hidden="true" />
              <h3>Mac 先接入 VPN</h3>
              <p>先在 Mac 上建立 VPN 连接，确认本机网络正常后，再由软路由共享给同一局域网中的设备。</p>
            </article>
            <article>
              <Network size={22} aria-hidden="true" />
              <h3>局域网设备共享</h3>
              <p>手机、平板、Apple TV 等设备将默认网关指向 Mac，即可通过 Mac 的 VPN 网络连接访问网络。</p>
            </article>
            <article>
              <ShieldCheck size={22} aria-hidden="true" />
              <h3>授权与状态可见</h3>
              <p>在授权页查看试用状态，在状态页启动或停止软路由；涉及系统网络变更时由 macOS 明确请求授权。</p>
            </article>
          </div>
        </section>

        <section className="router-setup">
          <div className="page-shell">
            <header className="section-heading">
              <div><p className="eyeline">QUICK START</p><h2>四步完成家庭网络共享</h2></div>
              <p>示例地址仅用于说明。请在 Mac 的网络设置中查看并填写自己的局域网 IP。</p>
            </header>
            <ol className="router-setup__steps">
              <li>
                <Wifi size={21} aria-hidden="true" />
                <div><strong>先连接 VPN</strong><p>在 Mac 上先连接 VPN，确认这台 Mac 本身可以正常访问网络。</p></div>
              </li>
              <li>
                <ShieldCheck size={21} aria-hidden="true" />
                <div><strong>确认授权状态</strong><p>打开 <b>Mac OS软路由</b>，进入 <b>授权</b> 页，确认 15 天试用状态正常。</p></div>
              </li>
              <li>
                <Power size={21} aria-hidden="true" />
                <div><strong>启动软路由</strong><p>进入 <b>状态</b> 页，点击 <b>启动软路由</b>，等待服务显示为运行中。</p></div>
              </li>
              <li>
                <Settings2 size={21} aria-hidden="true" />
                <div>
                  <strong>配置手机或 Apple TV</strong>
                  <p>将网关设为这台 Mac 的局域网 IP，例如 <code>192.168.2.66（示例）</code>；DNS 建议填写 <code>8.8.8.8 / 1.1.1.1</code>。</p>
                </div>
              </li>
            </ol>
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
              <p className="router-download__support">
                <strong>测试期间免费使用</strong>
                <span>使用中如有任何问题，请联系作者 <a href="mailto:zhenlu139@gmail.com">zhenlu139@gmail.com</a>。</span>
              </p>
              <p><strong>SHA-256</strong><code>{checksum}</code></p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
