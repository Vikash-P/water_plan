import Link from "next/link";
import Logo from "@/components/Logo";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#areas", label: "Areas" },
  { href: "/b2b", label: "For business" },
  { href: "/faq", label: "FAQ" },
];

export default function Header() {
  return (
    <header className="material sticky top-0 z-10 border-b border-line">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
        <Link href="/" aria-label="WaterMart home" className="no-underline">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden flex-auto flex-wrap gap-x-[22px] gap-y-1.5 text-[15px] md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-[#33475B] no-underline hover:text-brand">{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <Link href="/account" className="btn btn-outline !hidden !px-4 !py-2.5 text-sm no-underline sm:!inline-flex">My account</Link>
          <Link href="/track" className="btn btn-outline !hidden !px-4 !py-2.5 text-sm no-underline sm:!inline-flex">Track order</Link>
          <Link href="/order" className="btn btn-primary wm-lift wm-press !px-5 !py-3 text-sm no-underline">Order now</Link>
        </div>
      </div>
    </header>
  );
}
