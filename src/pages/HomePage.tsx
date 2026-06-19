import { ArrowRight, Play } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PlayerModal } from "../components/PlayerModal";
import { LearningMark } from "../components/LearningMark";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { audioStories, musicWorks } from "../data/works";
import { notes } from "../data/notes";
import type { Work } from "../types/work";

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
              这里收藏原创 AI 歌曲、声音叙事实验，以及从一句灵感走到成品的创作手记。
            </p>
            <div className="hero__actions">
              <Link className="button button--primary" to="/music">进入AI歌曲专题</Link>
              <a className="text-link" href="#about">认识实验室 <ArrowRight size={16} /></a>
            </div>
          </div>
          <button className="hero-feature" onClick={() => setActiveWork(featured)}>
            <img src="/covers/gui-zhen-featured.png" alt="" />
            <span className="hero-feature__veil" />
            <span className="hero-feature__content">
              <small>本期推荐 · 原创 AI 歌曲</small>
              <strong>《归真》</strong>
              <span><Play size={15} fill="currentColor" /> 立即播放 · 03:26</span>
            </span>
          </button>
        </section>

        <section className="section section--stories" id="stories">
          <div className="page-shell">
            <header className="section-heading section-heading--light">
              <div><p className="eyeline">AUDIO NARRATIVE</p><h2>AI 声音叙事实验</h2></div>
              <p>为耳朵重新安排文字的时间。</p>
            </header>
            <div className="story-grid">
              <Link className="story-panel" to="/series/protagonist">
                <img src="/covers/protagonist-editorial.png" alt="" />
                <span className="story-panel__shade" />
                <span className="story-panel__content">
                  <small>持续更新 · {audioStories.filter((work) => work.series === "主角").length} 集</small>
                  <strong>《主角》</strong>
                  <small>陈彦 · 第十届茅盾文学奖获奖小说</small>
                  <span>进入专题与分集目录 <ArrowRight size={17} /></span>
                </span>
              </Link>
              <Link className="story-panel" to="/series/destiny">
                <img src="/covers/destiny-editorial.png" alt="" />
                <span className="story-panel__shade" />
                <span className="story-panel__content">
                  <small>已完结 · {audioStories.filter((work) => work.series === "命运").length} 集</small>
                  <strong>《命运》</strong>
                  <span>进入专题与分集目录 <ArrowRight size={17} /></span>
                </span>
              </Link>
            </div>
            <p className="copyright-notice">
              风险提示：上述内容目前未获得原著信息网络传播授权。本站标注作者和免责声明不等于获得授权，
              权利人可通过页尾邮箱联系下架。
            </p>
          </div>
        </section>

        <section className="section page-shell" id="music">
          <header className="section-heading">
            <div><p className="eyeline">MUSIC WORKS</p><h2>音乐作品</h2></div>
          </header>
          <Link className="music-topic-panel" to="/music">
            <img src="/covers/gui-zhen-featured.png" alt="" />
            <span className="story-panel__shade" />
            <span className="story-panel__content">
              <small>持续更新 · {musicWorks.length} 首</small>
              <strong>《AI歌曲》</strong>
              <span>进入专题与作品目录 <ArrowRight size={17} /></span>
            </span>
          </Link>
        </section>

        <section className="learning-entry">
          <div className="page-shell learning-entry__inner">
            <LearningMark size={68} />
            <div>
              <p className="eyeline">AI LEARNING ARCHIVE</p>
              <h2>AI学习书房</h2>
            </div>
            <Link className="button button--ghost" to="/learning">
              进入学习专区 <ArrowRight size={16} />
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
