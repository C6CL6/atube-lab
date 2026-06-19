export type Note = {
  slug: string;
  number: string;
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
};

export const notes: Note[] = [
  {
    slug: "human-judgement",
    number: "01",
    title: "AI 在一首歌里做什么，人又必须判断什么",
    summary: "工具可以给出很多答案，创作者的工作是知道哪一个值得留下。",
    sections: [
      {
        heading: "先提出一个有张力的问题",
        body: "比起罗列风格词，我更在意作品究竟要回答什么。问题清楚以后，AI 才不是随机灵感发生器，而是可以被检验的创作伙伴。"
      },
      {
        heading: "判断不能外包",
        body: "旋律是否俗套、歌词是否空泛、情绪是否过量，这些都需要人来删改。生成只是开始，选择、重写与克制才构成作品。"
      }
    ]
  },
  {
    slug: "longform-audio",
    number: "02",
    title: "把长篇文本变成声音：节奏、断句与一致性",
    summary: "声音叙事不是把文字念出来，而是重新安排听觉中的时间。",
    sections: [
      {
        heading: "为耳朵重新分段",
        body: "书面段落并不总适合听觉。制作时需要重新检查停顿、重音、人物关系和章节之间的呼吸感。"
      },
      {
        heading: "稳定比炫技重要",
        body: "长篇内容最怕音色、响度和节奏漂移。建立固定检查表，比单集偶尔惊艳更重要。"
      }
    ]
  },
  {
    slug: "workflow",
    number: "03",
    title: "我的 AI 创作工作流：从一句话到可发布作品",
    summary: "把灵感拆成可检查的步骤，让每次生成都留下经验。",
    sections: [
      {
        heading: "四个阶段",
        body: "定义主题、生成候选、人工编辑、发布复盘。每一阶段只解决一类问题，避免在一次提示中同时要求所有结果。"
      },
      {
        heading: "保留版本与理由",
        body: "不仅保存最后成品，也记录为什么放弃其他版本。长期看，判断记录比某个提示词更有价值。"
      }
    ]
  }
];
