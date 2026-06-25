import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { SudokuApp } from "../sudoku/SudokuApp";
import { loadAppData } from "../sudoku/storage/storage";
import "../sudoku/styles.css";

function hasActiveGame() {
  const data = loadAppData();
  return Boolean(data.activeUserId && data.games[data.activeUserId]);
}

export function SudokuPage() {
  const [playing, setPlaying] = useState(hasActiveGame);
  const navigate = useNavigate();

  return (
    <>
      {playing ? null : <SiteHeader />}
      <div className={playing ? "sudoku-app sudoku-app--playing" : "sudoku-app"}>
        <SudokuApp onPlayingChange={setPlaying} onReturnHome={() => navigate("/")} />
      </div>
      {playing ? null : <SiteFooter />}
    </>
  );
}
