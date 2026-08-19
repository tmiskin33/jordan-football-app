"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Nav link that highlights itself when the current route matches. */
export default function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full px-3 py-1.5 font-medium transition ${
        active ? "bg-maroon-50 text-maroon-700" : "text-steel-600 hover:bg-steel-100 hover:text-maroon-700"
      }`}
    >
      {children}
    </Link>
  );
}
