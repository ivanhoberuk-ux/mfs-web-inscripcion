// Nativo: expo-image-manipulator (lado máx 1600px, JPEG 0.7).
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';

export type Compressed = { uri: string; ext: 'jpg' | 'png' };
const MAX = 1600;

function getSize(uri: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => Image.getSize(uri, (w, h) => resolve({ w, h }), reject));
}

export async function compressImage(uri: string, opts: { keepPng?: boolean } = {}): Promise<Compressed | null> {
  try {
    const { w, h } = await getSize(uri);
    const big = Math.max(w, h) > MAX;
    if (opts.keepPng && !big) return null;
    const actions = big ? [{ resize: w >= h ? { width: MAX } : { height: MAX } }] : [];
    const res = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: 0.7,
      format: opts.keepPng ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG,
    });
    return { uri: res.uri, ext: opts.keepPng ? 'png' : 'jpg' };
  } catch (e) {
    console.warn('compressImage nativo falló, se sube original', e);
    return null;
  }
}

export function isImageName(name: string) {
  return /\.(jpe?g|png|heic|heif|webp)$/i.test(name) || /^data:image\//.test(name);
}
