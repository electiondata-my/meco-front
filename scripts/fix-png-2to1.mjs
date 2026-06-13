import fs from "node:fs";
import zlib from "node:zlib";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/fix-png-2to1.mjs <png> [png...]");
  process.exit(1);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = new Uint32Array(256);

for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  return pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
}

function parsePng(file) {
  const input = fs.readFileSync(file);
  if (!input.subarray(0, 8).equals(sig)) throw new Error(`${file}: not a PNG`);

  const chunks = [];
  let offset = 8;
  while (offset < input.length) {
    const len = input.readUInt32BE(offset);
    offset += 4;
    const type = input.subarray(offset, offset + 4).toString("ascii");
    offset += 4;
    const data = input.subarray(offset, offset + len);
    offset += len + 4;
    chunks.push({ type, data });
    if (type === "IEND") break;
  }

  const ihdr = chunks.find((c) => c.type === "IHDR")?.data;
  if (!ihdr) throw new Error(`${file}: missing IHDR`);

  return {
    ihdr,
    width: ihdr.readUInt32BE(0),
    height: ihdr.readUInt32BE(4),
    bitDepth: ihdr[8],
    colorType: ihdr[9],
    plte: chunks.find((c) => c.type === "PLTE")?.data,
    trns: chunks.find((c) => c.type === "tRNS")?.data,
    raw: zlib.inflateSync(Buffer.concat(chunks.filter((c) => c.type === "IDAT").map((c) => c.data))),
  };
}

function unfilterRows(source) {
  const channels = source.colorType === 6 ? 4 : source.colorType === 2 ? 3 : 1;
  const rowBytes =
    source.colorType === 3
      ? Math.ceil((source.width * source.bitDepth) / 8)
      : Math.ceil((source.width * source.bitDepth * channels) / 8);
  const bpp = Math.max(1, Math.ceil((source.bitDepth * channels) / 8));
  const rows = [];
  let p = 0;
  let prev = Buffer.alloc(rowBytes);

  for (let y = 0; y < source.height; y++) {
    const filter = source.raw[p++];
    const row = Buffer.from(source.raw.subarray(p, p + rowBytes));
    p += rowBytes;

    for (let i = 0; i < rowBytes; i++) {
      const left = i >= bpp ? row[i - bpp] : 0;
      const up = prev[i] ?? 0;
      const upLeft = i >= bpp ? prev[i - bpp] : 0;
      if (filter === 1) row[i] = (row[i] + left) & 255;
      else if (filter === 2) row[i] = (row[i] + up) & 255;
      else if (filter === 3) row[i] = (row[i] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) row[i] = (row[i] + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
    }

    rows.push(row);
    prev = row;
  }

  return rows;
}

function indexedAt(row, x, bitDepth) {
  if (bitDepth === 8) return row[x];
  const perByte = 8 / bitDepth;
  const byte = row[Math.floor(x / perByte)];
  const shift = 8 - bitDepth - (x % perByte) * bitDepth;
  return (byte >> shift) & ((1 << bitDepth) - 1);
}

function rgbaAt(source, row, x) {
  if (source.colorType === 3) {
    const index = indexedAt(row, x, source.bitDepth);
    const i = index * 3;
    return [source.plte[i], source.plte[i + 1], source.plte[i + 2], source.trns?.[index] ?? 255];
  }
  if (source.colorType === 6 && source.bitDepth === 8) {
    const i = x * 4;
    return [row[i], row[i + 1], row[i + 2], row[i + 3]];
  }
  if (source.colorType === 2 && source.bitDepth === 8) {
    const i = x * 3;
    return [row[i], row[i + 1], row[i + 2], 255];
  }
  throw new Error(`Unsupported PNG format colorType=${source.colorType} bitDepth=${source.bitDepth}`);
}

function writeRgbaPng(file, source, rows, targetWidth, leftPad, leftCrop) {
  const outRows = [];

  for (const row of rows) {
    const out = Buffer.alloc(1 + targetWidth * 4);
    out[0] = 0;
    for (let x = 0; x < targetWidth; x++) {
      const sx =
        leftCrop > 0
          ? x + leftCrop
          : x < leftPad
            ? 0
            : x >= leftPad + source.width
              ? source.width - 1
              : x - leftPad;
      const [r, g, b, a] = rgbaAt(source, row, sx);
      const j = 1 + x * 4;
      out[j] = r;
      out[j + 1] = g;
      out[j + 2] = b;
      out[j + 3] = a;
    }
    outRows.push(out);
  }

  const ihdr = Buffer.from(source.ihdr);
  ihdr.writeUInt32BE(targetWidth, 0);
  ihdr.writeUInt32BE(source.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  fs.writeFileSync(
    file,
    Buffer.concat([
      sig,
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(Buffer.concat(outRows), { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

for (const file of files) {
  const source = parsePng(file);
  const targetWidth = source.height * 2;
  if (source.width === targetWidth) {
    console.log(`${file}: already ${source.width}x${source.height}`);
    continue;
  }

  const rows = unfilterRows(source);
  if (source.width < targetWidth) {
    const totalPad = targetWidth - source.width;
    const leftPad = Math.floor(totalPad / 2);
    const rightPad = totalPad - leftPad;
    writeRgbaPng(file, source, rows, targetWidth, leftPad, 0);
    console.log(`${file}: ${source.width}x${source.height} -> ${targetWidth}x${source.height}, padded ${leftPad}px left and ${rightPad}px right`);
    continue;
  }

  if (source.width === targetWidth + 1) {
    writeRgbaPng(file, source, rows, targetWidth, 0, 0);
    console.log(`${file}: ${source.width}x${source.height} -> ${targetWidth}x${source.height}, cropped 1px from right edge`);
    continue;
  }

  throw new Error(`${file}: width ${source.width} is wider than target ${targetWidth}; ask before choosing a crop`);
}
