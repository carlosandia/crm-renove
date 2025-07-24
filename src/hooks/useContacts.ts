import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseCrud } from './useSupabaseCrud';
import { ContactSchema } from '../shared/schemas/ContactSchemas';
import type { Contact } from '../shared/types/Domain';

// AIDEV-NOTE: Interface legada removida - usando tipos inferidos do Zod

interface ContactFilters {
  tenant_id?: string;
  company?: string;
  city?: string;
  lead_source?: string;
  tags?: string[];
  search?: string;
}

export const useContacts = (filters?: ContactFilters) => {
  const { user } = useAuth();
  
  // ✅ USANDO NOVO HOOK BASE UNIFICADO COM VALIDAÇÃO ZOD
  const contactsCrud = useSupabaseCrud({
    tableName: 'contacts',
    selectFields: `
      id, first_name, last_name, email, phone, company, job_title,
      address, city, state, zip_code, country, notes, tags,
      social_linkedin, social_facebook, social_twitter, lead_source,
      tenant_id, created_at, updated_at, created_by
    `,
    defaultOrderBy: { column: 'first_name', ascending: true },
    enableCache: true,
    cacheKeyPrefix: 'contacts',
    cacheDuration: 300000, // 5 minutos
    // AIDEV-NOTE: Schema Zod para validação runtime
    schema: ContactSchema
  });

  // ============================================
  // CARREGAMENTO AUTOMÁTICO
  // ============================================

  useEffect(() => {
    if (user?.tenant_id) {
      // Carregar contatos do tenant automaticamente
      contactsCrud.fetchAll({
        filters: {
          tenant_id: user.tenant_id
        }
      }).catch(error => {
        console.warn('⚠️ [useContacts] Erro no carregamento automático:', error);
      });
    }
  }, [user?.tenant_id]);

  // ============================================
  // FUNÇÕES DE CONVENIÊNCIA (MANTIDAS)
  // ============================================

  // Buscar contatos por empresa
  const getContactsByCompany = useCallback((company: string): Contact[] => {
    return contactsCrud.data.filter(contact => 
      contact.company?.toLowerCase().includes(company.toLowerCase())
    );
  }, [contactsCrud.data]);

  // Buscar contatos por cidade
  const getContactsByCity = useCallback((city: string): Contact[] => {
    return contactsCrud.data.filter(contact => 
      contact.city?.toLowerCase().includes(city.toLowerCase())
    );
  }, [contactsCrud.data]);

  // Buscar contatos por fonte de lead
  const getContactsByLeadSource = useCallback((leadSource: string): Contact[] => {
    return contactsCrud.data.filter(contact => contact.lead_source === leadSource);
  }, [contactsCrud.data]);

  // Buscar contatos por tags
  const getContactsByTag = useCallback((tag: string): Contact[] => {
    return contactsCrud.data.filter(contact => 
      contact.tags?.includes(tag)
    );
  }, [contactsCrud.data]);

  // Buscar contatos com informações incompletas
  const getIncompleteContacts = useCallback((): Contact[] => {
    return contactsCrud.data.filter(contact => 
      !contact.phone || !contact.company || !contact.job_title
    );
  }, [contactsCrud.data]);

  // Obter estatísticas dos contatos
  const getContactStats = useCallback(() => {
    const total = contactsCrud.data.length;
    const withPhone = contactsCrud.data.filter(c => c.phone).length;
    const withCompany = contactsCrud.data.filter(c => c.company).length;
    const withJobTitle = contactsCrud.data.filter(c => c.job_title).length;
    const incomplete = getIncompleteContacts().length;

    const companies = new Set(
      contactsCrud.data
        .filter(c => c.company)
        .map(c => c.company)
    );

    const leadSources = new Set(
      contactsCrud.data
        .filter(c => c.lead_source)
        .map(c => c.lead_source)
    );

    // ✅ COMPATIBILIDADE - Campos esperados pelo ContactsModule
    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);
    const newThisMonth = contactsCrud.data.filter(c => 
      c.created_at && new Date(c.created_at) >= thisMonth
    ).length;

    return {
      total,
      withPhone,
      withCompany,
      withJobTitle,
      incomplete,
      completionRate: total > 0 ? Math.round(((total - incomplete) / total) * 100) : 0,
      uniqueCompanies: companies.size,
      uniqueLeadSources: leadSources.size,
      companies: Array.from(companies),
      leadSources: Array.from(leadSources),
      
      // ✅ COMPATIBILIDADE - Campos esperados pelo módulo legacy
      active_count: total, // Assumindo que todos são ativos
      new_this_month: newThisMonth,
      conversion_rate: Math.round((withCompany / total) * 100) || 0
    };
  }, [contactsCrud.data, getIncompleteContacts]);

  // Buscar contatos com filtros avançados
  const searchContacts = useCallback(async (searchFilters: {
    search?: string;
    company?: string;
    city?: string;
    leadSource?: string;
    tags?: string[];
  }) => {
    const filters: Record<string, unknown> = {
      tenant_id: user?.tenant_id
    };

    // Aplicar filtros específicos
    if (searchFilters.company) {
      filters.company = searchFilters.company;
    }
    if (searchFilters.city) {
      filters.city = searchFilters.city;
    }
    if (searchFilters.leadSource) {
      filters.lead_source = searchFilters.leadSource;
    }

    // Buscar com os filtros
    return contactsCrud.fetchAll({
      filters,
      search: searchFilters.search ? {
        field: 'first_name,last_name,email',
        value: searchFilters.search
      } : undefined
    });
  }, [user?.tenant_id, contactsCrud.fetchAll]);

  // Importar contatos em lote
  const importContacts = useCallback(async (contactsData: Omit<Contact, 'id' | 'created_at' | 'updated_at'>[]) => {
    console.log('📥 [useContacts] Importando contatos em lote:', contactsData.length);
    
    const results = [];
    const errors = [];

    for (const contactData of contactsData) {
      try {
        const result = await contactsCrud.create(contactData);
        results.push(result);
      } catch (error) {
        console.error('❌ [useContacts] Erro ao importar contato:', error);
        errors.push({ contactData, error });
      }
    }

    console.log(`✅ [useContacts] Importação concluída: ${results.length} sucessos, ${errors.length} erros`);
    
    return {
      successes: results,
      errors,
      total: contactsData.length,
      successCount: results.length,
      errorCount: errors.length
    };
  }, [contactsCrud.create]);

  // ============================================
  // INTERFACE COMPATÍVEL (MANTIDA)
  // ============================================

  return {
    // ✅ DADOS DO HOOK BASE UNIFICADO
    contacts: contactsCrud.data,
    loading: contactsCrud.isLoading,
    isLoading: contactsCrud.isLoading, // ✅ COMPATIBILIDADE 
    error: contactsCrud.error,
    totalCount: contactsCrud.totalCount,
    
    // ✅ COMPATIBILIDADE - Stats computadas
    stats: getContactStats(),
    
    // ✅ OPERAÇÕES DO HOOK BASE UNIFICADO
    loadContacts: () => contactsCrud.fetchAll({
      filters: {
        tenant_id: user?.tenant_id
      }
    }),
    refreshContacts: contactsCrud.refresh, // ✅ COMPATIBILIDADE
    getContactById: contactsCrud.fetchById,
    createContact: (contactData: Partial<Contact>) => {
      // AIDEV-NOTE: Validar campos obrigatórios antes da criação
      if (!contactData.email?.trim()) {
        throw new Error('Email é obrigatório para criar um contato');
      }
      if (!contactData.first_name?.trim()) {
        throw new Error('Nome é obrigatório para criar um contato');
      }
      if (!contactData.last_name?.trim()) {
        throw new Error('Sobrenome é obrigatório para criar um contato');
      }
      // Converter Partial para tipo compatível removendo undefined dos campos obrigatórios
      const validatedData = contactData as Omit<Contact, "id" | "created_at" | "updated_at">;
      return contactsCrud.create(validatedData);
    },
    updateContact: (id: string, contactData: Partial<Contact>) => {
      // AIDEV-NOTE: Para updates, permitir campos opcionais mas filtrar undefined
      const filteredData = Object.fromEntries(
        Object.entries(contactData).filter(([, value]) => value !== undefined)
      ) as Partial<Contact>;
      return contactsCrud.update(id, filteredData);
    },
    deleteContact: contactsCrud.remove,
    
    // ✅ COMPATIBILIDADE - Funções legadas (implementação vazia ou redirecionamento)
    mergeContacts: async (sourceId: string, targetId: string) => {
      console.warn('⚠️ [useContacts] mergeContacts não implementado no novo hook');
      return {} as Contact;
    },
    findDuplicates: async () => {
      console.warn('⚠️ [useContacts] findDuplicates não implementado no novo hook');
      return [];
    },
    
    // ✅ FUNÇÕES ESPECÍFICAS MANTIDAS
    getContactsByCompany,
    getContactsByCity,
    getContactsByLeadSource,
    getContactsByTag,
    getIncompleteContacts,
    getContactStats,
    searchContacts,
    importContacts,
    
    // ✅ FUNCIONALIDADES EXTRAS DO HOOK BASE
    refresh: contactsCrud.refresh,
    findContact: (predicate: (contact: Contact) => boolean) => contactsCrud.findOne(predicate),
    findContacts: (predicate: (contact: Contact) => boolean) => contactsCrud.findMany(predicate),
    
    // ✅ ESTADOS DETALHADOS
    states: {
      isEmpty: contactsCrud.isEmpty,
      hasData: contactsCrud.hasData,
      fetchState: contactsCrud.fetchState,
      createState: contactsCrud.createState,
      updateState: contactsCrud.updateState,
      deleteState: contactsCrud.deleteState
    },
    
    // ✅ CONTROLES DE CACHE
    clearCache: contactsCrud.clearCache
  };
};
