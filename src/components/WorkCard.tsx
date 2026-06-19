import { Play } from "lucide-react";
import type { Work } from "../types/work";

const labels = {
  "original-music": "原创 AI 歌曲",
  "music-experiment": "AI 音乐实验",
  "audio-story": "AI 声音叙事"
};

export function WorkCard({
  work,
  onPlay,
  size = "standard"
}: {
  work: Work;
  onPlay: (work: Work) => void;
  size?: "feature" | "standard";
}) {
  return (
    <article className={`work-card work-card--${size}`}>
      <button className="work-card__media" onClick={() => onPlay(work)}>
        <img src={work.cover} alt="" loading="lazy" />
        <span className="work-card__play">
          <Play size={18} fill="currentColor" aria-hidden="true" />
          站内播放
        </span>
      </button>
      <div className="work-card__body">
        <p className="eyeline">{labels[work.category]}</p>
        <h3>{work.title}</h3>
        <p>{work.description}</p>
        <div className="work-card__meta">
          <span>{work.duration}</span>
          {work.originalCredit ? <span>{work.originalCredit}</span> : null}
        </div>
      </div>
    </article>
  );
}
