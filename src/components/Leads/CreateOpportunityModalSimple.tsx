import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Target, DollarSign, User, Mail, Phone, Building, 
  Loader2, Check, X 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface LeadMaster {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  assigned_to?: string;
}

interface Pipeline {
  id: string;
  name: string;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface CreateOpportunityModalProps {
  leadData: LeadMaster;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OpportunityFormData) => Promise<void>;
}

interface OpportunityFormData {
  nome_oportunidade: string;
  valor: string;
  pipeline_id: string;
  responsavel: string;
  lead_data: {
    nome: string;
    email: string;
    telefone: string;
    empresa: string;
  };
}

// ============================================
// SCHEMA DE VALIDAÇÃO
// ============================================

const opportunitySchema = z.object({
  nome_oportunidade: z.string()
    .min(2, "Nome da oportunidade deve ter pelo menos 2 caracteres")
    .max(100, "Nome da oportunidade deve ter no máximo 100 caracteres"),
  valor: z.string()
    .min(1, "Valor é obrigatório"),
  pipeline_id: z.string()
    .min(1, "Pipeline é obrigatório"),
  responsavel: z.string()
    .min(1, "Responsável é obrigatório"),
  nome: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string()
    .email("Email inválido"),
  telefone: z.string()
    .optional(),
  empresa: z.string()
    .optional(),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

// ============================================
// UTILITÁRIOS
// ============================================

const applyCurrencyMask = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const number = parseFloat(cleaned) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(number || 0);
};

const applyPhoneMask = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
  if (!match) return value;
  
  const [, area, first, second] = match;
  if (second) return `(${area}) ${first}-${second}`;
  if (first) return `(${area}) ${first}`;
  if (area) return `(${area}`;
  return '';
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const CreateOpportunityModalSimple: React.FC<CreateOpportunityModalProps> = ({
  leadData,
  isOpen,
  onClose,
  onSubmit
}) => {
  const { user } = useAuth();
  
  // Estados
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Configuração do formulário
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      nome_oportunidade: '',
      valor: 'R$ 0,00',
      pipeline_id: '',
      responsavel: '',
      nome: '',
      email: '',
      telefone: '',
      empresa: '',
    },
  });

  // ============================================
  // EFFECTS
  // ============================================

  // Carregar dados quando modal abrir
  useEffect(() => {
    if (isOpen && leadData) {
      // Pré-preencher dados do lead
      form.setValue('nome', `${leadData.first_name} ${leadData.last_name}`);
      form.setValue('email', leadData.email);
      form.setValue('telefone', leadData.phone || '');
      form.setValue('empresa', leadData.company || '');
      
      // Auto-sugerir nome da oportunidade
      form.setValue('nome_oportunidade', `Proposta - ${leadData.first_name} ${leadData.last_name}`);
      
      // Definir responsável padrão
      form.setValue('responsavel', leadData.assigned_to || user?.id || '');
      
      // Carregar pipelines e membros
      loadPipelines();
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        loadMembers();
      }
    }
  }, [isOpen, leadData, user, form]);

  // Reset form quando modal fechar
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  // ============================================
  // FUNÇÕES
  // ============================================

  const loadPipelines = async () => {
    try {
      setLoadingPipelines(true);
      const { data, error } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('tenant_id', user?.tenant_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPipelines(data || []);
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error);
    } finally {
      setLoadingPipelines(false);
    }
  };

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', user?.tenant_id)
        .eq('role', 'member')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSubmit = async (values: OpportunityFormValues) => {
    try {
      setIsSubmitting(true);
      
      const opportunityData: OpportunityFormData = {
        nome_oportunidade: values.nome_oportunidade,
        valor: values.valor,
        pipeline_id: values.pipeline_id,
        responsavel: values.responsavel,
        lead_data: {
          nome: values.nome,
          email: values.email,
          telefone: values.telefone || '',
          empresa: values.empresa || '',
        }
      };

      await onSubmit(opportunityData);
      onClose();
    } catch (error) {
      console.error('Erro ao criar oportunidade:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            Criar Nova Oportunidade
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            {/* SEÇÃO: INFORMAÇÕES DA OPORTUNIDADE */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Target className="h-4 w-4" />
                Informações da Oportunidade
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome da Oportunidade */}
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="nome_oportunidade"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Nome da Oportunidade</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Proposta - João Silva"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Valor Estimado */}
                <FormField
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Valor Estimado
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="R$ 0,00"
                          {...field}
                          onChange={(e) => {
                            const maskedValue = applyCurrencyMask(e.target.value);
                            field.onChange(maskedValue);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pipeline */}
                <FormField
                  control={form.control}
                  name="pipeline_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Pipeline</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={loadingPipelines}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              loadingPipelines ? "Carregando..." : "Selecione uma pipeline"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pipelines.map((pipeline) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* SEÇÃO: DADOS DO CONTATO */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="h-4 w-4" />
                Dados do Contato (preenchidos automaticamente)
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="João Silva"
                          {...field}
                          disabled
                          className="bg-gray-50 text-gray-700 cursor-not-allowed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="joao@empresa.com"
                          type="email"
                          {...field}
                          disabled
                          className="bg-gray-50 text-gray-700 cursor-not-allowed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Telefone */}
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Telefone
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(11) 99999-9999"
                          {...field}
                          disabled
                          className="bg-gray-50 text-gray-700 cursor-not-allowed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Empresa */}
                <FormField
                  control={form.control}
                  name="empresa"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        Empresa
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Empresa Ltda"
                          {...field}
                          disabled
                          className="bg-gray-50 text-gray-700 cursor-not-allowed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* SEÇÃO: RESPONSABILIDADE */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="h-4 w-4" />
                Responsabilidade
              </div>
              
              <FormField
                control={form.control}
                name="responsavel"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Responsável pela Oportunidade</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={loadingMembers}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            loadingMembers ? "Carregando..." : "Selecione um responsável"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </SelectItem>
                        ))}
                        {/* Adicionar usuário atual se for o único disponível */}
                        {members.length === 0 && user && (
                          <SelectItem value={user.id}>
                            {user.first_name} {user.last_name} (Você)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* AÇÕES */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Criar Oportunidade
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOpportunityModalSimple;