/**
 * 🎯 Componentes UI Unificados
 * Sistema de modais consolidado para eliminação de duplicação
 */

// Componentes base
export { BaseModal } from './base-modal';
export { FormModal } from './form-modal';
export { DetailsModal } from './details-modal';

// Componentes já existentes (mantidos)
export { IconBadge } from './icon-badge';

// Re-exports dos componentes shadcn/ui existentes
export { Button } from './button';
export { Input } from './input';
export { Label } from './label';
export { Textarea } from './textarea';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export { Alert, AlertDescription } from './alert';
export { Badge } from './badge';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';

// Tipos úteis
export type { 
  BaseModalProps, 
  CrudModalProps, 
  ConfirmModalProps 
} from '../../types/CommonProps'; 