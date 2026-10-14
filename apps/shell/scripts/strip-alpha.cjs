// Re-encode icon.png as RGB (color type 2) — App Store rejects icons with an alpha channel
const { PNG } = require(process.argv[2] + '/node_modules/pngjs');
const fs = require('fs');
const file = process.argv[3];
const src = PNG.sync.read(fs.readFileSync(file));
for (let i = 0; i < src.data.length; i += 4) if (src.data[i + 3] !== 255) throw new Error('icon has transparent pixels');
const out = PNG.sync.write(src, { colorType: 2, inputHasAlpha: true });
fs.writeFileSync(file, out);
const check = PNG.sync.read(fs.readFileSync(file));
console.log(file, check.width, 'x', check.height, 'colorType', out[25], '(2 = RGB, no alpha)');
