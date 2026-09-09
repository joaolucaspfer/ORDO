import { File, Paths } from 'expo-file-system';

const PHOTO_NAME = 'profile_photo';

export async function persistProfilePhoto(sourceUri: string): Promise<string | null> {
  try {
    const ext = (sourceUri.split('.').pop() ?? '').split('?')[0].toLowerCase();
    const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'jpg';
    const dest = new File(Paths.document, `${PHOTO_NAME}.${safeExt}`);
    if (dest.exists) {
      dest.delete();
    }
    const src = new File(sourceUri);
    if (!src.exists) {
      return null;
    }
    src.copy(dest);
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