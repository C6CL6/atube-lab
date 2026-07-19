import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SeriesPage } from "./SeriesPage";

describe("声音专题页奖项文案", () => {
  it("使用正式的茅盾文学奖名称", () => {
    render(
      <MemoryRouter initialEntries={["/series/protagonist"]}>
        <Routes>
          <Route path="/series/:slug" element={<SeriesPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("第十届茅盾文学奖获奖小说")).toBeInTheDocument();
    expect(screen.queryByText(/矛盾文学奖/)).not.toBeInTheDocument();
  });
  it("主角专题标记为已完结并说明B站150集完整发布", () => {
    render(
      <MemoryRouter initialEntries={["/series/protagonist"]}>
        <Routes>
          <Route path="/series/:slug" element={<SeriesPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("AI 有声小说 · 已完结")).toBeInTheDocument();
    expect(screen.getByText(/B站已完整发布 150 集/)).toBeInTheDocument();
  });

});
