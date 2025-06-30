import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

interface Contact {
  id?: string;
  company_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  title?: string;
  department?: string;
  account_name?: string;
  website?: string;
  mailing_street?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_postal_code?: string;
  mailing_country?: string;
  linkedin_url?: string;
  lead_source?: string;
  contact_status?: 'active' | 'inactive' | 'bounced' | 'opted_out';
  lifecycle_stage?: 'lead' | 'prospect' | 'customer' | 'evangelist';
  owner_id?: string;
  created_by?: string;
  custom_fields?: Record<string, string | number | boolean | null>;
}

interface ContactFilters {
  search?: string;
  owner_id?: string;
  contact_status?: string;
  lifecycle_stage?: string;
  lead_source?: string;
  company_name?: string;
  limit?: number;
  offset?: number;
}

export class ContactsController {
  // GET /api/contacts - List contacts with advanced filtering
  static async getContacts(req: Request, res: Response) {
    try {
      const {
        search,
        owner_id,
        contact_status,
        lifecycle_stage,
        lead_source,
        company_name,
        limit = 50,
        offset = 0
      } = req.query as ContactFilters;

      let query = supabase
        .from('contacts')
        .select(`
          *,
          owner:users!owner_id(id, name, email),
          created_by_user:users!created_by(id, name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (search) {
        query = query.or(`
          first_name.ilike.%${search}%,
          last_name.ilike.%${search}%,
          email.ilike.%${search}%,
          account_name.ilike.%${search}%,
          phone.ilike.%${search}%
        `);
      }

      if (owner_id) {
        query = query.eq('owner_id', owner_id);
      }

      if (contact_status) {
        query = query.eq('contact_status', contact_status);
      }

      if (lifecycle_stage) {
        query = query.eq('lifecycle_stage', lifecycle_stage);
      }

      if (lead_source) {
        query = query.eq('lead_source', lead_source);
      }

      if (company_name) {
        query = query.ilike('account_name', `%${company_name}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: contacts, error } = await query;

      if (error) {
        console.error('Error fetching contacts:', error);
        return res.status(500).json({ error: 'Failed to fetch contacts' });
      }

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      res.json({
        contacts,
        pagination: {
          total: totalCount || 0,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: (Number(offset) + Number(limit)) < (totalCount || 0)
        }
      });

    } catch (error) {
      console.error('Unexpected error in getContacts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/contacts/:id - Get single contact with full details
  static async getContact(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const { data: contact, error } = await supabase
        .from('contacts')
        .select(`
          *,
          owner:users!owner_id(id, name, email),
          created_by_user:users!created_by(id, name, email),
          deals:deals(
            id, deal_name, amount, deal_status, stage_id,
            pipeline:pipelines(id, name),
            stage:pipeline_stages(id, name)
          ),
          activities:activities(
            id, activity_type, subject, status, activity_date, due_date
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Contact not found' });
        }
        console.error('Error fetching contact:', error);
        return res.status(500).json({ error: 'Failed to fetch contact' });
      }

      res.json({ contact });

    } catch (error) {
      console.error('Unexpected error in getContact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/contacts - Create new contact
  static async createContact(req: Request, res: Response) {
    try {
      const contactData: Contact = req.body;
      const userId = req.user?.id;

      // Validate required fields
      if (!contactData.company_id) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      // Set default values
      const newContact: Contact = {
        ...contactData,
        created_by: userId,
        owner_id: contactData.owner_id || userId,
        contact_status: contactData.contact_status || 'active',
        lifecycle_stage: contactData.lifecycle_stage || 'lead',
        lead_source: contactData.lead_source || 'manual'
      };

      const { data: contact, error } = await supabase
        .from('contacts')
        .insert([newContact])
        .select(`
          *,
          owner:users!owner_id(id, name, email),
          created_by_user:users!created_by(id, name, email)
        `)
        .single();

      if (error) {
        console.error('Error creating contact:', error);
        return res.status(500).json({ error: 'Failed to create contact' });
      }

      console.log(`Contact created: ${contact.id} by user ${userId}`);
      res.status(201).json({ contact });

    } catch (error) {
      console.error('Unexpected error in createContact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT /api/contacts/:id - Update contact
  static async updateContact(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: Partial<Contact> = req.body;
      const userId = req.user?.id;

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.created_by;

      const { data: contact, error } = await supabase
        .from('contacts')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          owner:users!owner_id(id, name, email),
          created_by_user:users!created_by(id, name, email)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Contact not found' });
        }
        console.error('Error updating contact:', error);
        return res.status(500).json({ error: 'Failed to update contact' });
      }

      console.log(`Contact updated: ${id} by user ${userId}`);
      res.json({ contact });

    } catch (error) {
      console.error('Unexpected error in updateContact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE /api/contacts/:id - Delete contact
  static async deleteContact(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting contact:', error);
        return res.status(500).json({ error: 'Failed to delete contact' });
      }

      console.log(`Contact deleted: ${id} by user ${userId}`);
      res.json({ message: 'Contact deleted successfully' });

    } catch (error) {
      console.error('Unexpected error in deleteContact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/contacts/stats - Get contact statistics
  static async getContactStats(req: Request, res: Response) {
    try {
      const { owner_id } = req.query;

      let baseQuery = supabase.from('contacts').select('*', { count: 'exact', head: true });
      
      if (owner_id) {
        baseQuery = baseQuery.eq('owner_id', owner_id);
      }

      const [
        { count: totalContacts },
        { count: activeContacts },
        { count: leads },
        { count: prospects },
        { count: customers }
      ] = await Promise.all([
        baseQuery,
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('contact_status', 'active'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('lifecycle_stage', 'lead'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('lifecycle_stage', 'prospect'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('lifecycle_stage', 'customer')
      ]);

      res.json({
        totalContacts: totalContacts || 0,
        activeContacts: activeContacts || 0,
        byLifecycleStage: {
          leads: leads || 0,
          prospects: prospects || 0,
          customers: customers || 0
        },
        conversionRate: totalContacts ? ((customers || 0) / totalContacts * 100).toFixed(2) : '0.00'
      });

    } catch (error) {
      console.error('Unexpected error in getContactStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
