// Generates the local placeholder images in public/demo (run: node scripts/make-placeholders.mjs).
// These are used when seeding with SEED_PHOTOS=local, e.g. for offline development.
import { mkdirSync, writeFileSync } from "node:fs";

const palettes = {
  lake: { sky: ["#f6d9b8", "#e8a87c"], far: "#7d9a8c", near: "#3f5a4c", ground: "#2c4136", sun: "#fff3d6" },
  coast: { sky: ["#cfe8ef", "#f7e3c4"], far: "#8fb8c4", near: "#4d8794", ground: "#e2cfa8", sun: "#ffffff" },
  city: { sky: ["#e9d8cf", "#c98f77"], far: "#8a7f8d", near: "#55495a", ground: "#352e3a", sun: "#ffe9d0" },
};
const scenes = ["Exterior", "Living room", "Kitchen", "Bedroom", "Bathroom", "View"];

function svg(p, label, seed) {
  const sx = 300 + ((seed * 197) % 900);
  const h1 = 560 + ((seed * 53) % 80);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1067" role="img" aria-label="${label}">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>
<rect width="1600" height="1067" fill="url(#s)"/>
<circle cx="${sx}" cy="330" r="110" fill="${p.sun}" opacity=".85"/>
<path d="M0 ${h1} C 300 ${h1 - 160}, 520 ${h1 - 40}, 800 ${h1 - 90} S 1350 ${h1 - 200}, 1600 ${h1 - 60} V1067 H0Z" fill="${p.far}"/>
<path d="M0 ${h1 + 140} C 260 ${h1 + 40}, 600 ${h1 + 160}, 900 ${h1 + 90} S 1400 ${h1 + 20}, 1600 ${h1 + 120} V1067 H0Z" fill="${p.near}"/>
<rect y="900" width="1600" height="167" fill="${p.ground}"/>
<g transform="translate(${620 + ((seed * 31) % 200)} 640)" fill="${p.ground}">
<path d="M0 120 L160 0 L320 120 V300 H0Z"/><rect x="130" y="190" width="60" height="110" fill="${p.sun}" opacity=".9"/>
<rect x="40" y="170" width="50" height="50" fill="${p.sun}" opacity=".7"/><rect x="230" y="170" width="50" height="50" fill="${p.sun}" opacity=".7"/>
</g>
<text x="60" y="1010" font-family="Georgia, serif" font-size="44" fill="#ffffff" opacity=".9">${label}</text>
</svg>`;
}

mkdirSync("public/demo", { recursive: true });
let n = 0;
for (const [key, palette] of Object.entries(palettes)) {
  scenes.forEach((scene, i) => {
    writeFileSync(`public/demo/${key}-${i + 1}.svg`, svg(palette, `Sample photo · ${scene}`, ++n));
  });
}
writeFileSync("public/demo/hero.svg", svg(palettes.lake, "", 3).replace(/<text.*<\/text>\n/, ""));
console.log("Wrote placeholder images to public/demo");
