/**
 * Engine de Mapeamento Inteligente de Campos
 * Sistema para detectar e mapear automaticamente campos de planilhas para a estrutura leads_master
 */

export interface FieldMapping {
  csvHeader: string;          // Header original do arquivo
  dbField: string | null;     // Campo da tabela leads_master
  isSelected: boolean;        // Se deve ser importado
  confidence: number;         // Confiança da sugestão (0-1)
  sampleData: string[];       // Exemplos dos dados
  alternatives: string[];     // Sugestões alternativas
}

// Nova interface para mapeamento invertido (sistema → planilha)
export interface SystemFieldMapping {
  systemField: LeadField;     // Campo do sistema CRM
  csvHeader: string | null;   // Header da planilha mapeado
  isSelected: boolean;        // Se será importado
  confidence: number;         // Confiança da sugestão automática
  availableOptions: string[]; // Headers disponíveis da planilha
  sampleData: string[];       // Exemplos dos dados do header selecionado
  alternatives: string[];     // Headers alternativos sugeridos
}

export interface ImportPreview {
  mappings: FieldMapping[] | SystemFieldMapping[];
  totalRows: number;
  previewRows: any[];
  validationWarnings: string[];
  autoMappedCount: number;
  unmappedCount: number;
}

export interface SystemImportPreview {
  systemMappings: SystemFieldMapping[];
  totalRows: number;
  previewRows: any[];
  validationWarnings: string[];
  autoMappedCount: number;
  requiredFieldsMapped: number;
  totalRequiredFields: number;
}

export interface LeadField {
  key: string;
  label: string;
  type: 'string' | 'email' | 'phone' | 'number' | 'date';
  required: boolean;
  description: string;
}

// Estrutura completa dos campos disponíveis na tabela leads_master
export const AVAILABLE_LEAD_FIELDS: LeadField[] = [
  { key: 'first_name', label: 'Nome', type: 'string', required: true, description: 'Primeiro nome do lead' },
  { key: 'last_name', label: 'Sobrenome', type: 'string', required: false, description: 'Último nome do lead' },
  { key: 'email', label: 'Email', type: 'email', required: true, description: 'Endereço de email' },
  { key: 'phone', label: 'Telefone', type: 'phone', required: true, description: 'Número de telefone' },
  { key: 'company', label: 'Empresa', type: 'string', required: false, description: 'Nome da empresa' },
  { key: 'job_title', label: 'Cargo', type: 'string', required: false, description: 'Título do cargo' },
  { key: 'lead_source', label: 'Origem', type: 'string', required: false, description: 'Fonte do lead' },
  { key: 'lead_temperature', label: 'Temperatura', type: 'string', required: false, description: 'Temperatura do lead (Quente/Morno/Frio)' },
  { key: 'estimated_value', label: 'Valor Estimado', type: 'number', required: false, description: 'Valor estimado do negócio' },
  { key: 'campaign_name', label: 'Campanha', type: 'string', required: false, description: 'Nome da campanha de marketing' },
  { key: 'utm_source', label: 'UTM Source', type: 'string', required: false, description: 'Fonte UTM de marketing' },
  { key: 'utm_medium', label: 'UTM Medium', type: 'string', required: false, description: 'Meio UTM de marketing' },
  { key: 'utm_campaign', label: 'UTM Campaign', type: 'string', required: false, description: 'Campanha UTM de marketing' },
  { key: 'utm_term', label: 'UTM Term', type: 'string', required: false, description: 'Termo UTM de marketing' },
  { key: 'utm_content', label: 'UTM Content', type: 'string', required: false, description: 'Conteúdo UTM de marketing' },
  { key: 'city', label: 'Cidade', type: 'string', required: false, description: 'Cidade do lead' },
  { key: 'state', label: 'Estado', type: 'string', required: false, description: 'Estado/UF do lead' },
  { key: 'country', label: 'País', type: 'string', required: false, description: 'País do lead' },
  { key: 'notes', label: 'Observações', type: 'string', required: false, description: 'Notas e comentários sobre o lead' }
];

