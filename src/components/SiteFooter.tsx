import { ExternalLink } from "lucide-react";
import { BILIBILI_PROFILE_URL } from "../lib/bilibili";

export function SiteFooter() {
  return (
    <footer className="site-footer" id="about">
      <div>
        <h2>A-tube的灵感实验室</h2>
        <p>这是一个碳基人类对 AI 时代的观察学习手记。</p>
      </div>
      <div className="site-footer__links">
        <a href={BILIBILI_PROFILE_URL} target="_blank" rel="noreferrer">
          B站主页 <ExternalLink size={15} />
        </a>
      </div>
      <p className="site-footer__legal">
        本站不提供音视频下载。涉及第三方原著、音乐或视觉素材的权利归原权利人所有。
        免责声明不能替代著作权授权。
      </p>
    </footer>
  );
}
