import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X, RotateCcw, Eye, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  FieldMapping, 
  SystemFieldMapping,
  ImportPreview, 
  SystemImportPreview,
  AVAILABLE_LEAD_FIELDS, 
  FieldMappingEngine 
} from '../../utils/fieldMappingEngine';

interface FieldMappingStepProps {
  headers: string[];
  sampleData: any[];
  onMappingComplete: (mappings: SystemFieldMapping[]) => void;
  onBack: () => void;
}

const FieldMappingStep: React.FC<FieldMappingStepProps> = ({
  headers,
  sampleData,
  onMappingComplete,
  onBack
}) => {
  const [systemMappings, setSystemMappings] = useState<SystemFieldMapping[]>([]);
  const [preview, setPreview] = useState<SystemImportPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [mappingEngine] = useState(() => new FieldMappingEngine());
  const [searchTerm, setSearchTerm] = useState('');

  // Inicializar mapeamentos automáticos com nova lógica invertida
  useEffect(() => {
    const initialSystemMappings = mappingEngine.autoMapSystemFields(headers, sampleData);
    setSystemMappings(initialSystemMappings);
  }, [headers, sampleData, mappingEngine]);

  // Atualizar preview quando mapeamentos mudam
  useEffect(() => {
    if (systemMappings.length > 0) {
      const newPreview = mappingEngine.generateSystemPreview(sampleData, systemMappings);
      setPreview(newPreview);
    }
  }, [systemMappings, sampleData, mappingEngine]);

  const updateSystemMapping = (systemFieldKey: string, csvHeader: string | null) => {
    setSystemMappings(prev => prev.map(mapping => {
      if (mapping.systemField.key === systemFieldKey) {
        return {
          ...mapping,
          csvHeader,
          isSelected: csvHeader !== null,
          sampleData: csvHeader ? mapping.availableOptions.includes(csvHeader) ? 
            sampleData.map(row => row[csvHeader]).filter(Boolean).slice(0, 3).map(String) : [] : [],
          confidence: csvHeader ? mapping.confidence : 0
        };
      }
      return mapping;
    }));
  };

  const toggleSystemFieldSelection = (systemFieldKey: string, isSelected: boolean) => {
    setSystemMappings(prev => prev.map(mapping => {
      if (mapping.systemField.key === systemFieldKey) {
        return { ...mapping, isSelected };
      }
      return mapping;
    }));
  };

  const resetMappings = () => {
    const resetSystemMappings = mappingEngine.autoMapSystemFields(headers, sampleData);
    setSystemMappings(resetSystemMappings);
  };

  const handleContinue = () => {
    if (preview) {
      onMappingComplete(systemMappings);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (confidence >= 0.3) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.6) return 'Média';
    if (confidence >= 0.3) return 'Baixa';
    return 'Sem confiança';
  };

  const selectedSystemMappings = systemMappings.filter(m => m.isSelected && m.csvHeader);
  const requiredFields = AVAILABLE_LEAD_FIELDS.filter(f => f.required);
  const mappedRequiredFields = requiredFields.filter(field => 
    selectedSystemMappings.some(m => m.systemField.key === field.key)
  );

  // Filtrar mapeamentos baseado na busca
  const filteredSystemMappings = systemMappings.filter(mapping => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      mapping.systemField.label.toLowerCase().includes(term) ||
      (mapping.csvHeader && mapping.csvHeader.toLowerCase().includes(term)) ||
      mapping.sampleData.some(sample => sample.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Mapear Campos do Arquivo</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure como os campos do seu arquivo serão importados para o sistema
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar campos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
            />
          </div>
          <Button variant="outline" size="sm" onClick={resetMappings}>
            <RotateCcw size={16} />
            Resetar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            <Eye size={16} />
            {showPreview ? 'Ocultar' : 'Preview'}
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {preview && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-900">{preview.totalRows}</div>
            <div className="text-sm text-blue-700">Registros encontrados</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-900">{preview.autoMappedCount}</div>
            <div className="text-sm text-green-700">Mapeados automaticamente</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-900">{selectedSystemMappings.length}</div>
            <div className="text-sm text-purple-700">Campos selecionados</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-900">{systemMappings.filter(m => !m.csvHeader).length}</div>
            <div className="text-sm text-orange-700">Não mapeados</div>
          </div>
        </div>
      )}

      {/* Avisos de validação - Versão compacta */}
      {preview && preview.validationWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-yellow-600" />
              <span className="font-medium text-yellow-800">
                {preview.validationWarnings.length} Aviso(s) de Validação
              </span>
            </div>
            <details className="text-sm">
              <summary className="text-yellow-700 cursor-pointer hover:text-yellow-800">
                Ver detalhes
              </summary>
              <div className="mt-2 pl-4 border-l-2 border-yellow-300 max-h-32 overflow-y-auto">
                {preview.validationWarnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-700 py-1">
                    • {warning}
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Verificação de campos obrigatórios - Versão compacta */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-gray-600" />
            <span className="font-medium text-gray-800">Campos Obrigatórios</span>
            <span className="text-sm text-gray-600">
              ({mappedRequiredFields.length}/{requiredFields.length} mapeados)
            </span>
          </div>
          {mappedRequiredFields.length < requiredFields.length && (
            <Badge variant="destructive" className="text-xs">
              ⚠️ Incompleto
            </Badge>
          )}
          {mappedRequiredFields.length === requiredFields.length && (
            <Badge variant="default" className="text-xs bg-green-600">
              ✓ Completo
            </Badge>
          )}
        </div>
        
        <details className="mt-2">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
            Ver campos obrigatórios
          </summary>
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-300">
            {requiredFields.map(field => {
              const isMapped = mappedRequiredFields.some(f => f.key === field.key);
              return (
                <Badge 
                  key={field.key} 
                  variant={isMapped ? "default" : "destructive"}
                  className="flex items-center gap-1 text-xs"
                >
                  {isMapped ? <CheckCircle size={10} /> : <X size={10} />}
                  {field.label}
                </Badge>
              );
            })}
          </div>
        </details>
      </div>

      {/* Lista de mapeamentos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Campos do Sistema</h4>
          {searchTerm && (
            <span className="text-sm text-gray-500">
              Mostrando {filteredSystemMappings.length} de {systemMappings.length} campos
            </span>
          )}
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredSystemMappings.map((mapping, index) => (
            <div key={mapping.systemField.key} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Campo do sistema */}
                <div className="col-span-3">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {mapping.systemField.label}
                    {mapping.systemField.required && <span className="text-red-500">*</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {mapping.systemField.description}
                  </div>
                  {mapping.sampleData.length > 0 && (
                    <div className="text-xs text-blue-600 mt-1">
                      Exemplos: {mapping.sampleData.slice(0, 2).join(', ')}
                      {mapping.sampleData.length > 2 && '...'}
                    </div>
                  )}
                </div>

                {/* Seletor de header da planilha */}
                <div className="col-span-4">
                  <select
                    value={mapping.csvHeader || ''}
                    onChange={(e) => updateSystemMapping(mapping.systemField.key, e.target.value || null)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Não mapear --</option>
                    {mapping.availableOptions.map(header => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                  
                  {/* Sugestões alternativas */}
                  {mapping.alternatives.length > 0 && !mapping.csvHeader && (
                    <div className="mt-1 text-xs text-gray-600">
                      Sugestões: {mapping.alternatives.join(', ')}
                    </div>
                  )}
                </div>

                {/* Confiança */}
                <div className="col-span-2">
                  {mapping.confidence > 0 && (
                    <Badge className={`${getConfidenceColor(mapping.confidence)} text-xs`}>
                      {getConfidenceLabel(mapping.confidence)}
                    </Badge>
                  )}
                </div>

                {/* Tipo do campo */}
                <div className="col-span-2">
                  <div className="text-xs text-gray-600">
                    Tipo: {mapping.systemField.type}
                  </div>
                  {mapping.csvHeader && (
                    <div className="text-xs text-blue-600 mt-1">
                      Mapeado: {mapping.csvHeader}
                    </div>
                  )}
                </div>

                {/* Checkbox de seleção */}
                <div className="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={mapping.isSelected}
                    onChange={(e) => toggleSystemFieldSelection(mapping.systemField.key, e.target.checked)}
                    disabled={!mapping.csvHeader}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview dos dados */}
      {showPreview && preview && (
        <div className="border border-gray-200 rounded-lg">
          <div className="p-4 border-b">
            <h4 className="font-medium text-gray-900">Preview dos Dados Mapeados</h4>
            <p className="text-xs text-gray-500 mt-1">
              Mostrando primeiras {preview.previewRows.length} linhas de {preview.totalRows} registros
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50">
                  {selectedSystemMappings.map(mapping => (
                    <th key={mapping.systemField.key} className="border-r border-gray-200 p-3 text-left font-medium whitespace-nowrap min-w-32">
                      {mapping.systemField.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.previewRows.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {selectedSystemMappings.map(mapping => (
                      <td key={mapping.systemField.key} className="border-r border-gray-200 p-3 whitespace-nowrap min-w-32">
                        <div className="truncate max-w-48" title={row[mapping.systemField.key] || '-'}>
                          {row[mapping.systemField.key] || '-'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            {selectedSystemMappings.length} campos selecionados para importação
          </div>
          <Button 
            onClick={handleContinue}
            disabled={selectedSystemMappings.length === 0 || mappedRequiredFields.length < requiredFields.length}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continuar Importação
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FieldMappingStep;