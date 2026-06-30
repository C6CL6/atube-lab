import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { appRouteUrl } from "../lib/assets";
import { SudokuApp } from "../sudoku/SudokuApp";
import { loadAppData } from "../sudoku/storage/storage";
import "../sudoku/styles.css";

function hasActiveGame() {
  const data = loadAppData();
  return Boolean(data.activeUserId && data.games[data.activeUserId]);
}

function isGameWindow(search: string) {
  return new URLSearchParams(search).get("window") === "game";
}

export function SudokuPage() {
  const location = useLocation();
  const [gameWindow] = useState(() => isGameWindow(location.search));
  const [playing, setPlaying] = useState(gameWindow && hasActiveGame);
  const navigate = useNavigate();

  const openGameWindow = () => {
    const popup = window.open(
      appRouteUrl("/sudoku?window=game"),
      "atube-sudoku-game",
      "popup=yes,width=980,height=760,left=80,top=40,resizable=yes,scrollbars=no",
    );
    popup?.focus();
    return Boolean(popup);
  };

  return (
    <>
      {playing || gameWindow ? null : <SiteHeader />}
      <div className={playing ? "sudoku-app sudoku-app--playing" : "sudoku-app"}>
        <SudokuApp
          gameWindowMode={gameWindow}
          onOpenGameWindow={openGameWindow}
          onPlayingChange={setPlaying}
          onReturnHome={() => navigate("/")}
        />
      </div>
      {playing || gameWindow ? null : <SiteFooter />}
    </>
  );
}
