// Archivo multiplataforma para SignaturePad
import { Platform } from 'react-native';

let SignaturePad: any;

if (Platform.OS === 'web') {
  SignaturePad = require('./SignaturePad.web').default;
} else {
  SignaturePad = require('./SignaturePad.native').default;
}

export default SignaturePad;
export type { SignaturePadHandle } from './SignaturePad.native';
