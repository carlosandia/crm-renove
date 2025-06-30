import React from 'react';
import { Search, Filter, X, Building, User, Tag } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ContactFilters as ContactFiltersType } from '../../integrations/supabase/types';

interface ContactFiltersProps {
  filters: ContactFiltersType;
  onFiltersChange: (filters: Partial<ContactFiltersType>) => void;
  onClearFilters: () => void;
}

export function ContactFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: ContactFiltersProps) {
  
  const hasActiveFilters = Boolean(
    filters.search || 
    filters.owner_id || 
    filters.contact_status || 
    filters.lifecycle_stage || 
    filters.lead_source || 
    filters.company_name
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, email, telefone..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-10"
          />
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Limpar Filtros</span>
          </Button>
        )}
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Company Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center">
            <Building className="w-4 h-4 mr-1" />
            Empresa
          </label>
          <Input
            placeholder="Nome da empresa"
            value={filters.company_name || ''}
            onChange={(e) => onFiltersChange({ company_name: e.target.value })}
          />
        </div>

        {/* Contact Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center">
            <User className="w-4 h-4 mr-1" />
            Status
          </label>
          <Select
            value={filters.contact_status || ''}
            onValueChange={(value) => onFiltersChange({ 
              contact_status: value === 'all' ? undefined : value as any 
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
              <SelectItem value="bounced">Rejeitado</SelectItem>
              <SelectItem value="opted_out">Optou por sair</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lifecycle Stage Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center">
            <Tag className="w-4 h-4 mr-1" />
            Estágio
          </label>
          <Select
            value={filters.lifecycle_stage || ''}
            onValueChange={(value) => onFiltersChange({ 
              lifecycle_stage: value === 'all' ? undefined : value as any 
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os estágios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estágios</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="customer">Cliente</SelectItem>
              <SelectItem value="evangelist">Evangelista</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lead Source Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center">
            <Filter className="w-4 h-4 mr-1" />
            Origem
          </label>
          <Select
            value={filters.lead_source || ''}
            onValueChange={(value) => onFiltersChange({ 
              lead_source: value === 'all' ? undefined : value 
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas as origens" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
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

        {/* Owner Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center">
            <User className="w-4 h-4 mr-1" />
            Responsável
          </label>
          <Select
            value={filters.owner_id || ''}
            onValueChange={(value) => onFiltersChange({ 
              owner_id: value === 'all' ? undefined : value 
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os responsáveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              <SelectItem value="me">Meus contatos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <Filter className="w-4 h-4" />
          <span>Filtros ativos:</span>
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                Busca: "{filters.search}"
              </span>
            )}
            {filters.company_name && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md">
                Empresa: "{filters.company_name}"
              </span>
            )}
            {filters.contact_status && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md">
                Status: {filters.contact_status}
              </span>
            )}
            {filters.lifecycle_stage && (
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-md">
                Estágio: {filters.lifecycle_stage}
              </span>
            )}
            {filters.lead_source && (
              <span className="bg-cyan-100 text-cyan-800 px-2 py-1 rounded-md">
                Origem: {filters.lead_source}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactFilters;
