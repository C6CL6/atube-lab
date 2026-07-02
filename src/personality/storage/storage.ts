import { createUser, loadAppData, saveAppData } from "../../sudoku/storage/storage";
import type { PersonalityReport, PersonalityUser } from "../domain/types";

const REPORTS_KEY = "atube-personality-v1";

type ReportsData = {
  version: 1;
  reports: PersonalityReport[];
};

function emptyReports(): ReportsData {
  return { version: 1, reports: [] };
}

export function loadPersonalityUsers(): PersonalityUser[] {
  return loadAppData().users;
}

export function createPersonalityUser(rawName: string): PersonalityUser {
  const sudokuData = loadAppData();
  const created = createUser(sudokuData, rawName);
  saveAppData(created.data);
  return created.user;
}

function loadReportData(): ReportsData {
  try {
    const value = localStorage.getItem(REPORTS_KEY);
    if (!value) return emptyReports();
    const parsed = JSON.parse(value) as ReportsData;
    return parsed.version === 1 && Array.isArray(parsed.reports) ? parsed : emptyReports();
  } catch {
    return emptyReports();
  }
}

function saveReportData(data: ReportsData): void {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(data));
}

export function saveReport(report: PersonalityReport): void {
  const data = loadReportData();
  saveReportData({ ...data, reports: [report, ...data.reports] });
}

export function loadReports(userId?: string): PersonalityReport[] {
  const reports = loadReportData().reports;
  return userId ? reports.filter((report) => report.userId === userId) : reports;
}
