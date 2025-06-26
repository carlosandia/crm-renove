import React from 'react';
import { X, Edit, Mail, Phone, Building, Calendar, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Contact } from '../../integrations/supabase/types';

interface ContactDetailsModalProps {
  contact: Contact;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ContactDetailsModal({
  contact,
  open,
  onClose,
  onEdit,
  onDelete
}: ContactDetailsModalProps) {
  const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{fullName || 'Contato'}</h2>
              {contact.title && (
                <p className="text-sm text-slate-500">{contact.title}</p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-slate-900">Informações de Contato</h3>
              
              {contact.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {contact.email}
                    </a>
                  </div>
                </div>
              )}

              {(contact.phone || contact.mobile_phone) && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">Telefone</p>
                    <a 
                      href={`tel:${contact.phone || contact.mobile_phone}`}
                      className="text-slate-900 hover:text-blue-600"
                    >
                      {contact.phone || contact.mobile_phone}
                    </a>
                  </div>
                </div>
              )}

              {contact.account_name && (
                <div className="flex items-center space-x-3">
                  <Building className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">Empresa</p>
                    <p className="text-slate-900">{contact.account_name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-slate-900">Status & Estágio</h3>
              
              <div className="space-y-3">
                {contact.contact_status && (
                  <div>
                    <p className="text-sm font-medium mb-1">Status do Contato</p>
                    <Badge variant="secondary">{contact.contact_status}</Badge>
                  </div>
                )}

                {contact.lifecycle_stage && (
                  <div>
                    <p className="text-sm font-medium mb-1">Estágio do Ciclo</p>
                    <Badge variant="outline">{contact.lifecycle_stage}</Badge>
                  </div>
                )}

                {contact.lead_source && (
                  <div>
                    <p className="text-sm font-medium mb-1">Origem</p>
                    <p className="text-slate-900">{contact.lead_source}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          {(contact.mailing_street || contact.mailing_city || contact.mailing_state) && (
            <div>
              <h3 className="font-medium text-slate-900 mb-3">Endereço</h3>
              <div className="text-slate-600">
                {contact.mailing_street && <p>{contact.mailing_street}</p>}
                <p>
                  {[
                    contact.mailing_city,
                    contact.mailing_state,
                    contact.mailing_postal_code,
                    contact.mailing_country
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-500">
              {contact.created_at && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Criado em {new Date(contact.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              {contact.updated_at && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Atualizado em {new Date(contact.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="destructive"
            onClick={onDelete}
          >
            Excluir Contato
          </Button>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ContactDetailsModal;
