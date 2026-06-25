import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { SudokuApp } from "../sudoku/SudokuApp";
import "../sudoku/styles.css";

export function SudokuPage() {
  return (
    <>
      <SiteHeader />
      <div className="sudoku-app">
        <SudokuApp />
      </div>
      <SiteFooter />
    </>
  );
}
