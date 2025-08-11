export function isBinaryContentType(contentType: string): boolean {
  const binaryTypes = [
    'application/octet-stream',
    'application/pdf',
    'image/',
    'audio/',
    'video/',
    'application/zip',
    'application/x-zip-compressed',
    'application/gzip',
    'application/x-gzip',
    'application/x-bzip2',
    'application/x-tar',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/vnd.openxmlformats-officedocument',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/msword',
    'application/x-shockwave-flash',
    'application/x-font-',
    'font/',
    'application/x-font-ttf',
  ];

  return binaryTypes.some((type) => contentType.startsWith(type));
}
