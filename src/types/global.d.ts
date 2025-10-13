// Declaraciones de tipos globales para el proyecto híbrido React Native + Web

// Tipos para módulos sin declaraciones
declare module 'react-signature-canvas' {
  import { Component } from 'react';
  
  export interface ReactSignatureCanvasProps {
    ref?: any;
    backgroundColor?: string;
    penColor?: string;
    canvasProps?: any;
  }
  
  export default class SignatureCanvas extends Component<ReactSignatureCanvasProps> {
    clear(): void;
    getTrimmedCanvas(): HTMLCanvasElement | null;
  }
}

declare module 'pdf-lib/dist/pdf-lib.js' {
  export * from 'pdf-lib';
}

// Extender BlobPropertyBag para que lastModified sea opcional
declare global {
  interface BlobPropertyBag {
    lastModified?: number;
  }
}

export {};
