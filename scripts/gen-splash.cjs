// Generates a solid brand-colour splash PNG (no native image deps) and writes
// it to every Capacitor splash.png location. Run: node scripts/gen-splash.cjs
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 1080;
const COLOR = [0x4f, 0x46, 0xe5]; // #4F46E5 indigo

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function solidPng(size, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour (RGB)

  const row = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const png = solidPng(SIZE, COLOR);
const resDir = path.join(__dirname, "..", "android", "app", "src", "main", "res");
let count = 0;
for (const dir of fs.readdirSync(resDir)) {
  const target = path.join(resDir, dir, "splash.png");
  if (fs.existsSync(target)) {
    fs.writeFileSync(target, png);
    count++;
  }
}
console.log(`Wrote branded splash.png to ${count} resource folders (${png.length} bytes each).`);
