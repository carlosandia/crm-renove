import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { useAuth } from '../../contexts/AuthContext';
import { showSuccessToast, showErrorToast } from '../../hooks/useToast';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import FieldMappingStep from './FieldMappingStep';
import { SystemFieldMapping, FieldMappingEngine } from '../../utils/fieldMappingEngine';

interface LeadsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

interface ParsedData {
  headers: string[];
  rows: any[];
  errors: any[];
}

interface ImportResult {
  totalProcessed: number;
  imported: number;
  errors: number;
  duplicates: number;
  validationErrors: any[];
  duplicateErrors: any[];
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'result';

const LeadsImportModal: React.FC<LeadsImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedMappings, setSelectedMappings] = useState<SystemFieldMapping[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const resetState = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setParsedData(null);
    setSelectedMappings([]);
    setIsUploading(false);
    setUploadProgress(0);
    setImportResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateFile = (file: File): boolean => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['.csv', '.xlsx'];
    const fileName = file.name.toLowerCase();
    
    if (file.size > maxSize) {
      showErrorToast('Arquivo muito grande', 'O arquivo deve ter no máximo 5MB.');
      return false;
    }

    if (!allowedTypes.some(type => fileName.endsWith(type))) {
      showErrorToast('Tipo inválido', 'Apenas arquivos CSV e XLSX são permitidos.');
      return false;
    }

    return true;
  };

  const parseCSVFile = (file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
      // Suprimir temporariamente warnings do Papa Parse
      const originalWarn = console.warn;
      console.warn = (...args) => {
        // Filtrar warnings específicos de headers duplicados
        if (args[0] && typeof args[0] === 'string' && args[0].includes('Duplicate headers found')) {
          return; // Não mostrar este warning
        }
        originalWarn.apply(console, args);
      };

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header, index) => {
          // Limpar header e lidar com headers vazios ou duplicados
          const cleanHeader = header.trim();
          if (!cleanHeader) {
            return `Coluna_${index + 1}`;
          }
          return cleanHeader;
        },
        complete: (results) => {
          // Restaurar console.warn original
          console.warn = originalWarn;
          
          let headers = results.meta.fields || [];
          const rows = results.data;
          // Filtrar apenas erros críticos, ignorar warnings de headers duplicados
          const errors = results.errors.filter(error => 
            error.type !== 'Quotes' && 
            error.type !== 'FieldMismatch' &&
            !error.message?.includes('Duplicate headers')
          );
          
          // Filtrar e limpar headers vazios ou inválidos
          headers = headers.filter(header => header && header.trim() && !header.startsWith('__parsed_extra'));
          
          console.log('📄 Headers processados:', headers.length > 10 ? `${headers.slice(0, 10).join(', ')}... (+${headers.length - 10} mais)` : headers.join(', '));
          console.log('📊 Total de colunas:', headers.length);
          console.log('📋 Primeiros dados:', rows.slice(0, 1));
          
          resolve({ headers, rows, errors });
        },
        error: (error) => {
          // Restaurar console.warn original em caso de erro
          console.warn = originalWarn;
          reject(error);
        }
      });
    });
  };

  const parseExcelFile = (file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            reject(new Error('Arquivo deve conter pelo menos uma linha de dados além do cabeçalho'));
            return;
          }

          let headers = (jsonData[0] as string[]).map((h, index) => {
            const cleanHeader = String(h).trim();
            if (!cleanHeader) {
              return `Coluna_${index + 1}`;
            }
            return cleanHeader;
          });

          // Filtrar headers vazios ou duplicados
          headers = headers.filter(header => header && header.trim());

          const rows = (jsonData.slice(1) as any[][]).map(row => {
            const record: any = {};
            headers.forEach((header, index) => {
              record[header] = row[index] || '';
            });
            return record;
          });

          console.log('📄 Headers Excel processados:', headers);
          console.log('📊 Dados Excel de exemplo:', rows.slice(0, 2));

          resolve({ headers, rows, errors: [] });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);
    
    try {
      let data: ParsedData;
      if (file.name.toLowerCase().endsWith('.csv')) {
        data = await parseCSVFile(file);
      } else {
        data = await parseExcelFile(file);
      }
      setParsedData(data);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      showErrorToast('Erro no arquivo', 'Não foi possível processar o arquivo.');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 'upload' && parsedData) {
      setCurrentStep('mapping');
    }
  };

  const handleBackStep = () => {
    if (currentStep === 'mapping') {
      setCurrentStep('upload');
    }
  };

  const handleMappingComplete = (mappings: SystemFieldMapping[]) => {
    setSelectedMappings(mappings);
    handleUpload(mappings);
  };

  const handleUpload = async (mappings?: SystemFieldMapping[]) => {
    if (!selectedFile || !user) return;

    const finalMappings = mappings || selectedMappings;
    setIsUploading(true);
    setUploadProgress(10);
    setCurrentStep('result');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Adicionar mapeamentos personalizados se disponíveis
      if (finalMappings.length > 0) {
        const customMapping: Record<string, string> = {};
        finalMappings
          .filter(m => m.isSelected && m.csvHeader)
          .forEach(m => {
            customMapping[m.csvHeader!] = m.systemField.key;
          });
        formData.append('fieldMapping', JSON.stringify(customMapping));
      }

      setUploadProgress(50);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';
      const response = await fetch(`${apiUrl}/api/leads/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-tenant-id': user.tenant_id,
          'x-user-id': user.id,
          'x-user-role': user.role,
        },
        body: formData,
      });

      setUploadProgress(80);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro no upload');
      }

      setUploadProgress(100);
      setImportResult(result.data);

      showSuccessToast(
        'Import concluído!',
        `${result.data.imported} leads importados com sucesso.`
      );

      // Recarregar lista de leads após importação bem-sucedida
      if (onImportSuccess) {
        console.log('🔄 Recarregando lista de leads após importação...');
        setTimeout(() => {
          onImportSuccess();
        }, 500);
      }

    } catch (error: any) {
      console.error('Erro no upload:', error);
      showErrorToast('Erro no import', error.message || 'Falha ao importar leads.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const renderFilePreview = () => {
    if (!parsedData) return null;

    // Usar o engine para mapear automaticamente
    const mappingEngine = new FieldMappingEngine();
    const autoMappings = mappingEngine.autoMapSystemFields(parsedData.headers, parsedData.rows);
    
    // Filtrar apenas campos que foram mapeados automaticamente com confiança > 0.5
    const recognizedFields = autoMappings.filter(m => m.csvHeader && m.confidence > 0.5);
    const requiredFieldsRecognized = recognizedFields.filter(m => m.systemField.required);

    return (
      <div className="mt-4 space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Preview dos dados:</h4>
        
        {parsedData.errors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-yellow-600" />
              <span className="text-sm text-yellow-800">
                {parsedData.errors.length} erro(s) encontrado(s) no arquivo
              </span>
            </div>
          </div>
        )}

        <div className="border rounded-md overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b">
            <div className="text-xs font-medium text-gray-600">
              <strong>Total de colunas detectadas:</strong> {parsedData.headers.length}
              <div className="mt-1 text-gray-500">
                {parsedData.headers.length > 10 ? 
                  `Primeiras 10: ${parsedData.headers.slice(0, 10).join(', ')}... (+${parsedData.headers.length - 10} mais)` :
                  parsedData.headers.join(', ')
                }
              </div>
            </div>
          </div>
          
          {/* Auto-reconhecimento inteligente */}
          <div className="bg-blue-50 px-3 py-2 border-b">
            <div className="text-xs font-medium text-blue-700 mb-1">
              🎯 Campos reconhecidos automaticamente ({recognizedFields.length} de {autoMappings.length}):
            </div>
            <div className="flex flex-wrap gap-1">
              {recognizedFields.map(mapping => (
                <span 
                  key={mapping.systemField.key} 
                  className={`px-2 py-1 rounded text-xs ${
                    mapping.systemField.required 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {mapping.systemField.label}{mapping.systemField.required && ' *'} ← {mapping.csvHeader}
                </span>
              ))}
              {recognizedFields.length === 0 && (
                <span className="text-xs text-gray-500">Nenhum campo reconhecido automaticamente</span>
              )}
            </div>
            {requiredFieldsRecognized.length > 0 && (
              <div className="mt-1 text-xs text-green-700">
                ✅ {requiredFieldsRecognized.length}/3 campos obrigatórios reconhecidos
              </div>
            )}
          </div>
          
          {/* Preview com campos do sistema */}
          <div className="bg-gray-50 px-3 py-2 border-b">
            <div className="text-xs font-medium text-gray-700 mb-1">Preview dos campos reconhecidos:</div>
            <div className="grid gap-2 text-xs font-medium text-gray-600" style={{gridTemplateColumns: `repeat(${Math.min(recognizedFields.length, 4)}, 1fr)`}}>
              {recognizedFields.slice(0, 4).map(mapping => (
                <div key={mapping.systemField.key} className="truncate" title={`${mapping.systemField.label} ← ${mapping.csvHeader}`}>
                  <span className={mapping.systemField.required ? 'text-green-700 font-semibold' : ''}>
                    {mapping.systemField.label}{mapping.systemField.required && ' *'}
                  </span>
                  <div className="text-xs text-gray-400">← {mapping.csvHeader}</div>
                </div>
              ))}
              {recognizedFields.length === 0 && (
                <div className="col-span-4 text-center text-gray-500">Configure o mapeamento na próxima etapa</div>
              )}
            </div>
          </div>
          
          <div className="max-h-40 overflow-y-auto">
            {parsedData.rows.slice(0, 5).map((row, index) => (
              <div key={index} className="px-3 py-2 border-b last:border-b-0">
                <div className="grid gap-2 text-xs text-gray-900" style={{gridTemplateColumns: `repeat(${Math.min(recognizedFields.length, 4)}, 1fr)`}}>
                  {recognizedFields.slice(0, 4).map(mapping => (
                    <span key={mapping.systemField.key} className="truncate" title={row[mapping.csvHeader!] || '-'}>
                      {row[mapping.csvHeader!] || '-'}
                    </span>
                  ))}
                  {recognizedFields.length === 0 && (
                    <div className="col-span-4 text-center text-gray-400 py-4">Dados serão organizados na próxima etapa</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Mostrando primeiras 5 linhas de {parsedData.rows.length} registros encontrados.
          </span>
          {recognizedFields.length > 0 && (
            <span className="text-blue-600">
              🎯 {recognizedFields.length} campo(s) reconhecido(s)
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderImportResult = () => {
    if (!importResult) return null;

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={20} className="text-green-600" />
          <h4 className="text-sm font-medium text-gray-900">Resultado da Importação</h4>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-green-50 p-3 rounded-md">
            <div className="text-green-800 font-medium">{importResult.imported}</div>
            <div className="text-green-600">Leads importados</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-gray-800 font-medium">{importResult.totalProcessed}</div>
            <div className="text-gray-600">Total processados</div>
          </div>
          {importResult.errors > 0 && (
            <div className="bg-red-50 p-3 rounded-md">
              <div className="text-red-800 font-medium">{importResult.errors}</div>
              <div className="text-red-600">Erros de validação</div>
            </div>
          )}
          {importResult.duplicates > 0 && (
            <div className="bg-yellow-50 p-3 rounded-md">
              <div className="text-yellow-800 font-medium">{importResult.duplicates}</div>
              <div className="text-yellow-600">Duplicados ignorados</div>
            </div>
          )}
        </div>

        {(importResult.validationErrors.length > 0 || importResult.duplicateErrors.length > 0) && (
          <div className="max-h-32 overflow-y-auto text-xs">
            {importResult.validationErrors.map((error, index) => (
              <div key={index} className="text-red-600 mb-1">
                Linha {error.line}: {error.error}
              </div>
            ))}
            {importResult.duplicateErrors.map((error, index) => (
              <div key={index} className="text-yellow-600 mb-1">
                Email duplicado: {error.email}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'upload': return 'Upload do Arquivo';
      case 'mapping': return 'Mapear Campos';
      case 'result': return 'Resultado da Importação';
      default: return 'Importar Leads';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'upload': return 'Faça upload de um arquivo CSV ou XLSX para importar leads em massa.';
      case 'mapping': return 'Configure como os campos do arquivo serão mapeados para o sistema.';
      case 'result': return 'Visualize o resultado da importação dos seus leads.';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={20} />
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Indicador de progresso */}
          <div className="flex items-center justify-center space-x-4 py-4">
            <div className={`flex items-center space-x-2 ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'upload' ? 'bg-blue-600 text-white' : 
                selectedFile ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">Upload</span>
            </div>
            <ArrowRight size={16} className="text-gray-300" />
            <div className={`flex items-center space-x-2 ${currentStep === 'mapping' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'mapping' ? 'bg-blue-600 text-white' : 
                selectedMappings.length > 0 ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Mapeamento</span>
            </div>
            <ArrowRight size={16} className="text-gray-300" />
            <div className={`flex items-center space-x-2 ${currentStep === 'result' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'result' ? 'bg-blue-600 text-white' : 
                importResult ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <span className="text-sm font-medium">Resultado</span>
            </div>
          </div>

          {/* Conteúdo do step atual */}
          {currentStep === 'upload' && (
            <>
              {/* Área de upload */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
            {selectedFile ? (
              <div className="space-y-2">
                <FileText size={48} className="mx-auto text-green-600" />
                <div className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setParsedData(null);
                  }}
                >
                  <X size={16} />
                  Remover
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload size={48} className="mx-auto text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Arraste e solte seu arquivo aqui
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ou clique para selecionar (CSV, XLSX - máx 5MB)
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Selecionar Arquivo
                </Button>
              </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Preview removido - apenas upload da planilha */}

              {/* Botões do step upload */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                
                {selectedFile && parsedData && (
                  <Button
                    onClick={handleNextStep}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Próximo: Mapear Campos
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Step de mapeamento */}
          {currentStep === 'mapping' && parsedData && (
            <FieldMappingStep
              headers={parsedData.headers}
              sampleData={parsedData.rows}
              onMappingComplete={handleMappingComplete}
              onBack={handleBackStep}
            />
          )}

          {/* Step de resultado */}
          {currentStep === 'result' && (
            <>
              {/* Progress bar */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processando importação...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {/* Resultado */}
              {renderImportResult()}

              {/* Botões do step resultado */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button onClick={handleClose}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadsImportModal;