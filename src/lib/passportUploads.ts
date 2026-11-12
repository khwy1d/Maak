export type PassportUpload = { file: File };

const uploads = new Map<string, PassportUpload[]>();
const uploadTokens = new Map<string, string>();

export function registerPassportFiles(key: string, files: Array<File | null>) {
  uploads.set(key, files.filter((file): file is File => file instanceof File).map(file => ({ file })));
}

export function getOrCreatePassportUploadToken(key: string) {
  if (!key) return crypto.randomUUID();
  const existing = uploadTokens.get(key);
  if (existing) return existing;
  const token = crypto.randomUUID();
  uploadTokens.set(key, token);
  return token;
}

export function getPassportFiles(key: string) {
  return uploads.get(key)?.map(item => item.file) ?? [];
}

export function clearPassportFiles(key: string) {
  uploads.delete(key);
  uploadTokens.delete(key);
}
