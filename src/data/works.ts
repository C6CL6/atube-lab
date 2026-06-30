import type { Work } from "../types/work";
import { formatDuration } from "../lib/bilibili";
import { coverUrl } from "../lib/assets";
import { musicWorks, validateMusicWorks } from "./music";

export { musicWorks } from "./music";

const protagonistBvids = [
  "BV1P4Go6NEPf","BV1W4Go6NEDs","BV1A4Go6NECQ","BV1bkVF6DEHd","BV1bkVF6DEGG",
  "BV1bkVF6DEKm","BV1qxVF6aEP1","BV16rVW6zEBU","BV1BGVN62ENV","BV1ZGVN62Eoz",
  "BV1E3VN67EtY","BV1nyGQ67Eyp","BV16yGQ67E6K","BV1HkGQ6UEFz","BV16rVW6zEfa",
  "BV1RUVY6REfk","BV1RUVY6REUp","BV1dmVY6xEb6","BV1dmVY6xE2N","BV1dmVY6xEha",
  "BV19QVY6XECa","BV19QVY6XEBP","BV19QVY6XEDc","BV15QVY69EPY","BV1RDVY6WExx",
  "BV1G6VV68EPE","BV136VV68Ef8","BV136VV68Ez6","BV1DyVV6oEJC","BV18yVV6oE5N",
  "BV1LeVV6eEAS","BV1hCVV6tE76","BV1VzVV6cEw4","BV1YzVV6cE3q","BV19BVf6tEp8",
  "BV15BVf6bErG","BV1QkVf6REtU","BV1QkVf6REaq","BV1QkVf6RESV","BV1arVf6sEMv",
  "BV1XrVf6xEaG","BV1oeVf6cEKj","BV1oeVf6cEMt","BV1ZaVf6aEKd","BV1oaVf6aEYC",
  "BV1RiVf6fEpn","BV1RiVf6fEy5","BV1vqVf6FEvz","BV1dvVf68Eu1","BV1dvVf68EV1",
  "BV1jvVf6hETH","BV1S87X65E1q","BV1S87X65Eyp","BV14e7X6rEqQ","BV12e7X6rEmP",
  "BV12e7X6rEDE","BV12e7X6rEfg","BV1tY7X6GEBa","BV1mY7X6GEma","BV1mY7X6GE2e",
  "BV1tY7X6GEhT","BV1Ac7X6NEiu","BV1Cc7X6NEB2","BV1Cc7X6PEbv","BV1yc7X6NEHv",
  "BV1Ac7X6NE2H","BV1yf7Q6vE4r","BV1yf7Q6vEzK","BV1Pf7Q6iEvz","BV1KvEs6wEP1",
  "BV11vEs6cEXp","BV1CzEs6tEJK","BV1CzEs6tEaJ","BV1yzEs6tEFu","BV1pzEs6tEZa",
  "BV1wzEs64EQg","BV1WqEs6fEBx","BV1sqEs6fEJL","BV1yqEs6fEWZ","BV1WqEs6fEiy",
  "BV1PBEs6FERY","BV16NEs6DEKW","BV1zNEs6DE2a","BV1zNEs6DErE","BV16NEs6DELk",
  "BV16PEs6HEvt","BV16PEs6HEyq","BV1HPEs6pEFT","BV1EpLZ6qEJ8","BV1JHLZ6MEWF"
];

const protagonistDurations = [
  520,469,913,698,1069,499,593,840,729,787,630,502,729,846,1164,1091,549,610,
  694,527,602,723,732,924,668,639,947,799,665,622,704,740,991,621,482,790,
  1454,479,379,448,924,806,686,1174,1380,586,829,727,613,1088,496,812,731,
  636,334,527,504,460,742,1056,702,754,595,1235,581,875,734,814,634,601,544,
  886,1119,884,1085,875,707,755,536,1080,1259,812,934,822,858,774,975,1014,
  616,489
];

const destinyBvids = [
  "BV18xGJ6gECU","BV1rCGJ6ZEq6","BV1anGJ6CEQU","BV1YJGJ65Emo","BV1YJGJ65ESy",
  "BV1YJGJ65EvL","BV13WGJ6kE4i","BV1hWGJ6rEtS","BV1aWGJ6rE5V","BV1hWGJ6rEfZ",
  "BV1e7GJ61Enb","BV1e7GJ61EUJ","BV1R7GJ61Ee1","BV1e7GJ61E2N","BV1vjGJ6jEEu",
  "BV1vjGJ6jEAQ","BV1vjGJ6jEU7","BV1vjGJ6jEG5","BV1vjGJ6jE3W","BV1DyGE6MENW",
  "BV1gyGE6uESJ","BV1QkGE6zE31","BV13kGE66EvP","BV1QkGE6zEFx","BV13kGE66EEx",
  "BV1XBGE6GEdH","BV1RiGE6CEGD","BV19iGE6CEZ4","BV15iGE6yEpj","BV19iGE6CEod",
  "BV15iGE6yEd6","BV1QrGE6gE1V","BV1QrGE6gEa3","BV1QrGE6gEXt","BV1XrGE6gEcs",
  "BV1XrGE6gEcu","BV1XzGE6rEDq","BV1XzGE6rE2r","BV1XzGE6rED5","BV1XzGE6rESJ"
];

const destinyDurations = [
  1090,639,901,868,871,916,825,1008,837,940,878,900,926,856,1004,438,992,
  1044,879,899,950,972,1195,1185,926,945,978,923,1024,981,927,902,628,929,
  931,883,909,931,403,505
];

function makeEpisodes(
  series: "主角" | "命运",
  bvids: string[],
  durations: number[],
  cover: string
): Work[] {
  return bvids.map((bvid, index) => ({
    id: `${series === "主角" ? "protagonist" : "destiny"}-${index + 1}`,
    title: `${series}${index + 1}`,
    category: "audio-story",
    bvid,
    cover,
    description: `${series} AI声音叙事实验第 ${index + 1} 集`,
    duration: formatDuration(durations[index]),
    series,
    episode: index + 1,
    featured: index === 0,
    copyrightStatus: "unauthorized-reading"
  }));
}

export const audioStories: Work[] = [
  ...makeEpisodes("主角", protagonistBvids, protagonistDurations, coverUrl("protagonist-editorial.png")),
  ...makeEpisodes("命运", destinyBvids, destinyDurations, coverUrl("destiny-editorial.png"))
];

export const allWorks = [...musicWorks, ...audioStories];

export function validateWorks() {
  const errors: string[] = [...validateMusicWorks()];
  const bvids = new Set<string>();

  for (const work of allWorks) {
    if (bvids.has(work.bvid)) errors.push(`重复BV号：${work.bvid}`);
    bvids.add(work.bvid);
  }

  for (const series of ["主角", "命运"] as const) {
    const episodes = audioStories.filter((work) => work.series === series);
    episodes.forEach((work, index) => {
      if (work.episode !== index + 1) errors.push(`${series}分集顺序错误：${work.title}`);
    });
  }

  return errors;
}
