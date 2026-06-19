export type LearningResource = {
  id: string;
  title: string;
  summary: string;
  category: "AI基础认知" | "AI创作方法" | "AI视频案例" | "工具与工作流";
  level: "入门" | "进阶" | "案例";
  duration?: string;
  bvid?: string;
  status: "published" | "coming-soon";
};

export const learningResources: LearningResource[] = [
  {
    id: "election-machine",
    title: "选举机器：反向拆解政治竞选",
    summary: "从结构、叙事与视觉表达三个角度，复盘一段AI辅助视频的创作过程。",
    category: "AI视频案例",
    level: "案例",
    duration: "08:49",
    status: "coming-soon"
  },
  {
    id: "geopolitical-dialogue",
    title: "国际热点内容的AI视频表达",
    summary: "观察长视频如何组织素材、控制节奏，并把复杂议题转化为清晰叙事。",
    category: "AI视频案例",
    level: "案例",
    duration: "51:56",
    status: "coming-soon"
  }
];

export function validateLearningResources() {
  const errors: string[] = [];
  for (const resource of learningResources) {
    if (!resource.title || !resource.category || !resource.summary) {
      errors.push(`资料信息不完整：${resource.id}`);
    }
    if (resource.status === "published" && !resource.bvid?.startsWith("BV")) {
      errors.push(`已发布资料缺少有效BV号：${resource.id}`);
    }
  }
  return errors;
}
