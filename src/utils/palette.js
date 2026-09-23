// Subject colours: a fixed palette that reads on every theme. New subjects
// take the first colour nobody is using yet, so they stay distinguishable.
export const SUBJECT_PALETTE = [
  "#4F9CF9", "#34D399", "#A78BFA", "#FBBF24", "#F472B6", "#60A5FA", "#FB923C", "#2DD4BF",
  "#F87171", "#C084FC", "#A3E635", "#38BDF8", "#E879F9", "#FACC15", "#4ADE80", "#FDA4AF",
];

// The next `count` colours not in `used` (compared case-insensitively). Once
// the palette runs out it cycles, still preferring colours used least.
export const pickColors = (used, count = 1, palette = SUBJECT_PALETTE) => {
  const tally = new Map(palette.map((color) => [color.toLowerCase(), 0]));
  used.forEach((color) => {
    const key = String(color || "").toLowerCase();
    if (tally.has(key)) tally.set(key, tally.get(key) + 1);
  });
  const picked = [];
  for (let i = 0; i < count; i += 1) {
    const [best] = palette.reduce(
      (acc, color) => {
        const uses = tally.get(color.toLowerCase());
        return uses < acc[1] ? [color, uses] : acc;
      },
      [palette[0], Infinity]
    );
    picked.push(best);
    tally.set(best.toLowerCase(), tally.get(best.toLowerCase()) + 1);
  }
  return picked;
};

export const pickColor = (used, palette) => pickColors(used, 1, palette)[0];
