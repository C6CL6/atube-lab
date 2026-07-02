import { ArrowLeft, ArrowRight, Download, RotateCcw } from "lucide-react";
import { useState } from "react";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { buildPersonalityReport, formatReportText } from "../personality/domain/report";
import { mbtiQuestions } from "../personality/domain/questions";
import { scoreMbtiAnswers } from "../personality/domain/scoring";
import type { AnswerMap, AnswerValue, PersonalityReport, PersonalityUser } from "../personality/domain/types";
import { createPersonalityUser, loadPersonalityUsers, loadReports, saveReport } from "../personality/storage/storage";
import "../personality/styles.css";

const answerOptions: { value: AnswerValue; label: string }[] = [
  { value: -2, label: "比较符合左侧" },
  { value: -1, label: "略偏左侧" },
  { value: 0, label: "中间/看情况" },
  { value: 1, label: "略偏右侧" },
  { value: 2, label: "比较符合右侧" },
];

const upcomingTests = [
  ["DISC 个性测验", "偏企业管理和沟通风格，适合团队协作分析。"],
  ["九型人格测试", "偏动机、恐惧和角色深层驱动力，适合人物塑造。"],
  ["大五人格问卷", "偏学术维度，适合更稳定的特质量化观察。"],
];

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function DimensionBars({ report }: { report: PersonalityReport }) {
  return (
    <div className="personality-bars" aria-label="四组维度比例">
      {Object.entries(report.scores).map(([dimension, score]) => {
        const leftValue = score.percentages[score.left];
        const rightValue = score.percentages[score.right];
        return (
          <div className="personality-bar" key={dimension}>
            <div className="personality-bar__label">
              <strong>{score.left}</strong>
              <span>{dimension}</span>
              <strong>{score.right}</strong>
            </div>
            <div className="personality-bar__track">
              <span style={{ width: `${leftValue}%` }}>{leftValue}%</span>
              <span style={{ width: `${rightValue}%` }}>{rightValue}%</span>
            </div>
            <p>{score.note}</p>
          </div>
        );
      })}
    </div>
  );
}

