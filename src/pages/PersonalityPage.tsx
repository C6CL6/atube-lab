import { ArrowLeft, ArrowRight, Download, RotateCcw } from "lucide-react";
import { useState } from "react";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { buildDiscReport, buildPersonalityReport, formatReportText } from "../personality/domain/report";
import { discQuestions, mbtiQuestions } from "../personality/domain/questions";
import { scoreDiscAnswers, scoreMbtiAnswers } from "../personality/domain/scoring";
import type {
  AnswerMap,
  AnswerValue,
  DimensionScore,
  PersonalityReport,
  PersonalityTestType,
  PersonalityUser,
} from "../personality/domain/types";
import { createPersonalityUser, loadPersonalityUsers, loadReports, saveReport } from "../personality/storage/storage";
import "../personality/styles.css";

const answerOptions: { value: AnswerValue; label: string }[] = [
  { value: -2, label: "比较符合左侧" },
  { value: -1, label: "略偏左侧" },
  { value: 0, label: "中间/看情况" },
  { value: 1, label: "略偏右侧" },
  { value: 2, label: "比较符合右侧" },
];

const availableTests: {
  type: PersonalityTestType;
  title: string;
  body: string;
}[] = [
  {
    type: "sixteen-types",
    title: "MBTI 人格倾向测试",
    body: "60道中文题，覆盖能量来源、信息处理、决策方式、生活节奏四组维度。",
  },
  {
    type: "disc",
    title: "五型动物人格测验",
    body: "48道中文题，观察目标推动、表达连接、稳定承接和谨慎校验等协作风格。",
  },
];

const upcomingTests = [
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
    <div className="personality-bars" aria-label={report.testType === "disc" ? "五型测验维度比例" : "四组维度比例"}>
      {Object.entries(report.scores).map(([dimension, score]) => {
        if ("percent" in score) {
          return (
            <div className="personality-bar personality-bar--single" key={dimension}>
              <div className="personality-bar__label">
                <strong>{dimension}</strong>
                <span>{discDimensionName(dimension)}</span>
                <strong>{score.percent}%</strong>
              </div>
              <div className="personality-bar__track">
                <span style={{ width: `${score.percent}%` }}>{score.percent}%</span>
              </div>
              <p>{score.note}</p>
            </div>
          );
        }
        const mbtiScore = score as DimensionScore;
        const leftValue = mbtiScore.percentages[mbtiScore.left];
        const rightValue = mbtiScore.percentages[mbtiScore.right];
        return (
          <div className="personality-bar" key={dimension}>
            <div className="personality-bar__label">
              <strong>{mbtiScore.left}</strong>
              <span>{dimension}</span>
              <strong>{mbtiScore.right}</strong>
            </div>
            <div className="personality-bar__track">
              <span style={{ width: `${leftValue}%` }}>{leftValue}%</span>
              <span style={{ width: `${rightValue}%` }}>{rightValue}%</span>
            </div>
            <p>{mbtiScore.note}</p>
          </div>
        );
      })}
    </div>
  );
}

function discDimensionName(dimension: string) {
  const names: Record<string, string> = {
    D: "目标推动",
    I: "表达连接",
    S: "稳定承接",
    C: "谨慎校验",
  };
  return names[dimension] ?? dimension;
}

function reportTitle(report: PersonalityReport) {
  return report.testType === "disc" ? "五型动物人格测验报告" : "MBTI 人格倾向报告";
}

function heroTitle(started: boolean, activeReport: PersonalityReport | null, activeTestTitle: string) {
  if (activeReport) return reportTitle(activeReport);
  if (started) return activeTestTitle;
  return "性格测验中心";
}

function heroDescription(started: boolean, activeReport: PersonalityReport | null, activeTest: PersonalityTestType) {
  if (activeReport) return "报告基于本次本地答题生成，只用于自我观察、创作设定和沟通风格复盘。";
  if (started && activeTest === "disc") return "按左右偏好取舍回答，不评价好坏，只观察你在不同协作场景里的自然入口。";
  if (started) return "按左右偏好取舍回答，不评价好坏，只观察你在四组人格维度上的相对倾向。";
  return "这里集中放置多套人格与沟通风格问卷。先选择用户，再选择要开始的测验。";
}

export function PersonalityPage() {
  const [users, setUsers] = useState<PersonalityUser[]>(() => loadPersonalityUsers());
  const [selectedUser, setSelectedUser] = useState<PersonalityUser | null>(() => loadPersonalityUsers()[0] ?? null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [activeTest, setActiveTest] = useState<PersonalityTestType>("sixteen-types");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [activeReport, setActiveReport] = useState<PersonalityReport | null>(null);
  const history = loadReports(selectedUser?.id);
  const activeQuestions = activeTest === "disc" ? discQuestions : mbtiQuestions;
  const currentQuestion = activeQuestions[currentIndex];
  const activeTestMeta = availableTests.find((test) => test.type === activeTest) ?? availableTests[0];

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
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }
    const report = activeTest === "disc"
      ? buildDiscReport(selectedUser, scoreDiscAnswers(discQuestions, nextAnswers), nextAnswers)
      : buildPersonalityReport(selectedUser, scoreMbtiAnswers(mbtiQuestions, nextAnswers), nextAnswers);
    saveReport(report);
    setActiveReport(report);
    setStarted(false);
  };

  const startTest = (testType: PersonalityTestType) => {
    setAnswers({});
    setCurrentIndex(0);
    setActiveReport(null);
    setActiveTest(testType);
    setStarted(true);
  };

  const resetTest = () => startTest(activeReport?.testType ?? activeTest);

  return (
    <>
      <SiteHeader />
      <main className="personality-page">
        <section className="personality-hero page-shell">
          <div>
            <p className="eyeline">PERSONALITY LAB</p>
            <h1>{heroTitle(started, activeReport, activeTestMeta.title)}</h1>
            <p>{heroDescription(started, activeReport, activeTest)}</p>
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
                <div className="personality-test-grid">
                  {availableTests.map((test) => (
                    <article className="personality-card personality-card--primary" key={test.type}>
                      <div>
                        <p className="eyeline">AVAILABLE NOW</p>
                        <h2>{test.title}</h2>
                        <p>{test.body}</p>
                      </div>
                      <button className="button button--primary" disabled={!selectedUser} onClick={() => startTest(test.type)}>
                        开始 <ArrowRight size={16} />
                      </button>
                    </article>
                  ))}
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
                <p className="eyeline">{activeTestMeta.title} · 第 {currentIndex + 1} / {activeQuestions.length} 题</p>
                <h2>{currentQuestion.prompt}</h2>
                <p className="personality-question-example">{currentQuestion.example}</p>
                {"leftLabel" in currentQuestion ? (
                  <div className="personality-scale-labels">
                    <span>{currentQuestion.leftLabel}</span>
                    <span>{currentQuestion.rightLabel}</span>
                  </div>
                ) : null}
                <div className="personality-answer-grid">
                  {answerOptions.map((option) => (
                    <button key={option.value} onClick={() => answerQuestion(option.value)}>
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="personality-progress" aria-label="测试进度">
                  <span style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }} />
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
            <strong>{report.testType === "disc" ? "五型动物" : "MBTI"} · {report.typeCode}</strong>
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
      <h2>{report.username}的{reportTitle(report)}</h2>
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
