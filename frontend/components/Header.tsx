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
        <Link href="/" className="text-xl font-bold tracking-tight text-brand">JalDrop</Link>
        <nav className="hidden gap-6 text-sm md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted hover:text-brand">{l.label}</Link>
          ))}
        </nav>
        <Link href="/order" className="btn btn-primary !px-4 !py-2 text-sm">
          Order now
        </Link>
      </div>
    </header>
  );
}
