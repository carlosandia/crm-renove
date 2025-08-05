# 🔍 INVESTIGAÇÃO: Por que cards não reconhecem todas as etapas?

## 🎯 OBJETIVO
Identificar por que o drag & drop só reconhece a etapa "Lead" ao invés de todas as etapas disponíveis.

## 🚀 COMO TESTAR

### 1. Iniciar o ambiente
```bash
cd /Users/carlosandia/CRM-MARKETING
npm run dev
```

### 2. Acessar o pipeline
- Abra: http://localhost:8080
- Faça login
- Entre em qualquer pipeline com múltiplas etapas

### 3. Abrir o Console de Debug
- Pressione **F12**
- Vá para aba **Console**

### 4. Iniciar o Drag (DEBUG AUTOMÁTICO)
- **Arraste qualquer card**
- O debug será ativado automaticamente
- Você verá logs detalhados no console

## 📊 LOGS ESPERADOS

Quando você arrastar um card, verá logs como estes:

```
🔍 [DRAG START] Debug ativado! Investigando drag do lead: xxx
🔍 [DRAG START] Encontradas 4 etapas na página:
  1. "Lead" (ID: stage-uuid1)
  2. "Qualificado" (ID: stage-uuid2)  
  3. "Ganho" (ID: stage-uuid3)
  4. "Perdido" (ID: stage-uuid4)

🔍 [RENDER] Renderizando 4 etapas: ["Lead", "Qualificado", "Ganho", "Perdido"]

🏗️ [KanbanColumn] Configurando etapa "Lead":
     - disabled: false
     - type: 'stage'
🏗️ [KanbanColumn] Configurando etapa "Qualificado":
     - disabled: true  ← 🚨 PROBLEMA POTENCIAL
     - type: 'stage'

🔍 [INVESTIGAÇÃO] Total containers detectados: 4
  1. Container ID: stage-uuid1
     - type: stage
     - disabled: false
  2. Container ID: stage-uuid2  
     - type: stage
     - disabled: true  ← 🚨 PROBLEMA!

🔍 [FILTRO] Analisando container stage-uuid1:
  ✅ ACEITO: Lead
🔍 [FILTRO] Analisando container stage-uuid2:
  ❌ REJEITADO: container.disabled = true

🎯 [RESULTADO] 1 etapas válidas de 4 total
  1. ✅ Lead (stage-uuid1)
```

## 🔍 DIAGNÓSTICOS POSSÍVEIS

### ❌ Problema 1: Etapas Desabilitadas
**Sintoma:** `❌ REJEITADO: container.disabled = true`
**Causa:** Propriedade `isDropDisabled` está `true` para algumas etapas
**Solução:** Investigar por que `isDropDisabled` é `true`

### ❌ Problema 2: Tipo Incorreto
**Sintoma:** `❌ REJEITADO: type undefined !== 'stage'`
**Causa:** Container não tem `data.current.type = 'stage'`
**Solução:** Verificar configuração do `useDroppable`

### ❌ Problema 3: Timing de Renderização
**Sintoma:** Containers detectados < Etapas renderizadas
**Causa:** Collision detection rodando antes dos containers estarem prontos
**Solução:** Ajustar `MeasuringStrategy`

## 📋 CHECKLIST DE VERIFICAÇÃO

Ao testar, verifique:

- [ ] **Quantas etapas são renderizadas?** (deve ser 3-4+)
- [ ] **Quantos containers são detectados?** (deve ser = etapas)  
- [ ] **Quantos containers são válidos?** (deve ser = containers)
- [ ] **Alguma etapa tem `disabled: true`?** (investigar por quê)
- [ ] **Todos containers têm `type: 'stage'`?** (deve ter)

## 🎯 PRÓXIMOS PASSOS

1. **Execute o teste** seguindo este roteiro
2. **Copie TODOS os logs** que começam com 🔍
3. **Identifique qual problema** está ocorrendo
4. **Reporte os logs** para análise

## 🛠️ HELPER ADICIONAL

Também disponível arquivo HTML de debug:
```
open debug-drag-investigation.html
```

Este arquivo contém instruções visuais e helpers de JavaScript para análise manual.