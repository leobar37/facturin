import { z } from 'zod';

export const createTenantSchema = z.object({
  ruc: z.string().length(11, 'El RUC debe tener 11 dígitos'),
  razonSocial: z.string().min(1, 'La razón social es requerida'),
  nombreComercial: z.string().optional(),
  direccion: z.object({
    direccion: z.string().optional(),
    departamento: z.string().optional(),
    provincia: z.string().optional(),
    distrito: z.string().optional(),
    ubigeo: z.string().optional(),
  }).optional(),
  contactoEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  contactoPhone: z.string().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const uploadCertificateSchema = z.object({
  certificate: z.string().min(1, 'El certificado es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export type UploadCertificateInput = z.infer<typeof uploadCertificateSchema>;

export const updateSunatCredentialsSchema = z.object({
  username: z.string().min(1, 'El usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export type UpdateSunatCredentialsInput = z.infer<typeof updateSunatCredentialsSchema>;