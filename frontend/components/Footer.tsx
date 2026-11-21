import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line px-6 py-8">
      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-4 text-sm text-muted">
        <span>WaterMart · Prepaid 20L drinking water across Mumbai. ISI/BIS-certified partner plants only.</span>
        <span className="flex flex-wrap gap-[18px]">
          <Link href="/faq">FAQ</Link>
          <Link href="/b2b">For business</Link>
          <Link href="/partner">Become a partner</Link>
          <Link href="/track">Track order</Link>
        </span>
      </div>
      <p className="mx-auto mt-3 max-w-[1240px] text-sm text-muted">Refund, deposit and privacy policies will be published before launch.</p>
    </footer>
  );
}
