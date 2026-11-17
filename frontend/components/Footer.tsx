import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
        <Logo className="h-5 w-auto" />
        <p className="mt-1">Prepaid 20L drinking water, delivered across Mumbai. ISI/BIS-certified partner plants only.</p>
        <p className="mt-4">© WaterMart. Refund, deposit and privacy policies will be published before launch.</p>
      </div>
    </footer>
  );
}
