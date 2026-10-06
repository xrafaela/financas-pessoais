// One-shot: gera ícones PNG (192 e 512) com um euro estilizado.
// Uso: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Desenha num canvas RGBA por pixel (anti-aliasing simples por sobreamostragem 3x3).
function renderIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const S = 3; // sobreamostragem
  const put = (x, y, r, g, b, a) => {
    const i = (y * size + x) * 4;
    const inv = 255 - a;
    px[i] = (r * a + px[i] * inv) / 255;
    px[i + 1] = (g * a + px[i + 1] * inv) / 255;
    px[i + 2] = (b * a + px[i + 2] * inv) / 255;
    px[i + 3] = Math.max(px[i + 3], a);
  };
  // Fundo arredondado teal
  const radius = size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const fx = x + (sx + 0.5) / S;
          const fy = y + (sy + 0.5) / S;
          const cx = Math.max(radius, Math.min(size - radius, fx));
          const cy = Math.max(radius, Math.min(size - radius, fy));
          const dx = fx - cx;
          const dy = fy - cy;
          if (dx * dx + dy * dy <= radius * radius) inside++;
        }
      }
      if (inside > 0) put(x, y, 15, 118, 110, Math.round((inside / (S * S)) * 255));
    }
  }
  // Símbolo € branco: círculo + barra horizontal + duas hastes.
  const cxp = size / 2;
  const cyp = size / 2;
  const rOuter = size * 0.26;
  const stroke = size * 0.085;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const fx = x + (sx + 0.5) / S;
          const fy = y + (sy + 0.5) / S;
          const d = Math.sqrt((fx - cxp) ** 2 + (fy - cyp) ** 2);
          const inRing = Math.abs(d - rOuter) <= stroke / 2;
          const inBar = Math.abs(fy - cyp) <= stroke / 2 && fx >= cxp - rOuter - stroke * 0.9 && fx <= cxp + rOuter * 0.55;
          const inTop = Math.abs((fy - cyp) - -rOuter * 0.45) <= stroke / 2 && fx >= cxp - rOuter - stroke * 0.75 && fx <= cxp + rOuter * 0.5;
          const inBot = Math.abs((fy - cyp) - rOuter * 0.45) <= stroke / 2 && fx >= cxp - rOuter - stroke * 0.75 && fx <= cxp + rOuter * 0.5;
          if (inRing || inBar || inTop || inBot) inside++;
        }
      }
      if (inside > 0) put(x, y, 255, 255, 255, Math.round((inside / (S * S)) * 255));
    }
  }
  return px;
}

function png(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const px = renderIcon(size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtro none
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', png(192));
writeFileSync('public/icon-512.png', png(512));
console.log('Ícones gerados: public/icon-192.png, public/icon-512.png');