export function PersonalityPage() {
  const [users, setUsers] = useState<PersonalityUser[]>(() => loadPersonalityUsers());
  const [selectedUser, setSelectedUser] = useState<PersonalityUser | null>(() => loadPersonalityUsers()[0] ?? null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [activeReport, setActiveReport] = useState<PersonalityReport | null>(null);
  const history = loadReports(selectedUser?.id);
  const currentQuestion = mbtiQuestions[currentIndex];

  const createUser = () => {
    try {
      const created = createPersonalityUser(name);
      setUsers(loadPersonalityUsers());
      setSelectedUser(created);
      setName("");
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法创建用户");
    }
  };

  const answerQuestion = (value: AnswerValue) => {
    if (!selectedUser) return;
    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);
    if (currentIndex < mbtiQuestions.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }
    const scores = scoreMbtiAnswers(mbtiQuestions, nextAnswers);
    const report = buildPersonalityReport(selectedUser, scores, nextAnswers);
    saveReport(report);
    setActiveReport(report);
    setStarted(false);
  };

  const resetTest = () => {
    setAnswers({});
    setCurrentIndex(0);
    setActiveReport(null);
    setStarted(true);
  };

  return (
    <>
      <SiteHeader />
      <main className="personality-page">
        <section className="personality-hero page-shell">
          <div>
            <p className="eyeline">PERSONALITY LAB</p>
            <h1>16型人格倾向测试</h1>
            <p>参考 MBTI 常见四维框架和经典问卷的测量方向设计，适合自我观察、人物创作和沟通风格复盘。</p>
          </div>
        </section>

        <section className="page-shell personality-layout">
          <aside className="personality-panel">
            <h2>测试用户</h2>
            <p>可沿用数独里的本地用户名；数据只保存在当前浏览器。</p>
            {users.length > 0 ? (
              <div className="personality-users">
                {users.map((user) => (
                  <button
                    className={selectedUser?.id === user.id ? "is-selected" : ""}
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setActiveReport(null);
                    }}
                  >
                    <span style={{ background: user.avatarColor }}>{user.name.slice(0, 1)}</span>
                    {user.name}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="personality-create">
              <label htmlFor="personality-username">用户名</label>
              <input
                id="personality-username"
                maxLength={12}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                placeholder="例如：阿土伯"
                autoComplete="off"
              />
              {error ? <p className="personality-error" role="alert">{error}</p> : null}
              <button onClick={createUser}>创建并使用</button>
            </div>
          </aside>

          <section className="personality-main">
            {!started && !activeReport ? (
              <>
                <div className="personality-card personality-card--primary">
                  <div>
                    <p className="eyeline">AVAILABLE NOW</p>
                    <h2>本次开放测试</h2>
                    <p>
                      60道中文题，覆盖能量来源、信息处理、决策方式、生活节奏四组维度。
                    </p>
                  </div>
                  <button className="button button--primary" disabled={!selectedUser} onClick={() => setStarted(true)}>
                    开始测试 <ArrowRight size={16} />
                  </button>
                </div>
                <div className="personality-upcoming">
                  {upcomingTests.map(([title, body]) => (
                    <article key={title}>
                      <span>后续开放</span>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </article>
                  ))}
                </div>
                <HistoryList reports={history} onOpen={setActiveReport} />
              </>
            ) : null}

            {started && currentQuestion ? (
              <div className="personality-question">
                <button className="personality-back" onClick={() => setStarted(false)}>
                  <ArrowLeft size={16} /> 返回测试中心
                </button>
                <p className="eyeline">第 {currentIndex + 1} / {mbtiQuestions.length} 题</p>
                <h2>{currentQuestion.prompt}</h2>
                <p className="personality-question-example">{currentQuestion.example}</p>
                <div className="personality-scale-labels">
                  <span>{currentQuestion.leftLabel}</span>
                  <span>{currentQuestion.rightLabel}</span>
                </div>
                <div className="personality-answer-grid">
                  {answerOptions.map((option) => (
                    <button key={option.value} onClick={() => answerQuestion(option.value)}>
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="personality-progress" aria-label="测试进度">
                  <span style={{ width: `${((currentIndex + 1) / mbtiQuestions.length) * 100}%` }} />
                </div>
              </div>
            ) : null}

            {activeReport ? (
              <>
                <ReportView report={activeReport} onRetest={resetTest} onBack={() => setActiveReport(null)} />
                <HistoryList reports={history} onOpen={setActiveReport} />
              </>
            ) : null}
          </section>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function HistoryList({ reports, onOpen }: { reports: PersonalityReport[]; onOpen: (report: PersonalityReport) => void }) {
  return (
    <section className="personality-history">
      <h2>本机历史报告</h2>
      {reports.length === 0 ? <p>当前用户还没有本机报告。</p> : null}
      <div>
        {reports.map((report) => (
          <button key={report.id} onClick={() => onOpen(report)}>
            <strong>{report.typeCode}</strong>
            <span>{new Date(report.createdAt).toLocaleString("zh-CN")}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ReportView({ report, onRetest, onBack }: { report: PersonalityReport; onRetest: () => void; onBack: () => void }) {
  return (
    <article className="personality-report">
      <button className="personality-back" onClick={onBack}>
        <ArrowLeft size={16} /> 返回测试中心
      </button>
      <p className="eyeline">LOCAL REPORT</p>
      <h2>{report.username}的16型人格倾向报告</h2>
      <div className="personality-type">
        <span>你的倾向类型</span>
        <strong>{report.typeCode}</strong>
      </div>
      <DimensionBars report={report} />
      <div className="personality-report-sections">
        {report.sections.map((section) => (
          <section key={section.title}>
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
      <p className="personality-disclaimer">
        声明：结果仅供自我观察、创作设定与沟通参考，不用于招聘、医疗、心理诊断或重大决策。
      </p>
      <div className="personality-actions">
        <button className="button button--primary" onClick={onRetest}>
          <RotateCcw size={16} /> 重新测试
        </button>
        <button className="button button--ghost" onClick={() => downloadFile(`${report.username}-${report.typeCode}.txt`, formatReportText(report), "text/plain;charset=utf-8")}>
          <Download size={16} /> 导出文本
        </button>
        <button className="button button--ghost" onClick={() => downloadFile(`${report.username}-${report.typeCode}.json`, JSON.stringify(report, null, 2), "application/json;charset=utf-8")}>
          <Download size={16} /> 导出JSON
        </button>
      </div>
    </article>
  );
}
