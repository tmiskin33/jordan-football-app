import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NavLink from "@/components/NavLink";

export default async function NavBar() {
  const session = await auth();

  const ownTeam = session
    ? await prisma.opponent.findFirst({ where: { isOwnTeam: true }, select: { id: true } })
    : null;

  return (
    <header className="sticky top-0 z-50 border-b-4 border-maroon-700 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          {/* Sized in CSS so the sticky bar stays compact on phones but the mark reads big on desktop. */}
          <Image
            src="/logo.png"
            alt="Jordan Beetdiggers"
            width={144}
            height={112}
            priority
            className="h-10 w-auto transition-transform group-hover:scale-105 sm:h-14"
          />
          <span className="text-lg font-bold tracking-tight text-maroon-700 max-[400px]:hidden sm:text-2xl">
            JORDAN FOOTBALL
          </span>
        </Link>
        {/* Scrolls sideways on phones rather than wrapping — keeps the sticky bar one row tall. */}
        <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto whitespace-nowrap text-sm">
          <NavLink href="/schedule">Schedule</NavLink>
          <NavLink href="/opponents">Scouting</NavLink>
          {ownTeam && <NavLink href={`/opponents/${ownTeam.id}`}>Team Analytics</NavLink>}
          <NavLink href="/live">Live</NavLink>
          {session ? (
            <>
              <NavLink href="/admin">Admin</NavLink>
              <form
                className="shrink-0"
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="shrink-0 rounded-full px-3 py-1.5 font-medium text-steel-600 transition hover:bg-steel-100 hover:text-maroon-700"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="shrink-0 rounded-full bg-maroon-700 px-4 py-1.5 font-medium text-white transition hover:bg-maroon-800"
            >
              Coach login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
