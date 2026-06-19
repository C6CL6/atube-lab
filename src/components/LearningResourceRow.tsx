import { ArrowUpRight, Clock3 } from "lucide-react";
import { getBilibiliVideoUrl } from "../lib/bilibili";
import type { LearningResource } from "../data/resources";

export function LearningResourceRow({
  resource
}: {
  resource: LearningResource;
}) {
  const content = (
    <>
      <span className="learning-resource__category">{resource.category}</span>
      <span className="learning-resource__main">
        <strong>{resource.title}</strong>
        <small>{resource.summary}</small>
      </span>
      <span className="learning-resource__meta">
        {resource.duration ? (
          <span><Clock3 size={14} aria-hidden="true" /> {resource.duration}</span>
        ) : null}
        <span>{resource.level}</span>
      </span>
      <span className="learning-resource__action">
        {resource.status === "published" ? (
          <><span>前往B站</span><ArrowUpRight size={17} aria-hidden="true" /></>
        ) : (
          <span>待发布</span>
        )}
      </span>
    </>
  );

  if (resource.status === "published" && resource.bvid) {
    return (
      <a
        className="learning-resource"
        href={getBilibiliVideoUrl(resource.bvid)}
        target="_blank"
        rel="noreferrer"
        aria-label={`前往B站学习：${resource.title}`}
      >
        {content}
      </a>
    );
  }

  return <div className="learning-resource learning-resource--pending">{content}</div>;
}
