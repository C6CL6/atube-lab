import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const navItems = [
  ["首页", "/"],
  ["AI音乐", "/music"],
  ["声音叙事", "/#stories"],
  ["AI学习", "/learning"],
  ["数独", "/sudoku"],
  ["贪吃蛇", "/snake"],
  ["创作手记", "/#notes"],
  ["关于", "/#about"]
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <Link className="brand" to="/" onClick={() => setOpen(false)}>
        <span className="brand__mark">A</span>
        <span>A-tube的灵感实验室</span>
      </Link>
      <button
        className="menu-button"
        aria-label={open ? "关闭菜单" : "打开菜单"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav className={open ? "site-nav site-nav--open" : "site-nav"}>
        {navItems.map(([label, href]) => (
          <NavLink key={href} to={href} onClick={() => setOpen(false)}>
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
