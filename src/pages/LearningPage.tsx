import { ExternalLink } from "lucide-react";
import { LearningMark } from "../components/LearningMark";
import { LearningResourceRow } from "../components/LearningResourceRow";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { learningResources } from "../data/resources";
import { BILIBILI_PROFILE_URL } from "../lib/bilibili";

export function LearningPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="learning-hero page-shell">
          <div className="learning-hero__copy">
            <LearningMark size={72} />
            <p className="eyeline">AI LEARNING ARCHIVE</p>
            <h1>AI 学习书房</h1>
            <p>
              收藏值得反复观看的AI学习内容，也记录从工具尝试到实际作品的制作经验。
              所有视频统一发布在B站，本站只负责整理与导航。
            </p>
          </div>
          <div className="learning-hero__symbol" aria-hidden="true">
            <LearningMark size={180} />
            <span>READ · TEST · CREATE</span>
          </div>
        </section>

        <section className="learning-index">
          <div className="page-shell">
            <header className="section-heading">
              <div>
                <p className="eyeline">LEARNING INDEX</p>
                <h2>学习资料目录</h2>
              </div>
            </header>
            <div className="learning-resource-list">
              {learningResources.map((resource) => (
                <LearningResourceRow key={resource.id} resource={resource} />
              ))}
            </div>
            <div className="learning-bilibili">
              <LearningMark size={48} />
              <div>
                <strong>更多学习内容将持续更新</strong>
                <p>视频发布到B站后，只需在资料清单中补充BV号即可自动启用链接。</p>
              </div>
              <a
                className="text-link"
                href={BILIBILI_PROFILE_URL}
                target="_blank"
                rel="noreferrer"
              >
                访问B站主页 <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
