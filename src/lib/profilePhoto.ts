import { File, Paths, Directory } from 'expo-file-system';

const PHOTO_PREFIX = 'profile_photo';

export async function clearProfilePhotos(): Promise<void> {
  try {
    const dir = new Directory(Paths.document);
    if (!dir.exists) {
      return;
    }
    const contents = dir.list();
    for (const item of contents) {
      if (item instanceof File && item.name.startsWith(PHOTO_PREFIX)) {
        item.delete();
      }
    }
  } catch {
    // ignore
  }
}

export async function persistProfilePhoto(sourceUri: string): Promise<string | null> {
  try {
    const ext = (sourceUri.split('.').pop() ?? '').split('?')[0].toLowerCase();
    const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'jpg';
    const src = new File(sourceUri);
    if (!src.exists) {
      return null;
    }
    await clearProfilePhotos();
    const dest = new File(Paths.document, `${PHOTO_PREFIX}_${Date.now()}.${safeExt}`);
    await src.copy(dest);
    return dest.uri;
  } catch {
    return null;
  }
}

export async function deleteProfilePhoto(uri: string | null): Promise<void> {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // ignore
  }
}