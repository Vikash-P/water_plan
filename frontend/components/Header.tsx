import Link from "next/link";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/track", label: "Track order" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/b2b", label: "For business" },
  { href: "/partner", label: "Become a partner" },
  { href: "/faq", label: "FAQ" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-10 material border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-brand">
          <svg width="18" height="22" viewBox="0 0 20 24" aria-hidden="true"><path d="M10 1C10 1 2 10 2 15a8 8 0 0016 0C18 10 10 1 10 1z" fill="currentColor" /></svg>
          JalDrop
        </Link>
        <nav className="hidden gap-6 text-sm md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted hover:text-brand">{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/account" className="btn border border-line !px-4 !py-2 text-sm">My account</Link>
          <Link href="/order" className="btn btn-primary !px-4 !py-2 text-sm">Order now</Link>
        </div>
      </div>
    </header>
  );
}