// Dicionário de sugestões para mapeamento inteligente
const FIELD_SUGGESTIONS: Record<string, string[]> = {
  first_name: [
    'nome', 'name', 'first name', 'primeiro nome', 'nome_primeiro', 'fname', 
    'firstname', 'prenome', 'cliente', 'contact', 'contato'
  ],
  last_name: [
    'sobrenome', 'surname', 'last name', 'ultimo nome', 'nome_ultimo', 'lname',
    'lastname', 'apellido', 'familia', 'family name'
  ],
  email: [
    'email', 'e-mail', 'mail', 'correo', 'electronic mail', 'endereco email',
    'email address', 'contact email', 'business email'
  ],
  phone: [
    'telefone', 'phone', 'tel', 'celular', 'mobile', 'whatsapp', 'fone',
    'telephone', 'cell', 'phone number', 'contact phone', 'numero'
  ],
  company: [
    'empresa', 'company', 'organizacao', 'organization', 'firma', 'corp',
    'corporation', 'business', 'companhia', 'org', 'negocio'
  ],
  job_title: [
    'cargo', 'position', 'job title', 'funcao', 'role', 'titulo', 'posicao',
    'job', 'occupation', 'profissao', 'function', 'post'
  ],
  lead_source: [
    'origem', 'source', 'fonte', 'lead source', 'origem lead', 'canal',
    'channel', 'meio', 'referencia', 'reference'
  ],
  lead_temperature: [
    'temperatura', 'temperature', 'temp', 'qualificacao', 'qualification',
    'prioridade', 'priority', 'interesse', 'interest'
  ],
  estimated_value: [
    'valor', 'value', 'valor estimado', 'estimated value', 'preco', 'price',
    'orcamento', 'budget', 'potential value', 'deal value'
  ],
  campaign_name: [
    'campanha', 'campaign', 'campaign name', 'nome campanha', 'marketing campaign',
    'promo', 'promocao', 'promotion'
  ],
  city: [
    'cidade', 'city', 'municipio', 'localidade', 'local', 'location'
  ],
  state: [
    'estado', 'state', 'uf', 'provincia', 'province', 'regiao', 'region'
  ],
  country: [
    'pais', 'country', 'nacao', 'nation', 'nacionalidade', 'nationality'
  ],
  notes: [
    'notas', 'notes', 'observacoes', 'comments', 'comentarios', 'obs',
    'observations', 'remarks', 'description', 'descricao'
  ]
};

// Padrões regex para detectar tipos de dados
const DATA_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[\(\)\d\s\-\.]{8,}$/,
  money: /^[\$\€\R\$]?[\d\.\,]+$/,
  date: /\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4}/,
  url: /^https?:\/\/.+/
};

export class FieldMappingEngine {
  /**
   * Mapeia automaticamente campos do sistema para headers do CSV (lógica invertida)
   */
  public autoMapSystemFields(headers: string[], sampleData: any[]): SystemFieldMapping[] {
    const systemMappings: SystemFieldMapping[] = [];

    // Para cada campo do sistema, encontrar o melhor header da planilha
    AVAILABLE_LEAD_FIELDS.forEach(systemField => {
      const bestMatch = this.findBestHeaderForSystemField(systemField, headers, sampleData);
      const alternatives = this.findAlternativeHeaders(systemField, headers, bestMatch?.header || null);
      
      systemMappings.push({
        systemField,
        csvHeader: bestMatch?.header || null,
        isSelected: bestMatch ? bestMatch.confidence > 0.7 : false,
        confidence: bestMatch?.confidence || 0,
        availableOptions: headers,
        sampleData: bestMatch ? this.getSampleDataForHeader(bestMatch.header, sampleData) : [],
        alternatives: alternatives
      });
    });

    return systemMappings;
  }

  /**
   * Mapeia automaticamente headers do CSV para campos da tabela leads_master (lógica original)
   */
  public autoMapFields(headers: string[], sampleData: any[]): FieldMapping[] {
    const mappings: FieldMapping[] = [];

    headers.forEach((header, index) => {
      const normalizedHeader = this.normalizeString(header);
      const columnData = sampleData.map(row => row[header]).filter(Boolean).slice(0, 3);
      
      // Tentar encontrar mapeamento direto
      const bestMatch = this.findBestMatch(normalizedHeader, columnData);
      const alternatives = this.findAlternatives(normalizedHeader, bestMatch?.field || null);
      
      mappings.push({
        csvHeader: header,
        dbField: bestMatch?.field || null,
        isSelected: bestMatch ? bestMatch.confidence > 0.7 : false,
        confidence: bestMatch?.confidence || 0,
        sampleData: columnData.map(String).slice(0, 3),
        alternatives: alternatives
      });
    });

    return mappings;
  }

  /**
   * Encontra a melhor correspondência para um header
   */
  private findBestMatch(normalizedHeader: string, columnData: any[]): { field: string; confidence: number } | null {
    let bestMatch: { field: string; confidence: number } | null = null;

    // Verificar correspondência por nome
    for (const [fieldKey, suggestions] of Object.entries(FIELD_SUGGESTIONS)) {
      const nameConfidence = this.calculateNameConfidence(normalizedHeader, suggestions);
      
      // Verificar correspondência por padrão de dados
      const dataConfidence = this.calculateDataConfidence(columnData, fieldKey);
      
      // Combinar as duas confianças (60% nome, 40% dados)
      const combinedConfidence = (nameConfidence * 0.6) + (dataConfidence * 0.4);
      
      if (combinedConfidence > (bestMatch?.confidence || 0) && combinedConfidence > 0.3) {
        bestMatch = { field: fieldKey, confidence: combinedConfidence };
      }
    }

    return bestMatch;
  }

