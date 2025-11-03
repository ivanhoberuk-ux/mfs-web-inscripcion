// Validation schemas using zod for form inputs
import { z } from 'zod';

// Helper to normalize phone numbers (remove non-digits except +)
export const normalizePhone = (v: string) => v.replace(/[^\d+]/g, '');

// Helper to normalize CI (remove non-digits)
export const normalizeCi = (v: string) => v.replace(/[^\d]/g, '');

// Helper to normalize email
export const normalizeEmail = (v: string) => v.trim().toLowerCase();

// Registration form schema
export const registrationSchema = z.object({
  puebloId: z.string().uuid('Elegí un pueblo válido'),
  nombres: z.string()
    .trim()
    .min(1, 'Completá nombres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  apellidos: z.string()
    .trim()
    .min(1, 'Completá apellidos')
    .max(100, 'El apellido no puede exceder 100 caracteres'),
  ci: z.string()
    .trim()
    .min(5, 'La cédula debe tener al menos 5 dígitos')
    .max(20, 'La cédula no puede exceder 20 caracteres')
    .refine((val) => normalizeCi(val).length >= 5, 'Cédula demasiado corta'),
  nacimiento: z.string()
    .trim()
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Usá formato DD-MM-AAAA'),
  email: z.string()
    .trim()
    .email('Email inválido')
    .max(255, 'El email no puede exceder 255 caracteres'),
  telefono: z.string()
    .trim()
    .min(1, 'Completá teléfono')
    .max(30, 'El teléfono no puede exceder 30 caracteres'),
  direccion: z.string()
    .trim()
    .min(1, 'Completá dirección')
    .max(500, 'La dirección no puede exceder 500 caracteres'),
  emNombre: z.string()
    .trim()
    .min(1, 'Completá nombre de emergencia')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  emTelefono: z.string()
    .trim()
    .min(1, 'Completá teléfono de emergencia')
    .max(30, 'El teléfono no puede exceder 30 caracteres'),
  rol: z.union([z.literal('Misionero'), z.literal('Tio')]),
  esJefe: z.boolean(),
  tratamiento: z.boolean(),
  tratamientoDetalle: z.string()
    .max(500, 'El detalle no puede exceder 500 caracteres')
    .optional(),
  alimento: z.boolean(),
  alimentoDetalle: z.string()
    .max(500, 'El detalle no puede exceder 500 caracteres')
    .optional(),
  padreNombre: z.string()
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),
  padreTelefono: z.string()
    .max(30, 'El teléfono no puede exceder 30 caracteres')
    .optional(),
  madreNombre: z.string()
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),
  madreTelefono: z.string()
    .max(30, 'El teléfono no puede exceder 30 caracteres')
    .optional(),
  acepta: z.boolean().refine((val) => val === true, 'Debés aceptar los términos y protocolos'),
}).refine((data) => {
  // If tratamiento is true, tratamientoDetalle is required
  if (data.tratamiento && !data.tratamientoDetalle?.trim()) {
    return false;
  }
  return true;
}, {
  message: 'Especificá el tratamiento/medicación',
  path: ['tratamientoDetalle'],
}).refine((data) => {
  // If alimento is true, alimentoDetalle is required
  if (data.alimento && !data.alimentoDetalle?.trim()) {
    return false;
  }
  return true;
}, {
  message: 'Especificá la alimentación especial',
  path: ['alimentoDetalle'],
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;
