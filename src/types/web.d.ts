// Tipos para archivos .web.ts que usan APIs del navegador
// Estos tipos solo se aplican en el contexto web

/// <reference lib="dom" />

declare global {
  interface Navigator {
    clipboard?: {
      writeText(text: string): Promise<void>;
      readText(): Promise<string>;
    };
  }
}

export {};
