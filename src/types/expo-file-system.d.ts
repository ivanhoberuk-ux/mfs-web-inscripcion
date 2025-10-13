// Declaraciones de tipos para expo-file-system
// Compatibilidad con diferentes versiones de la API

declare module 'expo-file-system' {
  export const cacheDirectory: string | null;
  export const documentDirectory: string | null;
  
  export enum EncodingType {
    UTF8 = 'utf8',
    Base64 = 'base64',
  }
  
  export enum FileSystemUploadType {
    BINARY_CONTENT = 0,
    MULTIPART = 1,
  }
  
  export interface FileSystemUploadOptions {
    httpMethod?: 'POST' | 'PUT' | 'PATCH';
    uploadType?: FileSystemUploadType;
    headers?: Record<string, string>;
    parameters?: Record<string, string>;
  }
  
  export interface WriteOptions {
    encoding?: EncodingType | string;
  }
  
  export function writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: WriteOptions
  ): Promise<void>;
  
  export function uploadAsync(
    url: string,
    fileUri: string,
    options?: FileSystemUploadOptions
  ): Promise<{ status: number; headers: Record<string, string>; body: string }>;
  
  export function readAsStringAsync(
    fileUri: string,
    options?: { encoding?: EncodingType | string }
  ): Promise<string>;
  
  export function deleteAsync(fileUri: string, options?: { idempotent?: boolean }): Promise<void>;
  
  export function getInfoAsync(
    fileUri: string,
    options?: { md5?: boolean; size?: boolean }
  ): Promise<{ exists: boolean; isDirectory?: boolean; uri?: string; size?: number; md5?: string }>;
  
  export function downloadAsync(
    url: string,
    fileUri: string,
    options?: { md5?: boolean; cache?: boolean }
  ): Promise<{ uri: string; status: number; headers: Record<string, string>; md5?: string }>;
}
