import React, { useState, useEffect } from 'react';
import { Building, Target, User } from 'lucide-react';
import { CompanyModalProps, CompanyModalTab, IndustrySegment } from '../../types/Company';
import { useCompanyForm } from '../../hooks/useCompanyForm';
import CityAutocomplete from '../CityAutocomplete';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';

// Lista de nichos/segmentos baseada em CRMs enterprise
const INDUSTRY_SEGMENTS: IndustrySegment[] = [
  // Tecnologia
  { value: 'software', label: 'Software e TI', description: 'Desenvolvimento de software, consultoria em TI', category: 'Tecnologia' },
  { value: 'ecommerce', label: 'E-commerce', description: 'Lojas virtuais, marketplaces', category: 'Tecnologia' },
  { value: 'saas', label: 'SaaS', description: 'Software como serviço', category: 'Tecnologia' },
  { value: 'fintech', label: 'Fintech', description: 'Tecnologia financeira', category: 'Tecnologia' },
  
  // Marketing e Vendas
  { value: 'marketing_digital', label: 'Marketing Digital', description: 'Agências de marketing, publicidade online', category: 'Marketing' },
  { value: 'agencia_publicidade', label: 'Agência de Publicidade', description: 'Criação publicitária, campanhas', category: 'Marketing' },
  { value: 'social_media', label: 'Social Media', description: 'Gestão de redes sociais', category: 'Marketing' },
  { value: 'influencer_marketing', label: 'Influencer Marketing', description: 'Marketing de influência', category: 'Marketing' },
  
  // Consultoria
  { value: 'consultoria_empresarial', label: 'Consultoria Empresarial', description: 'Consultoria estratégica, gestão', category: 'Consultoria' },
  { value: 'consultoria_financeira', label: 'Consultoria Financeira', description: 'Planejamento financeiro, investimentos', category: 'Consultoria' },
  { value: 'consultoria_rh', label: 'Consultoria em RH', description: 'Recursos humanos, recrutamento', category: 'Consultoria' },
  { value: 'coaching', label: 'Coaching', description: 'Coaching pessoal e empresarial', category: 'Consultoria' },
  
  // Educação
  { value: 'educacao_online', label: 'Educação Online', description: 'Cursos online, plataformas de ensino', category: 'Educação' },
  { value: 'treinamento_corporativo', label: 'Treinamento Corporativo', description: 'Capacitação empresarial', category: 'Educação' },
  { value: 'escola_idiomas', label: 'Escola de Idiomas', description: 'Ensino de idiomas', category: 'Educação' },
  
  // Saúde e Bem-estar
  { value: 'clinica_medica', label: 'Clínica Médica', description: 'Serviços médicos, clínicas', category: 'Saúde' },
  { value: 'estetica', label: 'Estética e Beleza', description: 'Clínicas de estética, salões', category: 'Saúde' },
  { value: 'fitness', label: 'Fitness', description: 'Academias, personal trainer', category: 'Saúde' },
  { value: 'nutricao', label: 'Nutrição', description: 'Consultoria nutricional', category: 'Saúde' },
  
  // Imobiliário
  { value: 'imobiliaria', label: 'Imobiliária', description: 'Venda e locação de imóveis', category: 'Imobiliário' },
  { value: 'construcao', label: 'Construção Civil', description: 'Construtoras, engenharia', category: 'Imobiliário' },
  { value: 'arquitetura', label: 'Arquitetura', description: 'Projetos arquitetônicos', category: 'Imobiliário' },
  
  // Serviços
  { value: 'juridico', label: 'Jurídico', description: 'Escritórios de advocacia', category: 'Serviços' },
  { value: 'contabilidade', label: 'Contabilidade', description: 'Serviços contábeis', category: 'Serviços' },
  { value: 'turismo', label: 'Turismo', description: 'Agências de viagem, turismo', category: 'Serviços' },
  { value: 'eventos', label: 'Eventos', description: 'Organização de eventos', category: 'Serviços' },
  
  // Outros
  { value: 'outros', label: 'Outros', description: 'Outros segmentos não listados', category: 'Outros' }
];

