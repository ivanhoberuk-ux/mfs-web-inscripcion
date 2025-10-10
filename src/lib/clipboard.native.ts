import * as Clipboard from 'expo-clipboard';

export async function copyText(text: string) {
  await Clipboard.setStringAsync(text);
}
