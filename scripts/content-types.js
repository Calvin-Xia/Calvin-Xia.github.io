import path from 'node:path';

const CONTENT_TYPES = new Map([
    ['.apng', 'image/apng'],
    ['.avif', 'image/avif'],
    ['.bmp', 'image/bmp'],
    ['.gif', 'image/gif'],
    ['.heic', 'image/heic'],
    ['.heif', 'image/heif'],
    ['.ico', 'image/x-icon'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.svg', 'image/svg+xml'],
    ['.tif', 'image/tiff'],
    ['.tiff', 'image/tiff'],
    ['.webp', 'image/webp'],
    ['.pdf', 'application/pdf'],
]);

export function getContentType(filePath) {
    return CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
}
