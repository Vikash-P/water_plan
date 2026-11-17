import Link from "next/link";
import Logo from "@/components/Logo";

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
        <Link href="/" aria-label="WaterMart home" className="flex items-center"><Logo className="h-6 w-auto" /></Link>
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
