import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Contact } from '../../integrations/supabase/types';

interface ContactFormModalProps {
  contact?: Contact | null;
  open: boolean;
  onClose: () => void;
  onSave: (contactData: Partial<Contact>) => Promise<void>;
}

export function ContactFormModal({
  contact,
  open,
  onClose,
  onSave
}: ContactFormModalProps) {
  const [formData, setFormData] = useState<Partial<Contact>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile_phone: '',
    title: '',
    department: '',
    account_name: '',
    website: '',
    mailing_street: '',
    mailing_city: '',
    mailing_state: '',
    mailing_postal_code: '',
    mailing_country: '',
    linkedin_url: '',
    lead_source: '',
    contact_status: 'active',
    lifecycle_stage: 'lead'
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData(contact);
    } else {
      // Reset form for new contact
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        mobile_phone: '',
        title: '',
        department: '',
        account_name: '',
        website: '',
        mailing_street: '',
        mailing_city: '',
        mailing_state: '',
        mailing_postal_code: '',
        mailing_country: '',
        linkedin_url: '',
        lead_source: '',
        contact_status: 'active',
        lifecycle_stage: 'lead'
      });
    }
  }, [contact, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Contact, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact ? 'Editar Contato' : 'Novo Contato'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nome *</Label>
              <Input
                id="first_name"
                value={formData.first_name || ''}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last_name">Sobrenome *</Label>
              <Input
                id="last_name"
                value={formData.last_name || ''}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mobile_phone">Celular</Label>
              <Input
                id="mobile_phone"
                value={formData.mobile_phone || ''}
                onChange={(e) => handleInputChange('mobile_phone', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Cargo</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
              />
            </div>
          </div>

          {/* Company Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_name">Empresa</Label>
              <Input
                id="account_name"
                value={formData.account_name || ''}
                onChange={(e) => handleInputChange('account_name', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                value={formData.department || ''}
                onChange={(e) => handleInputChange('department', e.target.value)}
              />
            </div>
          </div>

          {/* Status and Stage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_status">Status</Label>
              <Select
                value={formData.contact_status || 'active'}
                onValueChange={(value) => handleInputChange('contact_status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="bounced">Rejeitado</SelectItem>
                  <SelectItem value="opted_out">Optou por sair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lifecycle_stage">Estágio</Label>
              <Select
                value={formData.lifecycle_stage || 'lead'}
                onValueChange={(value) => handleInputChange('lifecycle_stage', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="evangelist">Evangelista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead_source">Origem</Label>
              <Select
                value={formData.lead_source || ''}
                onValueChange={(value) => handleInputChange('lead_source', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="social_media">Redes Sociais</SelectItem>
                  <SelectItem value="email_marketing">Email Marketing</SelectItem>
                  <SelectItem value="referral">Indicação</SelectItem>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Endereço</h3>
            
            <div className="space-y-2">
              <Label htmlFor="mailing_street">Rua</Label>
              <Input
                id="mailing_street"
                value={formData.mailing_street || ''}
                onChange={(e) => handleInputChange('mailing_street', e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mailing_city">Cidade</Label>
                <Input
                  id="mailing_city"
                  value={formData.mailing_city || ''}
                  onChange={(e) => handleInputChange('mailing_city', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mailing_state">Estado</Label>
                <Input
                  id="mailing_state"
                  value={formData.mailing_state || ''}
                  onChange={(e) => handleInputChange('mailing_state', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mailing_postal_code">CEP</Label>
                <Input
                  id="mailing_postal_code"
                  value={formData.mailing_postal_code || ''}
                  onChange={(e) => handleInputChange('mailing_postal_code', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input
                id="linkedin_url"
                type="url"
                value={formData.linkedin_url || ''}
                onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : (contact ? 'Atualizar' : 'Criar')} Contato
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ContactFormModal;
