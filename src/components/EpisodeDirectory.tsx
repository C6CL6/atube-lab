import { Play, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { Work } from "../types/work";

type EpisodeDirectoryProps = {
  episodes: Work[];
  onPlay: (work: Work) => void;
};

export function EpisodeDirectory({ episodes, onPlay }: EpisodeDirectoryProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const filteredEpisodes = useMemo(() => {
    if (!deferredQuery) return episodes;
    return episodes.filter(
      (episode) =>
        episode.title.includes(deferredQuery) ||
        String(episode.episode).includes(deferredQuery)
    );
  }, [deferredQuery, episodes]);

  return (
    <div className="episode-directory">
      <label className="episode-search">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">搜索分集</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="输入集数，例如 18"
        />
      </label>
      <p className="episode-count">显示 {filteredEpisodes.length} 集</p>
      <div className="episode-grid">
        {filteredEpisodes.map((episode) => (
          <button
            className="episode-row"
            key={episode.id}
            onClick={() => onPlay(episode)}
            aria-label={`播放 ${episode.title}`}
          >
            <span className="episode-number">
              {String(episode.episode).padStart(2, "0")}
            </span>
            <span>{episode.title}</span>
            <span className="episode-duration">{episode.duration}</span>
            <Play size={15} fill="currentColor" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
