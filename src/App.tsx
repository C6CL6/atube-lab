import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { HomePage } from "./pages/HomePage";
import { LearningPage } from "./pages/LearningPage";
import { MusicPage } from "./pages/MusicPage";
import { NotePage } from "./pages/NotePage";
import { SeriesPage } from "./pages/SeriesPage";

function ScrollManager() {
  const location = useLocation();
  useEffect(() => {
    const hash = location.hash.slice(1);
    if (hash) {
      requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [location]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/learning" element={<LearningPage />} />
        <Route path="/music" element={<MusicPage />} />
        <Route path="/series/:slug" element={<SeriesPage />} />
        <Route path="/notes/:slug" element={<NotePage />} />
      </Routes>
    </>
  );
}
