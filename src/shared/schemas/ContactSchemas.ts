/**
 * ============================================
 * 🔧 CONTACT SCHEMAS - ZOD VALIDATION
 * ============================================
 * 
 * Schemas Zod específicos para entidade Contact.
 * Mantém compatibilidade com interface existente.
 */

import { z } from 'zod';

/**
 * 🔧 Contact Schema - Esquema completo do contato
 */
export const ContactSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().min(1), // ✅ NOT NULL no banco
  last_name: z.string().optional().nullable(), // ✅ NULLABLE no banco
  email: z.string().email(), // ✅ NOT NULL no banco
  phone: z.string().optional(),
  company: z.string().optional(),
  job_title: z.string().optional(),
  
  // Endereço
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  
  // Informações adicionais
  company_id: z.string().uuid().optional().nullable(), // ✅ NULLABLE no banco
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]).optional(),
  lead_source: z.string().optional(),
  
  // Redes sociais
  social_linkedin: z.string().url().optional(),
  social_facebook: z.string().url().optional(),
  social_twitter: z.string().url().optional(),
  
  // Sistema
  tenant_id: z.string().uuid().optional(),
  created_at: z.string().optional(), // Formato Supabase: "2025-06-30 01:14:13.34407"
  updated_at: z.string().optional(), // Formato Supabase: "2025-06-30 01:14:13.34407"
  created_by: z.string().uuid().optional(),
  
  // AIDEV-NOTE: Index signature para compatibilidade
}).passthrough();

/**
 * 🔧 Contact Create Schema - Para criação
 */
export const ContactCreateSchema = ContactSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

/**
 * 🔧 Contact Update Schema - Para atualização
 */
export const ContactUpdateSchema = ContactCreateSchema.partial();

/**
 * 🔧 Contact List Item Schema - Para listagens
 */
export const ContactListItemSchema = ContactSchema.pick({
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  company: true,
  job_title: true,
  created_at: true
});

/**
 * 🔧 Lead Import Schema - Para importação CSV/XLSX
 */
export const LeadImportSchema = z.object({
  first_name: z.string().min(1, 'Nome é obrigatório').trim(),
  last_name: z.string().trim().optional(),
  email: z.string().email('Email inválido').toLowerCase().trim(),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  job_title: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

/**
 * 🔧 Lead Import Result Schema - Para validação do resultado
 */
export const LeadImportResultSchema = z.object({
  totalProcessed: z.number(),
  imported: z.number(),
  errors: z.number(),
  duplicates: z.number(),
  validationErrors: z.array(z.object({
    line: z.number(),
    error: z.string()
  })),
  duplicateErrors: z.array(z.object({
    email: z.string(),
    error: z.string()
  }))
});

// Tipos inferidos dos schemas
export type Contact = z.infer<typeof ContactSchema>;
export type ContactCreate = z.infer<typeof ContactCreateSchema>;
export type ContactUpdate = z.infer<typeof ContactUpdateSchema>;
export type ContactListItem = z.infer<typeof ContactListItemSchema>;
export type LeadImport = z.infer<typeof LeadImportSchema>;
export type LeadImportResult = z.infer<typeof LeadImportResultSchema>;