import { ExternalLink, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { getBilibiliEmbedUrl, getBilibiliVideoUrl } from "../lib/bilibili";
import type { Work } from "../types/work";

type PlayerModalProps = {
  work: Work;
  onClose: () => void;
};

export function PlayerModal({ work, onClose }: PlayerModalProps) {
  const bilibiliUrl = getBilibiliVideoUrl(work.bvid);
  const isAudioStory = work.category === "audio-story";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="player-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`播放《${work.title}》`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="player-modal__header">
          <div>
            <p className="eyeline">BILIBILI PLAYER</p>
            <h2>{work.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭播放器">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="player-frame">
          <iframe
            title={`在站内播放《${work.title}》`}
            src={getBilibiliEmbedUrl(work.bvid)}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <div className="player-modal__footer">
          <div className="player-modal__footer-copy">
            <p>若播放器因浏览器或B站限制无法加载，可直接前往原视频。</p>
          </div>
          <div className="player-modal__actions">
            {isAudioStory ? (
              <a
                className="button button--primary background-play-action"
                href={bilibiliUrl}
                target="_blank"
                rel="noreferrer"
              >
                前往 B站观看（可在 App 内开启后台播放）
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            ) : (
              <a
                className="text-link"
                href={bilibiliUrl}
                target="_blank"
                rel="noreferrer"
              >
                前往B站观看 <ExternalLink size={16} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
