import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Contact, ContactFilters, ContactStats } from '../integrations/supabase/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface UseContactsReturn {
  contacts: Contact[];
  stats: ContactStats | null;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  refreshContacts: () => Promise<void>;
  createContact: (contactData: Partial<Contact>) => Promise<Contact>;
  updateContact: (contactId: string, contactData: Partial<Contact>) => Promise<Contact>;
  deleteContact: (contactId: string) => Promise<void>;
  mergeContacts: (sourceId: string, targetId: string) => Promise<Contact>;
  findDuplicates: () => Promise<Contact[]>;
}

export function useContacts(filters: ContactFilters = {}): UseContactsReturn {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Build query string from filters
  const buildQueryString = useCallback((filters: ContactFilters) => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    return params.toString();
  }, []);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const queryString = buildQueryString(filters);
      const response = await fetch(`${API_BASE_URL}/api/contacts?${queryString}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setContacts(data.contacts || []);
      setTotalCount(data.total_count || 0);
      
      // Fetch stats separately
      await fetchStats();
      
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar contatos');
    } finally {
      setIsLoading(false);
    }
  }, [user, filters, buildQueryString]);

  // Fetch contact stats
  const fetchStats = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/stats`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error fetching contact stats:', err);
    }
  }, [user]);

  // Create contact
  const createContact = useCallback(async (contactData: Partial<Contact>): Promise<Contact> => {
    if (!user) throw new Error('User not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newContact = await response.json();
    
    // Refresh contacts list
    await fetchContacts();
    
    return newContact;
  }, [user, fetchContacts]);

  // Update contact
  const updateContact = useCallback(async (contactId: string, contactData: Partial<Contact>): Promise<Contact> => {
    if (!user) throw new Error('User not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/api/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedContact = await response.json();
    
    // Update local state
    setContacts(prev => prev.map(contact => 
      contact.id === contactId ? updatedContact : contact
    ));
    
    return updatedContact;
  }, [user]);

  // Delete contact
  const deleteContact = useCallback(async (contactId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/api/contacts/${contactId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Remove from local state
    setContacts(prev => prev.filter(contact => contact.id !== contactId));
    setTotalCount(prev => prev - 1);
  }, [user]);

  // Merge contacts
  const mergeContacts = useCallback(async (sourceId: string, targetId: string): Promise<Contact> => {
    if (!user) throw new Error('User not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/api/contacts/merge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source_id: sourceId, target_id: targetId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const mergedContact = await response.json();
    
    // Refresh contacts list
    await fetchContacts();
    
    return mergedContact;
  }, [user, fetchContacts]);

  // Find duplicates
  const findDuplicates = useCallback(async (): Promise<Contact[]> => {
    if (!user) throw new Error('User not authenticated');
    
    const response = await fetch(`${API_BASE_URL}/api/contacts/duplicates`, {
      headers: {
        'Authorization': `Bearer ${user.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }, [user]);

  // Refresh contacts (alias for fetchContacts)
  const refreshContacts = useCallback(async () => {
    await fetchContacts();
  }, [fetchContacts]);

  // Effect to fetch contacts when filters change
  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [fetchContacts, user]);

  return {
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
    findDuplicates,
  };
}

export default useContacts;
