import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { SnakeApp } from "../snake/SnakeApp";

export function SnakePage() {
  return (
    <>
      <SiteHeader />
      <SnakeApp />
      <SiteFooter />
    </>
  );
}