  /**
   * Calcula confiança baseada na similaridade do nome
   */
  private calculateNameConfidence(normalizedHeader: string, suggestions: string[]): number {
    let maxConfidence = 0;

    for (const suggestion of suggestions) {
      const normalizedSuggestion = this.normalizeString(suggestion);
      
      // Correspondência exata
      if (normalizedHeader === normalizedSuggestion) {
        return 1.0;
      }
      
      // Correspondência por substring
      if (normalizedHeader.includes(normalizedSuggestion) || normalizedSuggestion.includes(normalizedHeader)) {
        maxConfidence = Math.max(maxConfidence, 0.8);
      }
      
      // Similaridade por distância de Levenshtein (simplificada)
      const similarity = this.calculateSimilarity(normalizedHeader, normalizedSuggestion);
      maxConfidence = Math.max(maxConfidence, similarity);
    }

    return maxConfidence;
  }

  /**
   * Calcula confiança baseada nos padrões dos dados
   */
  private calculateDataConfidence(columnData: any[], fieldKey: string): number {
    if (columnData.length === 0) return 0;

    const validData = columnData.filter(Boolean);
    if (validData.length === 0) return 0;

    let matches = 0;

    switch (fieldKey) {
      case 'email':
        matches = validData.filter(data => DATA_PATTERNS.email.test(String(data))).length;
        break;
      case 'phone':
        matches = validData.filter(data => DATA_PATTERNS.phone.test(String(data))).length;
        break;
      case 'estimated_value':
        matches = validData.filter(data => {
          const numValue = parseFloat(String(data).replace(/[^\d\.\,]/g, ''));
          return !isNaN(numValue) && numValue > 0;
        }).length;
        break;
      default:
        // Para campos de texto, verificar se não são vazios e têm comprimento razoável
        matches = validData.filter(data => {
          const str = String(data).trim();
          return str.length > 0 && str.length < 200;
        }).length;
    }

    return matches / validData.length;
  }

  /**
   * Encontra sugestões alternativas para um campo
   */
  private findAlternatives(normalizedHeader: string, excludeField: string | null): string[] {
    const alternatives: { field: string; confidence: number }[] = [];

    for (const [fieldKey, suggestions] of Object.entries(FIELD_SUGGESTIONS)) {
      if (fieldKey === excludeField) continue;

      const confidence = this.calculateNameConfidence(normalizedHeader, suggestions);
      if (confidence > 0.2) {
        alternatives.push({ field: fieldKey, confidence });
      }
    }

    return alternatives
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(alt => alt.field);
  }

  /**
   * Calcula similaridade entre duas strings (Levenshtein simplificado)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Algoritmo simplificado baseado em caracteres comuns
    const commonChars = new Set(str1.split('')).size;
    const totalChars = new Set([...str1, ...str2]).size;
    
    return commonChars / totalChars;
  }

  /**
   * Normaliza string para comparação
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '')  // Remove caracteres especiais
      .replace(/\s+/g, '');       // Remove espaços
  }

  /**
   * Valida dados de um campo específico
   */
  public validateFieldData(data: any[], fieldType: string): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let validCount = 0;

    for (const value of data) {
      if (!value) continue;

      switch (fieldType) {
        case 'email':
          if (DATA_PATTERNS.email.test(String(value))) {
            validCount++;
          } else {
            warnings.push(`Email inválido: ${value}`);
          }
          break;
        case 'phone':
          if (DATA_PATTERNS.phone.test(String(value))) {
            validCount++;
          } else {
            warnings.push(`Telefone inválido: ${value}`);
          }
          break;
        case 'number':
          const numValue = parseFloat(String(value));
          if (!isNaN(numValue)) {
            validCount++;
          } else {
            warnings.push(`Número inválido: ${value}`);
          }
          break;
        default:
          validCount++;
      }
    }

