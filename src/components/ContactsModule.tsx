import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  MoreHorizontal,
  UserPlus,
  Building,
  Mail,
  Phone,
  Calendar,
  TrendingUp
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { DataTable } from './ui/data-table';
import { BlurFade } from './ui/blur-fade';
import { ShimmerButton } from './ui/shimmer-button';
import { MotionWrapper } from './ui/motion-wrapper';

// Contact Components
import ContactsList from './Contacts/ContactsList';
import ContactDetailsModal from './Contacts/ContactDetailsModal';
import ContactFormModal from './Contacts/ContactFormModal';
import ContactStatsCards from './Contacts/ContactStatsCards';
import ContactFilters from './Contacts/ContactFilters';

// Types - AIDEV-NOTE: Use Zod inference — schema is the source of truth
import { Contact, ContactListItem } from '../shared/types/Domain';
import { ContactFilters as ContactFiltersType } from '../integrations/supabase/types';

// AIDEV-NOTE: Type guard para garantir que Contact tem ID válido
const isValidContact = (contact: Contact): contact is ContactListItem => {
  return !!contact.id;
};

// ✅ CORREÇÃO: Interface para ContactStats baseada nos dados reais
interface ContactStats {
  totalContacts: number;
  activeContacts: number;
  newThisMonth: number;
  conversionRate: number;
}

// Hooks
import { useContacts } from '../hooks/useContacts';
import { useStatePersistence, MODULE_PERSISTENCE_CONFIGS } from '../lib/statePersistence';
import { useToast } from '../hooks/useToast';

// UI Components for confirmation
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface ContactsModuleProps {
  className?: string;
}

// ✅ CORREÇÃO: Remoção da função de conversão - useContacts já retorna Contact[] tipado

// Type guard para verificar se um contato é completo
const isCompleteContact = (contact: Partial<Contact> | null | undefined): contact is Contact => {
  return contact != null && contact.id != null && contact.first_name != null && contact.email != null;
};

export function ContactsModule({ className }: ContactsModuleProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // 🔄 PERSISTÊNCIA: Estados com persistência automática
  const { state: persistedState, updateState: updatePersistedState } = useStatePersistence(
    MODULE_PERSISTENCE_CONFIGS.CONTACTS_MODULE
  );
  
  const [selectedContact, setSelectedContact] = useState<Partial<Contact> | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(persistedState.viewMode || 'table');
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  
  // Filters state
  const [filters, setFilters] = useState<ContactFiltersType>({
    limit: 50,
    offset: 0
  });

  const {
    contacts,
    stats,
    isLoading,
    error,
    totalCount,
    refreshContacts,
    createContact,
    updateContact,
    deleteContact,
    mergeContacts,
    findDuplicates
  } = useContacts(filters);

  // Handle contact actions
  const handleCreateContact = () => {
    setSelectedContact(null);
    setShowContactForm(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactForm(true);
  };

  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactDetails(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContact(contactId);
      toast({
        title: 'Sucesso',
        description: 'Contato excluído com sucesso',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir contato',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteClick = (contactId: string) => {
    setContactToDelete(contactId);
  };

  const confirmDelete = async () => {
    if (contactToDelete) {
      await handleDeleteContact(contactToDelete);
      setContactToDelete(null);
    }
  };

  const handleFilterChange = (newFilters: Partial<ContactFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setFilters(prev => ({ 
      ...prev, 
      offset: page * pageSize,
      limit: pageSize 
    }));
  };

  // Memoized stats for performance
  const contactStats = useMemo(() => ({
    totalContacts: totalCount || 0,
    activeContacts: stats?.active_count || 0,
    newThisMonth: stats?.new_this_month || 0,
    conversionRate: stats?.conversion_rate || 0
  }), [totalCount, stats]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 font-medium">Erro ao carregar contatos</p>
          <p className="text-slate-500 text-sm mt-2">{error}</p>
          <Button 
            onClick={refreshContacts} 
            className="mt-4"
            variant="outline"
          >
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <BlurFade>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Contatos</h1>
            <p className="text-slate-500 mt-1">
              Gerencie seus contatos e relacionamentos comerciais
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const csvContent = contacts.map(c => 
                    `"${c.first_name || ''} ${c.last_name || ''}","${c.email || ''}","${c.phone || ''}","${c.company || ''}","${c.created_at || ''}"`
                  ).join('\n');
                  const blob = new Blob([`Nome,Email,Telefone,Empresa,Data\n${csvContent}`], 
                    { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `contatos_${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                } catch (error) {
                  console.error('Erro ao exportar:', error);
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            
            <Button
              variant="outline"  
              size="sm"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    console.log('Arquivo selecionado:', file.name);
                    // Implementação de importação pode ser adicionada aqui
                  }
                };
                input.click();
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            
            <ShimmerButton
              onClick={handleCreateContact}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Contato
            </ShimmerButton>
          </div>
        </div>
      </BlurFade>

      {/* Stats Cards */}
      <BlurFade delay={0.1}>
        <ContactStatsCards stats={contactStats} />
      </BlurFade>

      {/* Filters and Search */}
      <BlurFade delay={0.2}>
        <Card>
          <CardContent className="p-6">
            <ContactFilters
              filters={filters}
              onFiltersChange={handleFilterChange}
              onClearFilters={() => setFilters({ limit: 50, offset: 0 })}
            />
          </CardContent>
        </Card>
      </BlurFade>

      {/* View Mode Toggle */}
      <BlurFade delay={0.3}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-500">
              {totalCount > 0 ? (
                `Mostrando ${Math.min(filters.offset || 0 + 1, totalCount)} - ${Math.min((filters.offset || 0) + (filters.limit || 50), totalCount)} de ${totalCount} contatos`
              ) : (
                'Nenhum contato encontrado'
              )}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Tabela
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              Cards
            </Button>
          </div>
        </div>
      </BlurFade>

      {/* Contacts List */}
      <BlurFade delay={0.4}>
        <ContactsList
          contacts={(contacts || []).filter(isValidContact)}
          loading={isLoading}
          viewMode={viewMode}
          onEditContact={handleEditContact}
          onViewContact={handleViewContact}
          onDeleteContact={handleDeleteClick}
          onPageChange={handlePageChange}
          totalCount={totalCount || 0}
          currentPage={Math.floor((filters.offset || 0) / (filters.limit || 50))}
          pageSize={filters.limit || 50}
        />
      </BlurFade>

      {/* Modals */}
      {showContactForm && (
        <ContactFormModal
          contact={selectedContact}
          open={showContactForm}
          onClose={() => setShowContactForm(false)}
          onSave={async (contactData) => {
            if (selectedContact && selectedContact.id) {
              await updateContact(selectedContact.id, contactData);
            } else {
              await createContact(contactData);
            }
            setShowContactForm(false);
            refreshContacts();
          }}
        />
      )}

      {showContactDetails && isCompleteContact(selectedContact) && (
        <ContactDetailsModal
          contact={selectedContact}
          open={showContactDetails}
          onClose={() => setShowContactDetails(false)}
          onEdit={() => {
            setShowContactDetails(false);
            setShowContactForm(true);
          }}
          onDelete={() => {
            if (selectedContact?.id) {
              handleDeleteClick(selectedContact.id);
            }
            setShowContactDetails(false);
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!contactToDelete} onOpenChange={() => setContactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita e 
              todos os dados do contato serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ContactsModule;
