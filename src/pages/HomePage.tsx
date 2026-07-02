import { ArrowRight, ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PlayerModal } from "../components/PlayerModal";
import { LearningMark } from "../components/LearningMark";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { audioStories, musicWorks } from "../data/works";
import { notes } from "../data/notes";
import { coverUrl } from "../lib/assets";
import type { Work } from "../types/work";

const favoriteMusicWorks = [
  {
    title: "【大头针】全网最火的AI歌手 神仙翻唱",
    url: "https://www.bilibili.com/video/BV1FPrqB6Ee7/?spm_id_from=333.337.search-card.all.click&vd_source=25380840c9c4c5700ec69c919588e7ce"
  },
  {
    title: "全网最火的AI歌曲 美猴王",
    url: "https://www.bilibili.com/video/BV1tVsHznELh/?spm_id_from=333.337.search-card.all.click"
  }
];

export function HomePage() {
  const [activeWork, setActiveWork] = useState<Work | null>(null);
  const featured = musicWorks.find((work) => work.id === "gui-zhen") ?? musicWorks[0];

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero page-shell">
          <div className="hero__copy">
            <p className="eyeline">SOUND · STORY · ARTIFICIAL INTELLIGENCE</p>
            <h1>让算法参与创作，<br />让作品保留人的判断。</h1>
            <p className="hero__intro">
              这里收藏原创 AI 歌曲、AI有声小说，以及从一句灵感走到成品的创作手记。
            </p>
            <div className="hero__actions">
              <Link className="button button--primary" to="/music">进入AI歌曲专题</Link>
              <a className="text-link" href="#about">认识实验室 <ArrowRight size={16} /></a>
            </div>
          </div>
          <button className="hero-feature" onClick={() => setActiveWork(featured)}>
            <img src={coverUrl("gui-zhen-featured.png")} alt="" />
            <span className="hero-feature__veil" />
            <span className="hero-feature__content">
              <small>本期推荐 · 原创 AI 歌曲</small>
              <strong>《归 真》</strong>
              <span><Play size={15} fill="currentColor" /> 立即播放 · 03:26</span>
            </span>
          </button>
        </section>

        <section className="section section--stories" id="stories">
          <div className="page-shell">
            <header className="section-heading section-heading--light">
              <div><p className="eyeline">AUDIO NARRATIVE</p><h2>AI 有声小说</h2></div>
              <p>为耳朵重新安排文字的时间。</p>
            </header>
            <div className="story-grid">
              <Link className="story-panel" to="/series/protagonist">
                <img src={coverUrl("protagonist-editorial.png")} alt="" />
                <span className="story-panel__shade" />
                <span className="story-panel__content">
                  <small>持续更新 · {audioStories.filter((work) => work.series === "主角").length} 集</small>
                  <strong>《主角》</strong>
                  <small>陈彦 · 第十届茅盾文学奖获奖小说</small>
                  <span>进入专题与分集目录 <ArrowRight size={17} /></span>
                </span>
              </Link>
              <Link className="story-panel" to="/series/destiny">
                <img src={coverUrl("destiny-editorial.png")} alt="" />
                <span className="story-panel__shade" />
                <span className="story-panel__content">
                  <small>已完结 · {audioStories.filter((work) => work.series === "命运").length} 集</small>
                  <strong>《命运》</strong>
                  <span>进入专题与分集目录 <ArrowRight size={17} /></span>
                </span>
              </Link>
            </div>
            <p className="copyright-notice">
              风险提示：本站所有内容仅供学习使用，请勿用于商业用途。
            </p>
          </div>
        </section>

        <section className="section page-shell" id="music">
          <header className="section-heading">
            <div><p className="eyeline">MUSIC WORKS</p><h2>AI 音乐作品</h2></div>
          </header>
          <div className="home-music-grid">
            <Link className="music-topic-panel" to="/music">
              <img src={coverUrl("ai-songs-editorial.png")} alt="" />
              <span className="story-panel__shade" />
              <span className="story-panel__content">
                <small>持续更新 · {musicWorks.length} 首</small>
                <strong>《原创 AI 歌曲》</strong>
                <span>进入专题与作品目录 <ArrowRight size={17} /></span>
              </span>
            </Link>
            <div className="favorite-music-panel">
              <p className="eyeline">FAVORITE MUSIC</p>
              <h3>推荐 AI 歌曲</h3>
              <div className="favorite-music-list">
                {favoriteMusicWorks.map((work) => (
                  <a key={work.url} href={work.url} target="_blank" rel="noreferrer">
                    <span>{work.title}</span>
                    <ExternalLink size={17} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="learning-entry">
          <div className="page-shell learning-entry__inner">
            <LearningMark size={68} />
            <div>
              <p className="eyeline">AI LEARNING ARCHIVE</p>
              <h2>AI 学习书房</h2>
            </div>
            <Link className="button button--ghost" to="/learning">
              进入学习专区 <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="personality-entry">
          <div className="page-shell personality-entry__inner">
            <div>
              <p className="eyeline">PERSONALITY LAB</p>
              <h2>16型人格倾向测试</h2>
              <p>
                60道中文题，参考四维人格框架观察能量来源、信息处理、决策方式和生活节奏。
              </p>
            </div>
            <Link className="button button--primary" to="/personality">
              进入性格测试 <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="sudoku-entry">
          <div className="page-shell sudoku-entry__inner">
            <div>
              <p className="eyeline">BRAIN GAME</p>
              <h2>数独挑战</h2>
              <p>
                为大屏、手机和平板优化的数独小游戏：大字棋盘、本机排行榜，也可以打开独立游戏窗口。
              </p>
            </div>
            <Link className="button button--primary" to="/sudoku">
              进入数独游戏 <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="snake-entry">
          <div className="page-shell snake-entry__inner">
            <div>
              <p className="eyeline">ARCADE GAME</p>
              <h2>贪吃蛇</h2>
              <p>
                从桌面版移植到网页的经典小游戏：键盘控制、速度递进、浏览器本机最高分。
              </p>
            </div>
            <Link className="button button--ghost" to="/snake">
              进入贪吃蛇 <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="section section--notes" id="notes">
          <div className="page-shell notes-layout">
            <div className="notes-intro">
              <p className="eyeline">CREATIVE NOTES</p>
              <h2>创作手记</h2>
            </div>
            <div className="notes-list">
              {notes.map((note) => (
                <Link key={note.slug} to={`/notes/${note.slug}`} className="note-row">
                  <span>{note.number}</span>
                  <strong>{note.title}</strong>
                  <ArrowRight size={18} />
                </Link>
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