    const validPercentage = data.length > 0 ? validCount / data.length : 1;
    return {
      valid: validPercentage > 0.8,
      warnings: warnings.slice(0, 5) // Limitar a 5 avisos
    };
  }

  /**
   * Encontra o melhor header da planilha para um campo do sistema
   */
  private findBestHeaderForSystemField(systemField: LeadField, headers: string[], sampleData: any[]): { header: string; confidence: number } | null {
    let bestMatch: { header: string; confidence: number } | null = null;
    const fieldSuggestions = FIELD_SUGGESTIONS[systemField.key] || [];

    headers.forEach(header => {
      const normalizedHeader = this.normalizeString(header);
      const columnData = sampleData.map(row => row[header]).filter(Boolean).slice(0, 3);
      
      // Calcular confiança baseada no nome
      const nameConfidence = this.calculateNameConfidence(normalizedHeader, fieldSuggestions);
      
      // Calcular confiança baseada nos dados
      const dataConfidence = this.calculateDataConfidence(columnData, systemField.key);
      
      // Combinar confianças
      const combinedConfidence = (nameConfidence * 0.6) + (dataConfidence * 0.4);
      
      if (combinedConfidence > (bestMatch?.confidence || 0) && combinedConfidence > 0.3) {
        bestMatch = { header, confidence: combinedConfidence };
      }
    });

    return bestMatch;
  }

  /**
   * Encontra headers alternativos para um campo do sistema
   */
  private findAlternativeHeaders(systemField: LeadField, headers: string[], excludeHeader: string | null): string[] {
    const fieldSuggestions = FIELD_SUGGESTIONS[systemField.key] || [];
    const alternatives: { header: string; confidence: number }[] = [];

    headers.forEach(header => {
      if (header === excludeHeader) return;
      
      const normalizedHeader = this.normalizeString(header);
      const confidence = this.calculateNameConfidence(normalizedHeader, fieldSuggestions);
      
      if (confidence > 0.2) {
        alternatives.push({ header, confidence });
      }
    });

    return alternatives
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(alt => alt.header);
  }

  /**
   * Obtém dados de exemplo para um header específico
   */
  private getSampleDataForHeader(header: string, sampleData: any[]): string[] {
    return sampleData
      .map(row => row[header])
      .filter(Boolean)
      .slice(0, 3)
      .map(String);
  }

  /**
   * Gera preview dos dados mapeados com o novo sistema
   */
  public generateSystemPreview(data: any[], systemMappings: SystemFieldMapping[]): SystemImportPreview {
    const selectedMappings = systemMappings.filter(m => m.isSelected && m.csvHeader);
    const autoMappedCount = systemMappings.filter(m => m.confidence > 0.7).length;
    const requiredFields = AVAILABLE_LEAD_FIELDS.filter(f => f.required);
    const requiredFieldsMapped = requiredFields.filter(field => 
      selectedMappings.some(m => m.systemField.key === field.key)
    ).length;

    // Gerar preview das primeiras 5 linhas
    const previewRows = data.slice(0, 5).map(row => {
      const mappedRow: any = {};
      selectedMappings.forEach(mapping => {
        mappedRow[mapping.systemField.key] = row[mapping.csvHeader!];
      });
      return mappedRow;
    });

    // Gerar avisos de validação
    const validationWarnings: string[] = [];
    selectedMappings.forEach(mapping => {
      if (mapping.systemField.required) {
        const columnData = data.map(row => row[mapping.csvHeader!]).filter(Boolean);
        if (columnData.length < data.length * 0.9) {
          validationWarnings.push(`Campo obrigatório "${mapping.systemField.label}" possui muitos valores vazios`);
        }
      }
    });

    return {
      systemMappings,
      totalRows: data.length,
      previewRows,
      validationWarnings,
      autoMappedCount,
      requiredFieldsMapped,
      totalRequiredFields: requiredFields.length
    };
  }

  /**
   * Gera preview dos dados mapeados (método original)
   */
  public generatePreview(data: any[], mappings: FieldMapping[]): ImportPreview {
    const selectedMappings = mappings.filter(m => m.isSelected && m.dbField);
    const autoMappedCount = mappings.filter(m => m.confidence > 0.7).length;
    const unmappedCount = mappings.filter(m => !m.dbField).length;

    // Gerar preview das primeiras 5 linhas
    const previewRows = data.slice(0, 5).map(row => {
      const mappedRow: any = {};
      selectedMappings.forEach(mapping => {
        mappedRow[mapping.dbField!] = row[mapping.csvHeader];
      });
      return mappedRow;
    });

    // Gerar avisos de validação
    const validationWarnings: string[] = [];
    selectedMappings.forEach(mapping => {
      const field = AVAILABLE_LEAD_FIELDS.find(f => f.key === mapping.dbField);
      if (field && field.required) {
        const columnData = data.map(row => row[mapping.csvHeader]).filter(Boolean);
        if (columnData.length < data.length * 0.9) {
          validationWarnings.push(`Campo obrigatório "${field.label}" possui muitos valores vazios`);
        }
      }
    });

    return {
      mappings,
      totalRows: data.length,
      previewRows,
      validationWarnings,
      autoMappedCount,
      unmappedCount
    };
  }
}