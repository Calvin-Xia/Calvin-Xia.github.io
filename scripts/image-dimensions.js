// Zero-dependency dimension probing for the image formats the publish
// pipeline uploads (see content-types.js). Formats without a fixed-size
// header (SVG) or a complex box layout (AVIF/HEIC) return null — callers
// must skip dimension injection for those.
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const JPEG_SOF_MARKERS = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
const SUPPORTED_EXTENSIONS = new Set(['png', 'apng', 'jpg', 'jpeg', 'webp', 'gif']);

function readUInt16BE(bytes, offset) {
    return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUInt16LE(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUInt24LE(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function pngDimensions(bytes) {
    if (bytes.length < 24) {
        return null;
    }
    const width = bytes.readUInt32BE ? bytes.readUInt32BE(16) : (bytes[16] << 24 | bytes[17] << 16 | bytes[18] << 8 | bytes[19]);
    const height = bytes.readUInt32BE ? bytes.readUInt32BE(20) : (bytes[20] << 24 | bytes[21] << 16 | bytes[22] << 8 | bytes[23]);
    return width > 0 && height > 0 ? { width, height } : null;
}

function jpegDimensions(bytes) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) {
            offset += 1;
            continue;
        }
        let marker = bytes[offset + 1];
        while (marker === 0xff && offset + 2 < bytes.length) {
            offset += 1;
            marker = bytes[offset + 1];
        }
        if (JPEG_SOF_MARKERS.has(marker)) {
            const height = readUInt16BE(bytes, offset + 5);
            const width = readUInt16BE(bytes, offset + 7);
            return width > 0 && height > 0 ? { width, height } : null;
        }
        if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
            offset += 2;
            continue;
        }
        const segmentLength = readUInt16BE(bytes, offset + 2);
        if (segmentLength < 2) {
            return null;
        }
        offset += 2 + segmentLength;
    }
    return null;
}

function webpDimensions(bytes) {
    if (bytes.length < 25) {
        return null;
    }
    const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

    if (chunk === 'VP8 ') {
        if (bytes.length < 30 || bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
            return null;
        }
        const width = readUInt16LE(bytes, 26) & 0x3fff;
        const height = readUInt16LE(bytes, 28) & 0x3fff;
        return width > 0 && height > 0 ? { width, height } : null;
    }

    if (chunk === 'VP8L') {
        if (bytes[20] !== 0x2f) {
            return null;
        }
        const bits = readUInt16LE(bytes, 21) | (readUInt16LE(bytes, 23) << 16);
        const width = (bits & 0x3fff) + 1;
        const height = ((bits >> 14) & 0x3fff) + 1;
        return width > 0 && height > 0 ? { width, height } : null;
    }

    if (chunk === 'VP8X') {
        if (bytes.length < 30) {
            return null;
        }
        const width = readUInt24LE(bytes, 24) + 1;
        const height = readUInt24LE(bytes, 27) + 1;
        return width > 0 && height > 0 ? { width, height } : null;
    }

    return null;
}

function gifDimensions(bytes) {
    if (bytes.length < 10) {
        return null;
    }
    const width = readUInt16LE(bytes, 6);
    const height = readUInt16LE(bytes, 8);
    return width > 0 && height > 0 ? { width, height } : null;
}

export function getImageDimensions(bytes) {
    if (!bytes || bytes.length < 10) {
        return null;
    }

    const hasSignature = (offset, signature) => signature.every((byte, index) => bytes[offset + index] === byte);

    if (hasSignature(0, PNG_SIGNATURE)) {
        return pngDimensions(bytes);
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        return jpegDimensions(bytes);
    }
    if (hasSignature(0, [0x52, 0x49, 0x46, 0x46]) && hasSignature(8, [0x57, 0x45, 0x42, 0x50])) {
        return webpDimensions(bytes);
    }
    if (hasSignature(0, [0x47, 0x49, 0x46])) {
        return gifDimensions(bytes);
    }
    return null;
}

export function isSupportedImage(filePath) {
    const extension = String(filePath || '').split('.').pop().toLowerCase();
    return SUPPORTED_EXTENSIONS.has(extension);
}

export async function probeImageFile(filePath) {
    if (!isSupportedImage(filePath)) {
        return null;
    }

    const { open } = await import('node:fs/promises');
    const handle = await open(filePath, 'r');
    try {
        const buffer = Buffer.alloc(262144);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        return getImageDimensions(buffer.subarray(0, bytesRead));
    } finally {
        await handle.close();
    }
}
