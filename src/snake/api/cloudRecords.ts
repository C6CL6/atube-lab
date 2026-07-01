import type { SnakeRecord } from "../domain/types";

const PRODUCTION_RECORDS_ENDPOINT = "https://atube.ccwu.cc/api/snake/records";

type CloudRecordsResponse = {
  records: SnakeRecord[];
  unavailable: boolean;
};

export function getSnakeCloudRecordsEndpoint(hostname = window.location.hostname) {
  return hostname === "atube.ccwu.cc"
    ? "/api/snake/records"
    : hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "atube-inspiration-lab.netlify.app" ||
      hostname === "atube-lab.netlify.app" ||
      hostname === "c6cl6.github.io"
    ? PRODUCTION_RECORDS_ENDPOINT
    : "/api/snake/records";
}

export async function fetchSnakeCloudRecords(): Promise<CloudRecordsResponse> {
  try {
    const response = await fetch(getSnakeCloudRecordsEndpoint(), { headers: { Accept: "application/json" } });
    if (!response.ok) return { records: [], unavailable: true };
    const body = await response.json() as { records?: SnakeRecord[] };
    return { records: Array.isArray(body.records) ? body.records : [], unavailable: false };
  } catch {
    return { records: [], unavailable: true };
  }
}

export async function submitSnakeCloudRecord(record: SnakeRecord): Promise<{ ok: boolean }> {
  try {
    const response = await fetch(getSnakeCloudRecordsEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(record),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}