const CompanyFormModal: React.FC<CompanyModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  company, 
  mode 
}) => {
  const [activeTab, setActiveTab] = useState('company');

  // ENTERPRISE FORM STATE
  const [formData, setFormData] = useState({
    // Company data
    name: '',
    industry: '',
    city: '',
    state: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    expected_leads_monthly: 0,
    expected_sales_monthly: 0,
    expected_followers_monthly: 0,
    // Admin data
    admin_name: '',
    admin_email: ''
  });

  const [emailValidation, setEmailValidation] = useState({
    isChecking: false,
    exists: false,
    message: ''
  });

  const { isSubmitting, submitCompanyForm, checkEmailAvailability } = useCompanyForm();

  // UTILITY FUNCTIONS
  const updateFormField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCityChange = (cityState: string) => {
    const [city, state] = cityState.split('/');
    setFormData(prev => ({ ...prev, city: city || '', state: state || '' }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      industry: '',
      city: '',
      state: '',
      website: '',
      phone: '',
      email: '',
      address: '',
      expected_leads_monthly: 0,
      expected_sales_monthly: 0,
      expected_followers_monthly: 0,
      admin_name: '',
      admin_email: ''
    });
  };

  const resetValidations = () => {
    setEmailValidation({
      isChecking: false,
      exists: false,
      message: ''
    });
  };

  // Carregar dados da empresa se estiver editando
  useEffect(() => {
    if (isOpen && company && mode === 'edit') {
      setFormData({
        name: company.name || '',
        industry: company.industry || '',
        city: company.city || '',
        state: company.state || '',
        website: company.website || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
        expected_leads_monthly: company.expected_leads_monthly || 0,
        expected_sales_monthly: company.expected_sales_monthly || 0,
        expected_followers_monthly: company.expected_followers_monthly || 0,
        admin_name: '',
        admin_email: ''
      });
    } else if (isOpen && mode === 'create') {
      resetForm();
      resetValidations();
    }
  }, [isOpen, company, mode]);

  // Validar email em tempo real
  useEffect(() => {
    if (formData.admin_email && mode === 'create') {
      const validateEmailAsync = async () => {
        setEmailValidation({ isChecking: true, exists: false, message: 'Verificando email...' });
        
        try {
          const result = await checkEmailAvailability(formData.admin_email);
          setEmailValidation({
            isChecking: false,
            exists: !result.available,
            message: result.message
          });
        } catch (error) {
          console.error('Erro ao validar email:', error);
          setEmailValidation({
            isChecking: false,
            exists: false,
            message: 'Erro ao verificar email'
          });
        }
      };

      const timeoutId = setTimeout(validateEmailAsync, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.admin_email, mode]);

  // SUBMIT HANDLER
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validações básicas
      if (!formData.name || !formData.industry || !formData.city || !formData.state) {
        throw new Error('Preencha todos os campos obrigatórios da empresa');
      }

      if (mode === 'create' && (!formData.admin_name || !formData.admin_email)) {
        throw new Error('Preencha todos os campos do administrador');
      }

      if (mode === 'create' && emailValidation.exists) {
        throw new Error('Email já está em uso por outro administrador');
      }

      // Preparar dados da empresa
      const companyData = {
        name: formData.name,
        industry: formData.industry,
        city: formData.city,
        state: formData.state,
        website: formData.website,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        expected_leads_monthly: formData.expected_leads_monthly,
        expected_sales_monthly: formData.expected_sales_monthly,
        expected_followers_monthly: formData.expected_followers_monthly
      };

      // Preparar dados do admin (apenas para criação)
      const adminData = mode === 'create' ? {
        name: formData.admin_name,
        email: formData.admin_email,
        password: '123456' // Senha padrão que será substituída na ativação
      } : undefined;

      // Submeter formulário
      const result = await submitCompanyForm(companyData, adminData);
      
      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        throw new Error(result.message || 'Erro ao processar formulário');
      }

    } catch (error: any) {
      console.error('Erro na submissão:', error);
      // O hook já mostra o toast de erro
    }
  };

  const handleClose = () => {
    setActiveTab('company');
    resetForm();
    resetValidations();
    onClose();
  };

  const canProceedToNextTab = () => {
    if (activeTab === 'company') {
      return formData.name && formData.industry && formData.city && formData.state;
    }
    if (activeTab === 'expectations') {
      return true; // Expectativas são opcionais
    }
    return true;
  };

  const handleNextTab = () => {
    if (activeTab === 'company' && canProceedToNextTab()) {
      setActiveTab('expectations');
    } else if (activeTab === 'expectations') {
      setActiveTab('admin');
    }
  };

  // Agrupar segmentos por categoria
  const segmentsByCategory = INDUSTRY_SEGMENTS.reduce((acc, segment) => {
    if (!acc[segment.category]) {
      acc[segment.category] = [];
    }
    acc[segment.category].push(segment);
    return acc;
  }, {} as Record<string, IndustrySegment[]>);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            {mode === 'create' ? 'Nova Empresa' : 'Editar Empresa'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Dados da Empresa
            </TabsTrigger>
            <TabsTrigger value="expectations" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Expectativas
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2" disabled={mode === 'edit'}>
              <User className="w-4 h-4" />
              Administrador
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-1">
            <form onSubmit={handleSubmit} className="space-y-6">
              <TabsContent value="company" className="space-y-6">
                <Alert>
                  <Building className="w-4 h-4" />
                  <AlertDescription>
                    Configure os dados principais da empresa que será cadastrada no sistema.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Empresa *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      placeholder="Ex: Empresa LTDA"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Segmento/Nicho *</Label>
                    <Select value={formData.industry} onValueChange={(value) => updateFormField('industry', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o segmento" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(segmentsByCategory).map(([category, segments]) => (
                          <div key={category}>
                            <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                              {category}
                            </div>
                            {segments.map((segment) => (
                              <SelectItem key={segment.value} value={segment.value}>
                                <div className="flex flex-col">
                                  <span>{segment.label}</span>
                                  <span className="text-xs text-muted-foreground">{segment.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade/Estado *</Label>
                    <CityAutocomplete
                      value={formData.city && formData.state ? `${formData.city}/${formData.state}` : ''}
                      onChange={handleCityChange}
                      placeholder="Digite a cidade..."
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => updateFormField('website', e.target.value)}
                      placeholder="https://www.empresa.com.br"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormField('phone', e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email da Empresa</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormField('email', e.target.value)}
                      placeholder="contato@empresa.com.br"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Endereço Completo</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => updateFormField('address', e.target.value)}
                      placeholder="Rua, número, bairro, CEP..."
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="expectations" className="space-y-6">
                <Alert>
                  <Target className="w-4 h-4" />
                  <AlertDescription>
                    Configure as expectativas mensais da empresa para acompanhamento de performance.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="leads">Leads Esperados/Mês</Label>
                    <Input
                      id="leads"
                      type="number"
                      min="0"
                      value={formData.expected_leads_monthly || ''}
                      onChange={(e) => updateFormField('expected_leads_monthly', parseInt(e.target.value) || 0)}
                      placeholder="Ex: 100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sales">Vendas Esperadas/Mês</Label>
                    <Input
                      id="sales"
                      type="number"
                      min="0"
                      value={formData.expected_sales_monthly || ''}
                      onChange={(e) => updateFormField('expected_sales_monthly', parseInt(e.target.value) || 0)}
                      placeholder="Ex: 20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="followers">Seguidores Esperados/Mês</Label>
                    <Input
                      id="followers"
                      type="number"
                      min="0"
                      value={formData.expected_followers_monthly || ''}
                      onChange={(e) => updateFormField('expected_followers_monthly', parseInt(e.target.value) || 0)}
                      placeholder="Ex: 500"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="admin" className="space-y-6">
                {mode === 'create' && (
                  <>
                    <Alert>
                      <User className="w-4 h-4" />
                      <AlertDescription>
                        Configure o administrador responsável pela empresa. Um email de ativação será enviado.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="admin_name">Nome do Administrador *</Label>
                        <Input
                          id="admin_name"
                          value={formData.admin_name}
                          onChange={(e) => updateFormField('admin_name', e.target.value)}
                          placeholder="Nome completo"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admin_email">Email do Administrador *</Label>
                        <Input
                          id="admin_email"
                          type="email"
                          value={formData.admin_email}
                          onChange={(e) => updateFormField('admin_email', e.target.value)}
                          placeholder="admin@empresa.com.br"
                          required
                        />
                        {emailValidation.message && (
                          <Alert variant={emailValidation.exists ? "destructive" : "default"}>
                            <AlertDescription>{emailValidation.message}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </>
                )}
                
                {mode === 'edit' && (
                  <Alert>
                    <User className="w-4 h-4" />
                    <AlertDescription>
                      O administrador só pode ser definido durante a criação da empresa.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </form>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {activeTab !== 'admin' && canProceedToNextTab() && (
            <Button onClick={handleNextTab}>
              Próximo
            </Button>
          )}
          {(activeTab === 'admin' || mode === 'edit') && (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || (mode === 'create' && emailValidation.exists)}
            >
              {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar Empresa' : 'Salvar Alterações'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyFormModal;