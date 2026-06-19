import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { notes } from "../data/notes";

export function NotePage() {
  const { slug } = useParams();
  const note = notes.find((item) => item.slug === slug);
  if (!note) return <Navigate to="/" replace />;

  return (
    <>
      <SiteHeader />
      <main className="article-page page-shell">
        <Link className="back-link" to="/#notes"><ArrowLeft size={16} /> 返回创作手记</Link>
        <p className="eyeline">CREATIVE NOTE · {note.number}</p>
        <h1>{note.title}</h1>
        <p className="article-lead">{note.summary}</p>
        <div className="article-body">
          {note.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
