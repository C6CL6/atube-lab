import type { Work } from "../types/work";

/**
 * 音乐作品只需在此数组追加一项即可更新网站。
 * 封面统一放入 public/covers，并使用 PNG，避免移动端 SVG 兼容差异。
 */
export const musicWorks: Work[] = [
  {
    id: "delivery-rider",
    title: "外卖骑手",
    category: "original-music",
    bvid: "BV1iW6UBaEBo",
    cover: "/covers/delivery-rider-bilibili.png",
    description: "写给穿行城市街巷的外卖骑手，也写给那些在时间与生活之间赶路的人。",
    duration: "03:58",
    featured: true,
    copyrightStatus: "original"
  },
  {
    id: "sui-sui-nian",
    title: "碎碎念",
    category: "original-music",
    bvid: "BV1cjjE6AEqD",
    cover: "/covers/碎碎念.png",
    description: "A-tube的灵感实验室新发布的 AI 音乐作品。",
    featured: true,
    copyrightStatus: "original"
  },
  {
    id: "gui-zhen",
    title: "归真",
    category: "original-music",
    bvid: "BV1bU6nBrEny",
    cover: "/covers/黑神话.png",
    description: "以厚重工业摇滚表达《黑神话》语境中的反抗、选择与归真。",
    duration: "03:26",
    featured: true,
    originalCredit: "原创歌词；《黑神话：悟空》主题衍生实验",
    copyrightStatus: "adaptation"
  },
  {
    id: "tyrion",
    title: "提利昂·兰尼斯特｜把羞辱锻造成武器",
    category: "original-music",
    bvid: "BV19g6bBzE6a",
    cover: "/covers/tyrion-bilibili.png",
    description: "以摇滚布鲁斯回应提利昂的机智、偏见处境与生存意志。",
    duration: "03:21",
    featured: false,
    originalCredit: "《权力的游戏》人物主题 IP 衍生音乐实验",
    copyrightStatus: "adaptation"
  },
  {
    id: "jaime",
    title: "詹姆·兰尼斯特｜荣誉与爱情之间",
    category: "original-music",
    bvid: "BV1y86bBdERo",
    cover: "/covers/jaime-bilibili.png",
    description: "以人物音乐短片表现詹姆在荣誉、爱情与自我救赎之间的撕扯。",
    duration: "03:51",
    featured: false,
    originalCredit: "《权力的游戏》人物主题 IP 衍生音乐实验",
    copyrightStatus: "adaptation"
  },
  {
    id: "lets-rock",
    title: "让我们一起摇摆｜AI翻唱实验",
    category: "music-experiment",
    bvid: "BV1YeZNBmEjz",
    cover: "/covers/lets-rock-bilibili.png",
    description: "测试 AI 声音在既有音乐作品中的表现力，不归入原创歌曲。",
    duration: "03:29",
    featured: false,
    originalCredit: "原唱及词曲权利归原权利人所有",
    copyrightStatus: "adaptation"
  }
];

export function validateMusicWorks() {
  const errors: string[] = [];
  const bvids = new Set<string>();

  for (const work of musicWorks) {
    if (bvids.has(work.bvid)) errors.push(`重复BV号：${work.bvid}`);
    bvids.add(work.bvid);

    if (!/^\/covers\/.+\.png$/.test(work.cover)) {
      errors.push(`音乐封面必须使用本地PNG：${work.title}`);
    }
    if (
      work.category === "original-music" &&
      work.copyrightStatus === "adaptation" &&
      !work.originalCredit
    ) {
      errors.push(`IP衍生原创歌曲必须标注原作关系：${work.title}`);
    }
    if (work.category === "music-experiment" && work.copyrightStatus === "original") {
      errors.push(`音乐实验版权属性错误：${work.title}`);
    }
  }

  return errors;
}
