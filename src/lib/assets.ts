export function assetUrl(path: string, base = import.meta.env.BASE_URL) {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
}

export function coverUrl(filename: string) {
  return assetUrl(`covers/${filename}`);
}

export function appRouteUrl(path: string, base = import.meta.env.BASE_URL) {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
}
