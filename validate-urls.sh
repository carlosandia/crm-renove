#!/bin/bash

# 🔍 SCRIPT DE VALIDAÇÃO - URLs Duplicados TypeScript
# Detectar padrões de URL que causam duplicação /api/api/

echo "🔍 VALIDAÇÃO LOCAL - URLs Duplicados TypeScript"
echo "=============================================="
echo ""

# 1. Buscar URLs com prefixo /api/ hardcoded nos serviços
echo "📋 1. URLs com prefixo /api/ hardcoded:"
echo "--------------------------------------"

FOUND_ISSUES=0

# Buscar padrões problemáticos
echo "🔎 Analisando src/services/emailValidationService.ts:"
if grep -n "'/api/" src/services/emailValidationService.ts; then
  echo "❌ URLs com prefixo /api/ encontradas (causam duplicação)"
  FOUND_ISSUES=$((FOUND_ISSUES + 1))
else
  echo "✅ Nenhuma URL problemática encontrada"
fi

echo ""
echo "🔎 Analisando src/services/emailIntegrationApi.ts:"
if grep -n "'/api/" src/services/emailIntegrationApi.ts; then
  echo "❌ URLs com prefixo /api/ encontradas (causam duplicação)"
  FOUND_ISSUES=$((FOUND_ISSUES + 1))
else
  echo "✅ Nenhuma URL problemática encontrada"
fi

echo ""

# 2. Verificar configuração do base URL
echo "📋 2. Configuração Base URL:"
echo "---------------------------"
echo "src/lib/api.ts base URL config:"
grep -n "API_BASE_URL.*=" src/lib/api.ts

echo ""

# 3. Buscar outros arquivos com padrões similares
echo "📋 3. Outros arquivos com URLs potencialmente problemáticas:"
echo "----------------------------------------------------------"

# Buscar em todos os arquivos TypeScript
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "'/api/" | while read file; do
  if [[ "$file" != "src/lib/api.ts" ]]; then # Ignorar api.ts que está correto
    echo "⚠️  $file contém URLs com prefixo /api/:"
    grep -n "'/api/" "$file"
    echo ""
  fi
done

echo ""

# 4. Resultado da validação
echo "📊 RESULTADO DA VALIDAÇÃO:"
echo "========================="

if [ $FOUND_ISSUES -eq 0 ]; then
  echo "✅ SUCESSO: Nenhuma URL duplicada encontrada"
  echo "✅ Sistema pronto para deploy"
  exit 0
else
  echo "❌ PROBLEMAS ENCONTRADOS: $FOUND_ISSUES arquivos com URLs duplicadas"
  echo "❌ CORREÇÃO NECESSÁRIA antes do deploy"
  echo ""
  echo "💡 INSTRUÇÕES PARA CORREÇÃO:"
  echo "- Remover prefixo '/api/' de todas URLs encontradas"
  echo "- Usar apenas paths relativos (ex: '/email/integrations')"
  echo "- Executar este script novamente após correções"
  exit 1
fi