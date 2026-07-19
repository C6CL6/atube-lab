import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { HomePage } from "./pages/HomePage";
import { MusicPage } from "./pages/MusicPage";
import { RouterPage } from "./pages/RouterPage";
import { SeriesPage } from "./pages/SeriesPage";
import { SudokuPage } from "./pages/SudokuPage";

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
        <Route path="/learning" element={<Navigate to="/" replace />} />
        <Route path="/music" element={<MusicPage />} />
        <Route path="/personality" element={<Navigate to="/" replace />} />
        <Route path="/sudoku" element={<SudokuPage />} />
        <Route path="/router" element={<RouterPage />} />
        <Route path="/snake" element={<Navigate to="/" replace />} />
        <Route path="/guandan" element={<Navigate to="/" replace />} />
        <Route path="/notes" element={<Navigate to="/" replace />} />
        <Route path="/notes/:slug" element={<Navigate to="/" replace />} />
        <Route path="/series/:slug" element={<SeriesPage />} />
      </Routes>
    </>
  );
}
