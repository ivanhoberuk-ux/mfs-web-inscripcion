// FILE: src/lib/sharing.ts
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

/**
 * Comparte un archivo existente referenciado por URI local (file://) o remoto (https://).
 * En nativo usa expo-sharing; si recibe un Blob, primero lo guarda temporalmente.
 */
export async function shareOrDownload(
  input: string | Blob,
  filename = 'archivo'
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Esta implementación no corre en web (usa sharing.web.ts).');
  }

  let fileUri = '';
  if (typeof input === 'string') {
    // Si es http(s) lo descargamos a tmp; si ya es file:// lo usamos directo
    if (input.startsWith('http')) {
      const tmp = FileSystem.cacheDirectory + filename;
      const res = await FileSystem.downloadAsync(input, tmp);
      fileUri = res.uri;
    } else {
      fileUri = input;
    }
  } else {
    // Blob: guardar a tmp
    const tmp = FileSystem.cacheDirectory + filename;
    const buffer = await input.arrayBuffer();
    await FileSystem.writeAsStringAsync(tmp, Buffer.from(buffer).toString('base64'), {
      encoding: FileSystem.EncodingType.Base64,
    });
    fileUri = tmp;
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }
  await Sharing.shareAsync(fileUri, {
    dialogTitle: filename,
    mimeType: guessMime(filename),
    UTI: undefined,
  });
}

function guessMime(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}
