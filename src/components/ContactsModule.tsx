import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
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

// Types
import { Contact, ContactFilters as ContactFiltersType, ContactStats } from '../integrations/supabase/types';

// Hooks
import { useContacts } from '../hooks/useContacts';
import { useStatePersistence, MODULE_PERSISTENCE_CONFIGS } from '../lib/statePersistence';

interface ContactsModuleProps {
  className?: string;
}

export function ContactsModule({ className }: ContactsModuleProps) {
  const { user } = useAuth();
  
  // 🔄 PERSISTÊNCIA: Estados com persistência automática
  const { state: persistedState, updateState: updatePersistedState } = useStatePersistence(
    MODULE_PERSISTENCE_CONFIGS.CONTACTS_MODULE
  );
  
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(persistedState.viewMode || 'table');
  
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
    if (window.confirm('Tem certeza que deseja excluir este contato?')) {
      await deleteContact(contactId);
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
              onClick={() => {/* TODO: Export functionality */}}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            
            <Button
              variant="outline"  
              size="sm"
              onClick={() => {/* TODO: Import functionality */}}
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
          contacts={contacts}
          loading={isLoading}
          viewMode={viewMode}
          onEditContact={handleEditContact}
          onViewContact={handleViewContact}
          onDeleteContact={handleDeleteContact}
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
            if (selectedContact) {
              await updateContact(selectedContact.id, contactData);
            } else {
              await createContact(contactData);
            }
            setShowContactForm(false);
            refreshContacts();
          }}
        />
      )}

      {showContactDetails && selectedContact && (
        <ContactDetailsModal
          contact={selectedContact}
          open={showContactDetails}
          onClose={() => setShowContactDetails(false)}
          onEdit={() => {
            setShowContactDetails(false);
            setShowContactForm(true);
          }}
          onDelete={() => {
            handleDeleteContact(selectedContact.id);
            setShowContactDetails(false);
          }}
        />
      )}
    </div>
  );
}

export default ContactsModule;
