#!/bin/bash

# Script para corrigir URLs hardcoded malformados
echo "🔧 Corrigindo URLs hardcoded malformados..."

# Corrigir sintaxe malformada específica
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s/import\.meta\.env\.VITE_API_URL || 'http:\/\/127\.0\.0\.1:3001'/\${import.meta.env.VITE_API_URL || 'http:\/\/127.0.0.1:3001'}/g"

echo "✅ URLs corrigidos"