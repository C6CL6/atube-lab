export type WorkCategory =
  | "original-music"
  | "music-experiment"
  | "audio-story";

export type CopyrightStatus =
  | "original"
  | "adaptation"
  | "unauthorized-reading";

export type Work = {
  id: string;
  title: string;
  category: WorkCategory;
  bvid: string;
  cover: string;
  description: string;
  duration?: string;
  series?: "主角" | "命运";
  episode?: number;
  featured: boolean;
  originalCredit?: string;
  copyrightStatus: CopyrightStatus;
};
