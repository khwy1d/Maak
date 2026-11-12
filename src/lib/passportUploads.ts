export type PassportUpload = { file: File };

const uploads = new Map<string, PassportUpload[]>();

export function registerPassportFiles(key: string, files: Array<File | null>) {
  uploads.set(key, files.filter((file): file is File => file instanceof File).map(file => ({ file })));
}

export function getPassportFiles(key: string) {
  return uploads.get(key)?.map(item => item.file) ?? [];
}

export function clearPassportFiles(key: string) {
  uploads.delete(key);
}
