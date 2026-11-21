/**
 * Isometric delivery-area map from the mockup: live zones are raised blue blocks, the rest flat dashed tiles.
 * Up to four blocks: 1 centred, 2 side by side, 3 as two plus one, 4 as a 2×2 grid. CSS only, decorative.
 */
const SIZE = 136, GAP = 20, PAD = 24;
const slots: Record<number, [number, number][]> = {
  1: [[PAD + (SIZE + GAP) / 2, PAD + (SIZE + GAP) / 2]],
  2: [[PAD, PAD + (SIZE + GAP) / 2], [PAD + SIZE + GAP, PAD + (SIZE + GAP) / 2]],
  3: [[PAD, PAD], [PAD + SIZE + GAP, PAD], [PAD + (SIZE + GAP) / 2, PAD + SIZE + GAP]],
  4: [[PAD, PAD], [PAD + SIZE + GAP, PAD], [PAD, PAD + SIZE + GAP], [PAD + SIZE + GAP, PAD + SIZE + GAP]],
};

export default function IsoAreasMap({ blocks }: { blocks: { name: string; live: boolean }[] }) {
  if (blocks.length === 0) return null;
  const pos = slots[Math.min(4, blocks.length)];
  return (
    <div aria-hidden="true" className="flex h-[360px] min-w-0 flex-[1_1_440px] items-center justify-center overflow-hidden sm:h-[460px]">
      <div className="relative h-[340px] w-[340px] scale-[0.8] sm:scale-100" style={{ transform: "rotateX(58deg) rotateZ(-45deg)" }}>
        <div className="absolute inset-0 rounded-[28px] bg-[#DCEAF7]" style={{ boxShadow: "10px 10px 0 #B8CFE6, 20px 20px 40px rgba(11,31,51,0.15)" }} />
        {blocks.slice(0, 4).map((b, i) => (
          <div
            key={b.name}
            className="display-font absolute flex items-center justify-center rounded-[18px] px-2 text-center"
            style={{
              left: pos[i][0], top: pos[i][1], width: SIZE, height: SIZE,
              ...(b.live
                ? { background: "#0057D9", color: "#FFFFFF", fontWeight: 700, fontSize: 18,
                    boxShadow: "4px 4px 0 #0047B3, 8px 8px 0 #003C99, 12px 12px 0 #00317F, 16px 16px 0 #00286A, 22px 22px 30px rgba(0,40,106,0.4)" }
                : { background: "#FFFFFF", color: "#1D3A57", fontWeight: 600, fontSize: 17, border: "2px dashed #8FB3D9", boxShadow: "3px 3px 0 #C6D8EA" }),
            }}
          >
            {b.name}
          </div>
        ))}
      </div>
    </div>
  );
}
