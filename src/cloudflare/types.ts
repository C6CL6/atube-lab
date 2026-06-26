export type CloudflareKV = {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
  list?(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>
}

export type CloudflareEnv = {
  ATUBE_KV: CloudflareKV
}

export type PagesContext = {
  request: Request
  env: CloudflareEnv
}
