# Correções de Altura - Kanban Board

## ✅ **Problema Identificado**
- Colunas Kanban ultrapassando a altura máxima da tela
- Botão "Criar Oportunidade" não ficando visível
- Falta de controle de scroll adequado

## 🔧 **Correções Implementadas**

### **1. Container Kanban**
```css
.kanban-container {
  height: calc(100vh - 220px); /* Mais espaço para header */
  max-height: calc(100vh - 220px);
}
```

### **2. Colunas Kanban**
```css
.kanban-column {
  height: calc(100vh - 252px); /* Altura fixa controlada */
  max-height: calc(100vh - 252px);
}
```

### **3. Header da Coluna**
```css
.kanban-column-header {
  padding: 12px 16px; /* Mais compacto */
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
```

### **4. Conteúdo da Coluna**
```css
.kanban-column-content {
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(100vh - 408px); /* Scroll quando necessário */
}
```

### **5. Footer da Coluna**
```css
.kanban-column-footer {
  min-height: 56px;
  display: flex;
  align-items: center; /* Botão sempre centralizado */
}
```

## 📏 **Cálculos de Altura**

- **Viewport total**: `100vh`
- **Descontos**:
  - Header da página: ~120px
  - Filtros: ~60px
  - Padding do container: ~32px
  - Margem de segurança: ~8px
- **Total descontado**: ~220px
- **Altura das colunas**: `100vh - 252px`

## 🎯 **Resultado Esperado**

- ✅ Colunas não ultrapassam a altura da tela
- ✅ Botão "Criar Oportunidade" sempre visível
- ✅ Scroll vertical no conteúdo quando necessário
- ✅ Layout uniforme em todas as colunas
- ✅ Footer fixo na parte inferior

## 🔍 **Verificação**

Para testar se está funcionando:
1. Verificar se o botão azul aparece na primeira coluna
2. Confirmar que as colunas não ultrapassam a tela
3. Testar scroll vertical quando há muitos leads
4. Verificar uniformidade em diferentes resoluções 