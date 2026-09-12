import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';
import { getImageDimensions, isSupportedImage, probeImageFile } from '../scripts/image-dimensions.js';

const tempDirs = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function pngBuffer(width, height) {
    const bytes = [
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        (width >>> 24) & 0xff, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff,
        (height >>> 24) & 0xff, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff,
    ];
    return Buffer.from(bytes);
}

function jpegBuffer(width, height) {
    return Buffer.from([
        0xff, 0xd8,
        0xff, 0xc0, 0x00, 0x11, 0x08,
        (height >> 8) & 0xff, height & 0xff,
        (width >> 8) & 0xff, width & 0xff,
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
}

function riffChunk(chunkName, payload) {
    const size = Buffer.alloc(4);
    size.writeUInt32LE(payload.length, 0);
    return Buffer.concat([Buffer.from(chunkName, 'ascii'), size, payload]);
}

function webpVp8Buffer(width, height) {
    const frame = Buffer.concat([
        Buffer.from([0x30, 0x01, 0x00]),
        Buffer.from([0x9d, 0x01, 0x2a]),
        (() => { const b = Buffer.alloc(4); b.writeUInt16LE(width, 0); return b.subarray(0, 2); })(),
        (() => { const b = Buffer.alloc(4); b.writeUInt16LE(height, 0); return b.subarray(0, 2); })(),
    ]);
    return Buffer.concat([
        Buffer.from('RIFF', 'ascii'),
        (() => { const b = Buffer.alloc(4); b.writeUInt32LE(4 + 8 + frame.length, 0); return b; })(),
        Buffer.from('WEBP', 'ascii'),
        riffChunk('VP8 ', frame),
    ]);
}

function webpVp8lBuffer(width, height) {
    const bits = Buffer.alloc(4);
    const value = (width - 1) | ((height - 1) << 14);
    bits.writeUInt32LE(value, 0);
    return Buffer.concat([
        Buffer.from('RIFF', 'ascii'),
        (() => { const b = Buffer.alloc(4); b.writeUInt32LE(4 + 8 + 5, 0); return b; })(),
        Buffer.from('WEBP', 'ascii'),
        riffChunk('VP8L', Buffer.concat([Buffer.from([0x2f]), bits])),
    ]);
}

function webpVp8xBuffer(width, height) {
    const payload = Buffer.alloc(10);
    payload.writeUIntLE(width - 1, 4, 3);
    payload.writeUIntLE(height - 1, 7, 3);
    return Buffer.concat([
        Buffer.from('RIFF', 'ascii'),
        (() => { const b = Buffer.alloc(4); b.writeUInt32LE(4 + 8 + payload.length, 0); return b; })(),
        Buffer.from('WEBP', 'ascii'),
        riffChunk('VP8X', payload),
    ]);
}

function gifBuffer(width, height) {
    const b = Buffer.alloc(10);
    Buffer.from('GIF89a', 'ascii').copy(b, 0);
    b.writeUInt16LE(width, 6);
    b.writeUInt16LE(height, 8);
    return b;
}

describe('image dimension probing', () => {
    test('parses PNG, JPEG, WebP (VP8/VP8L/VP8X) and GIF headers', () => {
        assert.deepEqual(getImageDimensions(pngBuffer(320, 240)), { width: 320, height: 240 });
        assert.deepEqual(getImageDimensions(jpegBuffer(320, 120)), { width: 320, height: 120 });
        assert.deepEqual(getImageDimensions(webpVp8Buffer(100, 50)), { width: 100, height: 50 });
        assert.deepEqual(getImageDimensions(webpVp8lBuffer(100, 50)), { width: 100, height: 50 });
        assert.deepEqual(getImageDimensions(webpVp8xBuffer(64, 32)), { width: 64, height: 32 });
        assert.deepEqual(getImageDimensions(gifBuffer(88, 31)), { width: 88, height: 31 });
    });

    test('returns null for unknown, truncated and empty inputs', () => {
        assert.equal(getImageDimensions(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])), null);
        assert.equal(getImageDimensions(pngBuffer(320, 240).subarray(0, 10)), null);
        assert.equal(getImageDimensions(Buffer.alloc(0)), null);
        assert.equal(getImageDimensions(null), null);
    });

    test('filters supported upload formats by extension', () => {
        assert.equal(isSupportedImage('a.PNG'), true);
        assert.equal(isSupportedImage('b.jpeg'), true);
        assert.equal(isSupportedImage('c.webp'), true);
        assert.equal(isSupportedImage('d.avif'), false);
        assert.equal(isSupportedImage('e.svg'), false);
        assert.equal(isSupportedImage('f.pdf'), false);
    });

    test('probeImageFile reads dimensions from disk and skips unsupported files', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'image-dims-'));
        tempDirs.push(dir);
        const pngPath = path.join(dir, 'cover.png');
        await writeFile(pngPath, pngBuffer(640, 480));

        assert.deepEqual(await probeImageFile(pngPath), { width: 640, height: 480 });
        assert.equal(await probeImageFile(path.join(dir, 'doc.avif')), null);
    });
});
