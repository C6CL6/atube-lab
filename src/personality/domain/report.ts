import type {
  AnswerMap,
  DiscDimension,
  DiscDimensionScore,
  DiscScoreResult,
  MbtiScoreResult,
  PersonalityReport,
  PersonalityUser,
  ReportSection,
} from "./types";

const TYPE_SUMMARIES: Record<string, string> = {
  INTJ: "擅长把复杂局面整理成长期策略，重视独立判断和系统效率。",
  INTP: "喜欢拆解概念和模型，适合在开放问题中寻找底层逻辑。",
  ENTJ: "目标感强，善于组织资源推动结果，但要留意沟通温度。",
  ENTP: "反应快、点子多，擅长突破旧框架，也需要适度收敛。",
  INFJ: "重视意义和长期影响，适合把洞察转化为温和但坚定的行动。",
  INFP: "价值感强，富有想象力，适合表达内在体验和人物动机。",
  ENFJ: "善于调动群体能量，能把人的状态和组织目标连接起来。",
  ENFP: "热情开放，擅长发现可能性，也需要给灵感安排落地节奏。",
  ISTJ: "可靠、细致、守信用，适合处理需要秩序和责任边界的工作。",
  ISFJ: "稳定体贴，重视承诺和细节，容易成为团队里的支撑力量。",
  ESTJ: "讲效率、重执行，适合把混乱任务拆成清楚流程。",
  ESFJ: "重视合作秩序和他人感受，善于维护关系与现场稳定。",
  ISTP: "冷静务实，擅长在真实问题中快速定位关键机制。",
  ISFP: "感受细腻，重视真实体验和审美判断，适合具体而有温度的表达。",
  ESTP: "行动快、现场感强，适合在变化环境里迅速试错。",
  ESFP: "亲和、有感染力，善于把抽象想法转成可感知的体验。",
};

function section(title: string, body: string): ReportSection {
  return { title, body };
}

export function buildPersonalityReport(user: PersonalityUser, scores: MbtiScoreResult, answers: AnswerMap): PersonalityReport {
  const summary = TYPE_SUMMARIES[scores.typeCode] ?? "你的结果显示出混合型倾向，适合结合具体场景继续观察。";
  return {
    id: crypto.randomUUID(),
    testType: "sixteen-types",
    userId: user.id,
    username: user.name,
    typeCode: scores.typeCode,
    createdAt: new Date().toISOString(),
    scores: scores.dimensions,
    answers,
    sections: [
      section("核心画像", summary),
      section("工作与职业建议", "优先选择能稳定使用你优势的环境：既有清楚目标，也允许你按自己的方式建立节奏。遇到与结果相反的反馈时，先看是哪一组维度被过度使用。"),
      section("沟通建议", "不要把自己的默认沟通方式当成所有人的默认值。外向者要给对方留思考空间，内向者要更早释放中间判断；偏理性者补充关切，偏感受者补充边界。"),
      section("可能盲点", "人格倾向不是能力上限。越清晰的偏好，越可能在压力下变成单一路径。建议定期练习相反维度：例如计划型练习弹性，探索型练习收敛。"),
    ],
  };
}

const ANIMAL_STYLE_SUMMARIES: Record<DiscDimension, string> = {
  D: "目标驱动、判断直接，适合在复杂局面里推动收敛和行动。",
  I: "表达活跃、善于连接，适合把想法转成容易被理解和传播的语言。",
  S: "稳定耐心、重视配合，适合维护长期协作和节奏连续性。",
  C: "谨慎细致、重视依据，适合处理质量、规则、风控和复杂信息校验。",
};

function topDiscDimension(scores: Record<DiscDimension, DiscDimensionScore>): DiscDimension {
  return (Object.entries(scores) as [DiscDimension, DiscDimensionScore][])
    .sort((left, right) => right[1].percent - left[1].percent)[0][0];
}

export function buildDiscReport(user: PersonalityUser, scores: DiscScoreResult, answers: AnswerMap): PersonalityReport {
  const primary = topDiscDimension(scores.dimensions);
  const summary = scores.typeCode === "MIX"
    ? "你的五型动物结果呈现混合型倾向，说明不同场景会调动不同风格，建议结合工作、家庭和创作场景分别观察。"
    : `${ANIMAL_STYLE_SUMMARIES[primary]}你的复合代码为 ${scores.typeCode}，可重点观察前两项风格如何共同影响沟通方式。`;

  return {
    id: crypto.randomUUID(),
    testType: "disc",
    userId: user.id,
    username: user.name,
    typeCode: scores.typeCode,
    createdAt: new Date().toISOString(),
    scores: scores.dimensions,
    answers,
    sections: [
      section("核心画像", summary),
      section("工作与职业建议", "把高分维度用在合适位置：D适合推进，I适合动员，S适合稳定协作，C适合质量和风险控制。不要把单一风格用到所有场景。"),
      section("沟通建议", "和D沟通讲目标与取舍，和I沟通讲画面与参与，和S沟通讲节奏与照应，和C沟通讲依据与边界。先识别对方风格，再调整表达入口。"),
      section("合作建议", "团队里最好让四类风格互相补位：D负责突破，I负责连接，S负责承接，C负责校验。个人报告只提示倾向，不代表能力上限。"),
      section("可能盲点", "高D可能过快压缩讨论，高I可能发散过多，高S可能延迟表达不同意见，高C可能因追求准确而放慢推进。建议在压力场景下尤其留意。"),
    ],
  };
}

function isDiscScores(scores: PersonalityReport["scores"]): scores is Record<DiscDimension, DiscDimensionScore> {
  return "D" in scores && "percent" in scores.D;
}

export function formatReportText(report: PersonalityReport) {
  const dimensions = isDiscScores(report.scores)
    ? Object.entries(report.scores)
      .map(([dimension, score]) => `${dimension}: ${score.percent}% (${score.note})`)
      .join("\n")
    : Object.entries(report.scores)
      .map(([dimension, score]) => `${dimension}: ${score.winner} (${score.note})`)
      .join("\n");
  const sections = report.sections.map((item) => `【${item.title}】\n${item.body}`).join("\n\n");
  const title = report.testType === "disc" ? "五型动物人格测验报告" : "MBTI 人格倾向报告";
  return `${report.username}的${title}\n结果：${report.typeCode}\n日期：${new Date(report.createdAt).toLocaleString("zh-CN")}\n\n${dimensions}\n\n${sections}\n\n声明：结果仅供自我观察、创作设定与沟通参考，不用于招聘、医疗、心理诊断或重大决策。`;
}
