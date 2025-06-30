import { useState, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { FORM_TYPES, FormType, FormTypeConfig } from '../types/FormTypeDefinitions';

export interface UseFormTypesReturn {
  // DADOS BÁSICOS
  formTypes: FormType[];
  selectedType: FormType | null;
  
  // FILTROS E AGRUPAMENTOS
  typesByCategory: Record<string, FormType[]>;
  availableTypes: FormType[];
  
  // AÇÕES
  selectType: (typeId: string) => void;
  clearSelection: () => void;
  getTypeById: (id: string) => FormType | undefined;
  
  // VALIDAÇÕES
  isTypeAvailable: (type: FormType) => boolean;
  getUserPlan: () => 'basic' | 'pro' | 'enterprise';
}

export const useFormTypes = (): UseFormTypesReturn => {
  const { user } = useAuth();
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  // DETERMINAR PLANO DO USUÁRIO (baseado no sistema multi-tenant)
  const getUserPlan = (): 'basic' | 'pro' | 'enterprise' => {
    // Usar dados do tenant/user para determinar plano
    // Por enquanto, retornamos enterprise como padrão para desenvolvimento
    return user && user.tenant_id ? 'enterprise' : 'basic';
  };

  const userPlan = getUserPlan();

  // FILTRAR TIPOS DISPONÍVEIS POR PLANO
  const availableTypes = useMemo(() => {
    return FORM_TYPES.filter((type) => isTypeAvailable(type));
  }, [userPlan]);

  // VERIFICAR SE TIPO ESTÁ DISPONÍVEL PARA O PLANO DO USUÁRIO
  const isTypeAvailable = (type: FormType): boolean => {
    const restrictions = type.config.tenant_restrictions;
    
    if (!restrictions) {
      return true; // Sem restrições = disponível para todos
    }

    // Verificar plano requerido
    const planHierarchy = { basic: 1, pro: 2, enterprise: 3 };
    const userPlanLevel = planHierarchy[userPlan];
    const requiredPlanLevel = planHierarchy[restrictions.required_plan];

    if (userPlanLevel < requiredPlanLevel) {
      return false;
    }

    // Verificar integrações requeridas (por enquanto assumimos que estão disponíveis)
    // TODO: Implementar verificação real das integrações quando necessário
    
    return true;
  };

  // AGRUPAR TIPOS POR CATEGORIA
  const typesByCategory = useMemo(() => {
    const grouped: Record<string, FormType[]> = {};
    
    availableTypes.forEach((type) => {
      if (!grouped[type.category]) {
        grouped[type.category] = [];
      }
      grouped[type.category].push(type);
    });

    return grouped;
  }, [availableTypes]);

  // TIPO SELECIONADO ATUAL
  const selectedType = useMemo(() => {
    return selectedTypeId ? getTypeById(selectedTypeId) || null : null;
  }, [selectedTypeId]);

  // FUNÇÕES DE AÇÃO
  const selectType = (typeId: string) => {
    const type = getTypeById(typeId);
    if (type && isTypeAvailable(type)) {
      setSelectedTypeId(typeId);
    }
  };

  const clearSelection = () => {
    setSelectedTypeId(null);
  };

  const getTypeById = (id: string): FormType | undefined => {
    return FORM_TYPES.find((type) => type.id === id);
  };

  return {
    // DADOS BÁSICOS
    formTypes: FORM_TYPES,
    selectedType,
    
    // FILTROS E AGRUPAMENTOS
    typesByCategory,
    availableTypes,
    
    // AÇÕES
    selectType,
    clearSelection,
    getTypeById,
    
    // VALIDAÇÕES
    isTypeAvailable,
    getUserPlan
  };
}; 