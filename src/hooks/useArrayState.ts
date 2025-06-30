import { useState, useCallback, useMemo } from 'react';

/**
 * 🔧 Hook genérico para gerenciamento de estados de array
 * Elimina duplicação de useState<[]>([]) em 35+ componentes
 * 
 * @template T Tipo dos itens do array
 * @param initialItems Array inicial (opcional)
 * @returns Objeto com estados e funções para manipulação do array
 */
export interface UseArrayStateReturn<T> {
  // Estados
  items: T[];
  filteredItems: T[];
  searchTerm: string;
  
  // Setters diretos
  setItems: (items: T[]) => void;
  setFilteredItems: (items: T[]) => void;
  setSearchTerm: (term: string) => void;
  
  // Operações CRUD
  addItem: (item: T) => void;
  removeItem: (predicate: (item: T) => boolean) => void;
  updateItem: (predicate: (item: T) => boolean, updates: Partial<T>) => void;
  
  // Operações de filtro
  filterItems: (predicate: (item: T) => boolean) => void;
  searchItems: (searchFn: (item: T, term: string) => boolean) => void;
  resetFilters: () => void;
  
  // Utilitários
  clearAll: () => void;
  replaceAll: (newItems: T[]) => void;
  
  // Computed
  isEmpty: boolean;
  isFiltered: boolean;
  totalCount: number;
  filteredCount: number;
}

export const useArrayState = <T>(initialItems: T[] = []): UseArrayStateReturn<T> => {
  const [items, setItems] = useState<T[]>(initialItems);
  const [filteredItems, setFilteredItems] = useState<T[]>(initialItems);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Operações CRUD
  const addItem = useCallback((item: T) => {
    setItems(prev => [...prev, item]);
    setFilteredItems(prev => [...prev, item]);
  }, []);

  const removeItem = useCallback((predicate: (item: T) => boolean) => {
    setItems(prev => prev.filter(item => !predicate(item)));
    setFilteredItems(prev => prev.filter(item => !predicate(item)));
  }, []);

  const updateItem = useCallback((predicate: (item: T) => boolean, updates: Partial<T>) => {
    const updateFn = (arr: T[]) => arr.map(item => 
      predicate(item) ? { ...item, ...updates } : item
    );
    
    setItems(updateFn);
    setFilteredItems(updateFn);
  }, []);

  // Operações de filtro
  const filterItems = useCallback((predicate: (item: T) => boolean) => {
    setFilteredItems(items.filter(predicate));
  }, [items]);

  const searchItems = useCallback((searchFn: (item: T, term: string) => boolean) => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
    } else {
      setFilteredItems(items.filter(item => searchFn(item, searchTerm)));
    }
  }, [items, searchTerm]);

  const resetFilters = useCallback(() => {
    setFilteredItems(items);
    setSearchTerm('');
  }, [items]);

  // Utilitários
  const clearAll = useCallback(() => {
    setItems([]);
    setFilteredItems([]);
    setSearchTerm('');
  }, []);

  const replaceAll = useCallback((newItems: T[]) => {
    setItems(newItems);
    setFilteredItems(newItems);
    setSearchTerm('');
  }, []);

  // Override do setItems para sincronizar filteredItems
  const setItemsSync = useCallback((newItems: T[]) => {
    setItems(newItems);
    // Se não há filtro ativo, sincroniza os filtrados
    if (!searchTerm.trim()) {
      setFilteredItems(newItems);
    }
  }, [searchTerm]);

  // Computed values
  const computed = useMemo(() => ({
    isEmpty: items.length === 0,
    isFiltered: filteredItems.length !== items.length || searchTerm.trim() !== '',
    totalCount: items.length,
    filteredCount: filteredItems.length,
  }), [items.length, filteredItems.length, searchTerm]);

  return {
    // Estados
    items,
    filteredItems,
    searchTerm,
    
    // Setters
    setItems: setItemsSync,
    setFilteredItems,
    setSearchTerm,
    
    // Operações
    addItem,
    removeItem,
    updateItem,
    filterItems,
    searchItems,
    resetFilters,
    clearAll,
    replaceAll,
    
    // Computed
    ...computed,
  };
}; 