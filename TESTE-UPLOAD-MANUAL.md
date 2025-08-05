# 🧪 TESTE MANUAL - UPLOAD DE DOCUMENTOS

## 🎯 **CORREÇÕES APLICADAS:**

### **✅ PROBLEMA 1: POLÍTICAS RLS CORRIGIDAS**
- Banco: `lead_documents` table policies ✅
- Storage: `lead-documents` bucket policies ✅  
- Ambos usam `raw_user_meta_data` com fallback

### **✅ PROBLEMA 2: CONFIGURAÇÃO SUPABASE SIMPLIFICADA**
- Removido proxy complexo do `supabase.ts` ✅
- Cliente direto sem intermediários ✅
- Logs detalhados adicionados ✅

### **✅ PROBLEMA 3: BUCKET VALIDADO**
- Bucket 'lead-documents' existe ✅
- Criado em: 2025-07-28 14:22:56 ✅

### **✅ PROBLEMA 4: LOGS DETALHADOS**
- Upload com logs completos ✅
- Debug de cada etapa ✅

## 🧪 **TESTE MANUAL:**

1. **Acesse:** http://127.0.0.1:8080
2. **Clique em qualquer card de lead** (ex: carlos2, mkt8)
3. **No modal que abrir, clique na aba "Documentos"**
4. **Clique em "Anexar Documento"**
5. **Selecione um arquivo** (PNG, PDF, CSV)
6. **Aguarde o upload**

## 📊 **RESULTADO ESPERADO:**
- ✅ Upload bem-sucedido (sem erro 500)
- ✅ Documento aparece na lista
- ✅ Logs detalhados no backend
- ✅ Arquivo salvo no Supabase Storage

## 🔍 **LOGS PARA VERIFICAR:**
```
🔍 [UPLOAD DEBUG] Iniciando upload para Supabase Storage...
🔍 [UPLOAD DEBUG] Chamando supabase.storage.from().upload()...
🔍 [UPLOAD DEBUG] Upload para Storage finalizado
✅ [UPLOAD DEBUG] Upload completo finalizado com sucesso!
```

**SE AINDA DER ERRO 500:** Verificar logs do backend para identificar linha exata da falha.