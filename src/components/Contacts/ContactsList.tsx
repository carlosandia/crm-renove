import React from 'react';
import { User, Mail, Phone, Building } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { BlurFade } from '../ui/blur-fade';
import { Contact } from '../../integrations/supabase/types';

interface ContactsListProps {
  contacts: Contact[];
  loading?: boolean;
  viewMode: 'table' | 'cards';
  onEditContact: (contact: Contact) => void;
  onViewContact: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
  onPageChange: (page: number, pageSize: number) => void;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export function ContactsList({
  contacts,
  loading = false,
  viewMode,
  onEditContact,
  onViewContact,
  onDeleteContact,
  onPageChange,
  totalCount,
  currentPage,
  pageSize
}: ContactsListProps) {

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-32"></div>
                  <div className="h-3 bg-slate-200 rounded w-24"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          Nenhum contato encontrado
        </h3>
        <p className="text-slate-500">
          Tente ajustar os filtros ou criar um novo contato.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contacts.map((contact, index) => {
        const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
        
        return (
          <BlurFade key={contact.id} delay={index * 0.05}>
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {fullName || 'Nome não informado'}
                      </h3>
                      {contact.title && (
                        <p className="text-sm text-slate-500">{contact.title}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {contact.email && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{contact.email}</span>
                    </div>
                  )}

                  {(contact.phone || contact.mobile_phone) && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">
                        {contact.phone || contact.mobile_phone}
                      </span>
                    </div>
                  )}

                  {contact.account_name && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Building className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{contact.account_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex space-x-2">
                    {contact.contact_status && (
                      <Badge variant="secondary">
                        {contact.contact_status}
                      </Badge>
                    )}
                    {contact.lifecycle_stage && (
                      <Badge variant="outline">
                        {contact.lifecycle_stage}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewContact(contact)}
                    >
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onEditContact(contact)}
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </BlurFade>
        );
      })}
    </div>
  );
}

export default ContactsList;
