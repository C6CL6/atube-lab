export const CONTINUOUS_LIMIT_SECONDS = 2 * 60 * 60
export const REST_SECONDS = 30 * 60
export const DAILY_LIMIT_SECONDS = 4 * 60 * 60
export const DAILY_WINDOW_SECONDS = 24 * 60 * 60

export type PlayLimitState = {
  windowStartedAt: number
  dailySeconds: number
  continuousSeconds: number
  restUntil: number | null
}

export type PlayLimitStatus =
  | { kind: 'ok' }
  | { kind: 'rest'; remainingSeconds: number }
  | { kind: 'daily-limit'; remainingSeconds: number }

export function createPlayLimitState(now: number): PlayLimitState {
  return { windowStartedAt: now, dailySeconds: 0, continuousSeconds: 0, restUntil: null }
}

function normalizeWindow(state: PlayLimitState, now: number): PlayLimitState {
  if (now - state.windowStartedAt >= DAILY_WINDOW_SECONDS * 1000) {
    return createPlayLimitState(now)
  }
  if (state.restUntil !== null && now >= state.restUntil) {
    return { ...state, continuousSeconds: 0, restUntil: null }
  }
  return state
}

export function addPlaySecond(state: PlayLimitState, now: number): PlayLimitState {
  const current = normalizeWindow(state, now)
  if (getPlayLimitStatus(current, now).kind !== 'ok') return current

  const continuousSeconds = current.continuousSeconds + 1
  const dailySeconds = current.dailySeconds + 1
  return {
    ...current,
    dailySeconds,
    continuousSeconds,
    restUntil: continuousSeconds >= CONTINUOUS_LIMIT_SECONDS ? now + 1000 + REST_SECONDS * 1000 : current.restUntil,
  }
}

export function getPlayLimitStatus(state: PlayLimitState, now: number): PlayLimitStatus {
  const current = normalizeWindow(state, now)
  if (current.dailySeconds >= DAILY_LIMIT_SECONDS) {
    const remainingSeconds = Math.max(1, Math.ceil((current.windowStartedAt + DAILY_WINDOW_SECONDS * 1000 - now) / 1000))
    return { kind: 'daily-limit', remainingSeconds }
  }
  if (current.restUntil !== null && now < current.restUntil) {
    return { kind: 'rest', remainingSeconds: Math.ceil((current.restUntil - now) / 1000) }
  }
  return { kind: 'ok' }
}

export function normalizePlayLimitState(state: PlayLimitState | undefined, now: number): PlayLimitState {
  return normalizeWindow(state ?? createPlayLimitState(now), now)
}
