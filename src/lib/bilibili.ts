export const BILIBILI_PROFILE_URL = "https://space.bilibili.com/586333146";

export function getBilibiliEmbedUrl(bvid: string) {
  return `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(
    bvid
  )}&high_quality=1&autoplay=0`;
}

export function getBilibiliVideoUrl(bvid: string) {
  return `https://www.bilibili.com/video/${bvid}`;
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}
