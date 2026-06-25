import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { EpisodeDirectory } from "../components/EpisodeDirectory";
import { PlayerModal } from "../components/PlayerModal";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { audioStories } from "../data/works";
import { getBilibiliVideoUrl } from "../lib/bilibili";
import type { Work } from "../types/work";

const seriesInfo = {
  protagonist: {
    name: "主角" as const,
    author: "陈彦",
    status: "持续更新",
    award: "第十届茅盾文学奖获奖小说",
    cover: "/covers/protagonist-editorial.png",
    summary: "从秦腔舞台与个人命运出发，观察一个普通人如何在时代、艺术与自我之间成为自己的主角。"
  },
  destiny: {
    name: "命运" as const,
    author: "蔡崇达",
    status: "已完结",
    award: "茅盾文学奖入围小说",
    cover: "/covers/destiny-editorial.png",
    summary: "沿着故乡、家族与生命经验展开，在声音中重访人与命运彼此塑造的路径。"
  }
};

export function SeriesPage() {
  const { slug } = useParams();
  const info = seriesInfo[slug as keyof typeof seriesInfo];
  const [activeWork, setActiveWork] = useState<Work | null>(null);
  const episodes = useMemo(
    () => audioStories.filter((work) => work.series === info?.name),
    [info?.name]
  );

  if (!info) return <Navigate to="/" replace />;
  const latest = episodes.at(-1)!;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="series-hero page-shell">
          <div className="series-hero__cover">
            <img src={info.cover} alt={`${info.name}专题封面`} />
          </div>
          <div className="series-hero__copy">
            <Link className="back-link" to="/#stories"><ArrowLeft size={16} /> 返回AI 有声小说</Link>
            <p className="eyeline">AI 有声小说 · {info.status}</p>
            <h1>《{info.name}》</h1>
            <p className="series-author">原著作者：{info.author}</p>
            {info.award ? <p className="series-award">{info.award}</p> : null}
            <p>{info.summary}</p>
            <div className="hero__actions">
              <button className="button button--primary" onClick={() => setActiveWork(episodes[0])}>
                <Play size={16} fill="currentColor" /> 从第一集开始
              </button>
              <button className="button button--ghost" onClick={() => setActiveWork(latest)}>
                播放最新一集
              </button>
            </div>
            <a className="text-link" href={getBilibiliVideoUrl(episodes[0].bvid)} target="_blank" rel="noreferrer">
              在B站打开 <ExternalLink size={15} />
            </a>
          </div>
        </section>

        <section className="legal-banner">
          <div className="page-shell">
            <strong>版权状态：本站所有内容仅供学习使用，请勿用于商业用途。</strong>
            <p>
              本专题仅说明现有 AI 声音实验并链接至B站，不提供下载。署名、非商业说明和下架渠道均不能替代授权。
            </p>
          </div>
        </section>

        <section className="section page-shell">
          <header className="section-heading">
            <div><p className="eyeline">EPISODE DIRECTORY</p><h2>完整分集目录</h2></div>
            <p>共 {episodes.length} 集，支持按集数搜索。</p>
          </header>
          <EpisodeDirectory episodes={episodes} onPlay={setActiveWork} />
        </section>
      </main>
      <SiteFooter />
      {activeWork ? <PlayerModal work={activeWork} onClose={() => setActiveWork(null)} /> : null}
    </>
  );
}
