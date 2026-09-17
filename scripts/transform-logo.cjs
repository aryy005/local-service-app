const fs = require('fs');
const zlib = require('zlib');

// 1. Decode original user uploaded image
const srcPath = 'C:/Users/siwac/.gemini/antigravity/brain/d4e67139-d3a7-4469-9e1b-cf210ec8fd82/.user_uploaded/media_1789682943293.png';
const buf = fs.readFileSync(srcPath);
const srcW = buf.readUInt32BE(16);
const srcH = buf.readUInt32BE(20);

let p = 8;
const idatChunks = [];
while (p < buf.length) {
  const len = buf.readUInt32BE(p);
  const type = buf.toString('ascii', p + 4, p + 8);
  if (type === 'IDAT') idatChunks.push(buf.slice(p + 8, p + 8 + len));
  p += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(idatChunks));
const bpp = 4;
const stride = srcW * bpp;
const srcPixels = Buffer.alloc(srcW * srcH * 4);

function paeth(a, b, c) {
  const pr = a + b - c;
  const pa = Math.abs(pr - a);
  const pb = Math.abs(pr - b);
  const pc = Math.abs(pr - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

let srcPos = 0;
for (let y = 0; y < srcH; y++) {
  const filterType = raw[srcPos++];
  const prevLine = y > 0 ? srcPixels.slice((y - 1) * stride, y * stride) : null;
  const currLine = srcPixels.slice(y * stride, (y + 1) * stride);

  for (let x = 0; x < stride; x++) {
    const rawVal = raw[srcPos++];
    const left = x >= bpp ? currLine[x - bpp] : 0;
    const up = prevLine ? prevLine[x] : 0;
    const upLeft = prevLine && x >= bpp ? prevLine[x - bpp] : 0;

    let val = 0;
    if (filterType === 0) val = rawVal;
    else if (filterType === 1) val = (rawVal + left) & 0xff;
    else if (filterType === 2) val = (rawVal + up) & 0xff;
    else if (filterType === 3) val = (rawVal + Math.floor((left + up) / 2)) & 0xff;
    else if (filterType === 4) val = (rawVal + paeth(left, up, upLeft)) & 0xff;

    currLine[x] = val;
  }
}

// Destination: perfectly balanced square canvas (136 x 136)
const outW = 136;
const outH = 136;
const padX = 1;
const padY = 0;

// Brand color: #D2FE00 (Neon Lime: 210, 254, 0)
const TARGET_R = 210;
const TARGET_G = 254;
const TARGET_B = 0;

const destPixels = Buffer.alloc(outW * outH * 4);

// Fill entire canvas (including all 4 corners) with 100% pure #D2FE00
// Zero black color anywhere in the background or corners!
for (let i = 0; i < outW * outH; i++) {
  destPixels[i * 4] = TARGET_R;
  destPixels[i * 4 + 1] = TARGET_G;
  destPixels[i * 4 + 2] = TARGET_B;
  destPixels[i * 4 + 3] = 255;
}

// Render the stylized "Lf" letters using exact high-fidelity anti-aliasing
// Letter bounds: x in [28, 105], y in [24, 112]
for (let y = 24; y <= 112; y++) {
  for (let x = 28; x <= 105; x++) {
    const srcIdx = (y * srcW + x) * 4;
    const r = srcPixels[srcIdx];
    
    // In src, black letter has r ~ 5, yellow background has r ~ 250
    // Factor is the fraction of background color (1 = background, 0 = letter)
    const factor = Math.min(1, Math.max(0, (r - 18) / (235 - 18)));
    
    const destX = x + padX;
    const destY = y + padY;
    const destIdx = (destY * outW + destX) * 4;
    
    // Crisp #111111 black for the letter glyph
    destPixels[destIdx] = Math.round(17 * (1 - factor) + TARGET_R * factor);
    destPixels[destIdx + 1] = Math.round(17 * (1 - factor) + TARGET_G * factor);
    destPixels[destIdx + 2] = Math.round(17 * (1 - factor) + TARGET_B * factor);
    destPixels[destIdx + 3] = 255;
  }
}

// Encode PNG helper
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.slice(4, 8 + len)), 8 + len);
  return chunk;
}

function encodePng(w, h, rgbaBuf) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  const ihdr = makeChunk('IHDR', ihdrData);

  const rawScanlines = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    rawScanlines[y * (1 + w * 4)] = 0; // filter 0
    rgbaBuf.copy(rawScanlines, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = makeChunk('IDAT', zlib.deflateSync(rawScanlines, { level: 9 }));
  const iend = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Generate the primary clean logo PNG
const finalPng = encodePng(outW, outH, destPixels);

// Also generate a rounded version for favicon if needed, but solid #D2FE00 square ensures
// NO black corners on any browser or dark/light theme
fs.writeFileSync('public/logo.png', finalPng);
fs.writeFileSync('public/favicon.png', finalPng);

// Write to dist as well if present
if (fs.existsSync('dist')) {
  fs.writeFileSync('dist/logo.png', finalPng);
  fs.writeFileSync('dist/favicon.png', finalPng);
}

// Create favicon.ico using the PNG format supported by all modern browsers & Windows
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // icon
icoHeader.writeUInt16LE(1, 4); // count: 1 image

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(0, 0); // width (0 = 256 or > 128)
icoEntry.writeUInt8(0, 1); // height
icoEntry.writeUInt8(0, 2); // color palette
icoEntry.writeUInt8(0, 3); // reserved
icoEntry.writeUInt16LE(1, 4); // color planes
icoEntry.writeUInt16LE(32, 6); // bits per pixel
icoEntry.writeUInt32LE(finalPng.length, 8); // image size
icoEntry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

const finalIco = Buffer.concat([icoHeader, icoEntry, finalPng]);
fs.writeFileSync('public/favicon.ico', finalIco);
if (fs.existsSync('dist')) {
  fs.writeFileSync('dist/favicon.ico', finalIco);
}

// Create clean SVG with gentle rounded corners (rx=24) and #D2FE00 background
const b64 = finalPng.toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${outW} ${outH}" width="${outW}" height="${outH}">
  <defs>
    <clipPath id="rounded">
      <rect width="${outW}" height="${outH}" rx="24" ry="24" />
    </clipPath>
  </defs>
  <rect width="${outW}" height="${outH}" rx="24" ry="24" fill="#D2FE00"/>
  <image width="${outW}" height="${outH}" xlink:href="data:image/png;base64,${b64}" clip-path="url(#rounded)"/>
</svg>`;
fs.writeFileSync('public/favicon.svg', svg);
if (fs.existsSync('dist')) {
  fs.writeFileSync('dist/favicon.svg', svg);
}

console.log('Successfully generated clean logo with ZERO black corners!');
console.log('File sizes -> logo.png:', finalPng.length, 'favicon.ico:', finalIco.length, 'favicon.svg:', svg.length);
