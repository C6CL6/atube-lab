import { ArrowLeft, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PlayerModal } from "../components/PlayerModal";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { WorkCard } from "../components/WorkCard";
import { musicWorks } from "../data/music";
import type { Work } from "../types/work";

const bilibiliWorksUrl = "https://space.bilibili.com/586333146/lists/7404619?type=season";

export function MusicPage() {
  const [activeWork, setActiveWork] = useState<Work | null>(null);
  const originalMusic = musicWorks.filter((work) => work.category === "original-music");
  const experiments = musicWorks.filter((work) => work.category === "music-experiment");

  return (
    <>
      <SiteHeader />
      <main>
        <section className="music-hero page-shell">
          <div className="music-hero__cover">
            <img src="/covers/gui-zhen-featured.png" alt="《归真》水墨山水专题封面" />
          </div>
          <div className="music-hero__copy">
            <Link className="back-link" to="/#music"><ArrowLeft size={16} /> 返回首页</Link>
            <p className="eyeline">AI MUSIC COLLECTION</p>
            <h1>AI歌曲</h1>
            <p>
              收录原创 AI 歌曲、人物主题音乐短片与声音改编实验。原创和衍生作品分区陈列，
              保持创作边界清楚。
            </p>
            <a className="text-link" href={bilibiliWorksUrl} target="_blank" rel="noreferrer">
              在B站查看AI音乐合集 <ExternalLink size={15} />
            </a>
          </div>
        </section>

        <section className="section section--music-directory">
          <div className="page-shell">
            <header className="section-heading">
              <div><p className="eyeline">ORIGINAL MUSIC</p><h2>原创 AI 歌曲</h2></div>
              <p>词曲、主题与表达由实验室主导，AI 参与声音制作。</p>
            </header>
            <div className="music-directory-grid">
              {originalMusic.map((work) => (
                <WorkCard key={work.id} work={work} onPlay={setActiveWork} />
              ))}
            </div>
          </div>
        </section>

        <section className="section section--music-experiments">
          <div className="page-shell">
            <header className="section-heading">
              <div><p className="eyeline">MUSIC EXPERIMENTS</p><h2>AI 音乐实验</h2></div>
              <p>翻唱、人物主题与 IP 衍生实验均明确标注原作关系。</p>
            </header>
            <div className="music-directory-grid">
              {experiments.map((work) => (
                <WorkCard key={work.id} work={work} onPlay={setActiveWork} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      {activeWork ? <PlayerModal work={activeWork} onClose={() => setActiveWork(null)} /> : null}
    </>
  );
}
