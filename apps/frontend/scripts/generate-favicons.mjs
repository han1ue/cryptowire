import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const projectRoot = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(projectRoot, "public");

const background = { r: 0x0b, g: 0x0f, b: 0x14, a: 0xff };
const stroke = { r: 0x00, g: 0xff, b: 0x88, a: 0xff };

function clampInt(value, min, max) {
    return Math.max(min, Math.min(max, value | 0));
}

function fillImage(image, color) {
    for (let i = 0; i < image.length; i += 4) {
        image[i + 0] = color.r;
        image[i + 1] = color.g;
        image[i + 2] = color.b;
        image[i + 3] = color.a;
    }
}

function setPixel(image, width, height, x, y, color) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    image[i + 0] = color.r;
    image[i + 1] = color.g;
    image[i + 2] = color.b;
    image[i + 3] = color.a;
}

function drawDisc(image, width, height, cx, cy, radius, color) {
    const r2 = radius * radius;
    const minX = clampInt(Math.floor(cx - radius), 0, width - 1);
    const maxX = clampInt(Math.ceil(cx + radius), 0, width - 1);
    const minY = clampInt(Math.floor(cy - radius), 0, height - 1);
    const maxY = clampInt(Math.ceil(cy + radius), 0, height - 1);

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            if (dx * dx + dy * dy <= r2) setPixel(image, width, height, x, y, color);
        }
    }
}

function drawThickLine(image, width, height, x0, y0, x1, y1, thickness, color) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 4;
    const radius = thickness / 2;

    for (let s = 0; s <= steps; s++) {
        const t = steps === 0 ? 0 : s / steps;
        const x = x0 + dx * t;
        const y = y0 + dy * t;
        drawDisc(image, width, height, x, y, radius, color);
    }
}

function crc32(buf) {
    // Standard CRC32 (IEEE 802.3)
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            const mask = -(crc & 1);
            crc = (crc >>> 1) ^ (0xedb88320 & mask);
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
    const typeBuf = Buffer.from(type, "ascii");
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePngRgba(width, height, rgbaBytes) {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr.writeUInt8(8, 8); // bit depth
    ihdr.writeUInt8(6, 9); // color type RGBA
    ihdr.writeUInt8(0, 10); // compression
    ihdr.writeUInt8(0, 11); // filter
    ihdr.writeUInt8(0, 12); // interlace

    // Add filter byte (0) per scanline
    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[(stride + 1) * y] = 0;
        rgbaBytes.copy(raw, (stride + 1) * y + 1, y * stride, y * stride + stride);
    }

    const compressed = zlib.deflateSync(raw, { level: 9 });
    const idat = compressed;
    const iend = Buffer.alloc(0);

    return Buffer.concat([
        signature,
        pngChunk("IHDR", ihdr),
        pngChunk("IDAT", idat),
        pngChunk("IEND", iend),
    ]);
}

function renderFavicon(size) {
    const width = size;
    const height = size;
    const image = Buffer.alloc(width * height * 4, 0);
    fillImage(image, background);

    // Recreate apps/frontend/public/favicon.svg:
    // viewBox 0 0 24 24
    // rect width="24" height="24" fill="#0b0f14"
    // polyline points="5.28 16.2 10.32 11.16 5.28 6.12"
    // line x1="12" y1="17.88" x2="18.72" y2="17.88"
    const scale = size / 24;
    const thickness = Math.max(2, Math.round(2 * scale));

    const p1 = { x: 5.28 * scale, y: 16.2 * scale };
    const p2 = { x: 10.32 * scale, y: 11.16 * scale };
    const p3 = { x: 5.28 * scale, y: 6.12 * scale };

    drawThickLine(image, width, height, p1.x, p1.y, p2.x, p2.y, thickness, stroke);
    drawThickLine(image, width, height, p2.x, p2.y, p3.x, p3.y, thickness, stroke);

    const l1 = { x: 12 * scale, y: 17.88 * scale };
    const l2 = { x: 18.72 * scale, y: 17.88 * scale };
    drawThickLine(image, width, height, l1.x, l1.y, l2.x, l2.y, thickness, stroke);

    return makePngRgba(width, height, image);
}

function makeIco(entries) {
    // ICO format: ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes each) + image data
    const count = entries.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // type = icon
    header.writeUInt16LE(count, 4);

    const dir = Buffer.alloc(count * 16);
    let offset = 6 + count * 16;

    const imageBlobs = [];

    for (let i = 0; i < count; i++) {
        const { size, png } = entries[i];
        const w = size >= 256 ? 0 : size;
        const h = size >= 256 ? 0 : size;

        dir.writeUInt8(w, i * 16 + 0);
        dir.writeUInt8(h, i * 16 + 1);
        dir.writeUInt8(0, i * 16 + 2); // color count
        dir.writeUInt8(0, i * 16 + 3); // reserved
        dir.writeUInt16LE(1, i * 16 + 4); // planes
        dir.writeUInt16LE(32, i * 16 + 6); // bit count
        dir.writeUInt32LE(png.length, i * 16 + 8); // bytes
        dir.writeUInt32LE(offset, i * 16 + 12); // offset

        imageBlobs.push(png);
        offset += png.length;
    }

    return Buffer.concat([header, dir, ...imageBlobs]);
}

fs.mkdirSync(publicDir, { recursive: true });

const icoSizes = [16, 32, 48];
const extraSizes = [96, 180, 192, 512];
const sizes = [...icoSizes, ...extraSizes];
const pngs = sizes.map((size) => ({ size, png: renderFavicon(size) }));

for (const { size, png } of pngs) {
    fs.writeFileSync(path.join(publicDir, `favicon-${size}.png`), png);
}

// Primary PNG used by Google-recommended 48x48+ surfaces
fs.writeFileSync(path.join(publicDir, "favicon.png"), pngs.find((p) => p.size === 48).png);

// iOS / Android / PWA icon conventions
fs.writeFileSync(
    path.join(publicDir, "apple-touch-icon.png"),
    pngs.find((p) => p.size === 180).png,
);
fs.writeFileSync(
    path.join(publicDir, "android-chrome-192x192.png"),
    pngs.find((p) => p.size === 192).png,
);
fs.writeFileSync(
    path.join(publicDir, "android-chrome-512x512.png"),
    pngs.find((p) => p.size === 512).png,
);

const ico = makeIco(icoSizes.map((size) => pngs.find((p) => p.size === size)));
fs.writeFileSync(path.join(publicDir, "favicon.ico"), ico);

const manifest = {
    name: "cryptowi.re",
    short_name: "cryptowi.re",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    icons: [
        {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
        },
        {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
        },
    ],
};
fs.writeFileSync(path.join(publicDir, "site.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");

console.log("Generated:", [
    ...sizes.map((s) => `public/favicon-${s}.png`),
    "public/favicon.png",
    "public/apple-touch-icon.png",
    "public/android-chrome-192x192.png",
    "public/android-chrome-512x512.png",
    "public/favicon.ico",
    "public/site.webmanifest",
].join(", "));
