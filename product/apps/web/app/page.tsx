import { BoardWorkspace } from "./components/board-workspace";

const nextMilestones = ["建立匿名身份", "接入衣物卡", "完成可编辑画板"];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="AI 换装画板首页">
          AI 换装画板
        </a>
        <p className="status" aria-live="polite">基础工程已就绪</p>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">你的衣服，由你来搭</p>
        <h1 id="page-title">把衣服拖到模特身上试试看。</h1>
        <p className="lede">手动搭配始终免费；需要时再让 AI 帮你检查和调整。</p>
      </section>

      <BoardWorkspace />

      <section className="build-note" aria-labelledby="build-heading">
        <p className="section-kicker">实施进度</p>
        <h2 id="build-heading">先把可靠的基础搭好</h2>
        <ol>
          {nextMilestones.map((milestone, index) => (
            <li key={milestone}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {milestone}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
