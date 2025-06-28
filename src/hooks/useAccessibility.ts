import { useEffect, useRef } from 'react';

// Hook para melhorar acessibilidade em tabelas e listas
export const useAccessibleTable = (data: any[]) => {
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (!tableRef.current) return;

    const table = tableRef.current;
    
    // Adicionar atributos ARIA
    table.setAttribute('role', 'table');
    table.setAttribute('aria-label', `Tabela com ${data.length} itens`);

    // Melhorar navegação por teclado nas células
    const cells = table.querySelectorAll('td, th');
    cells.forEach((cell, index) => {
      cell.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    // Navegação por setas
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target.matches('td, th')) return;

      const allCells = Array.from(cells);
      const currentIndex = allCells.indexOf(target);
      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = currentIndex + 1;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = currentIndex - 1;
          break;
        case 'ArrowDown':
          e.preventDefault();
          // Calcular próxima linha (assumindo estrutura regular)
          const columnsCount = table.querySelector('tr')?.children.length || 0;
          nextIndex = currentIndex + columnsCount;
          break;
        case 'ArrowUp':
          e.preventDefault();
          // Calcular linha anterior
          const colsCount = table.querySelector('tr')?.children.length || 0;
          nextIndex = currentIndex - colsCount;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = allCells.length - 1;
          break;
      }

      // Focar próxima célula se válida
      if (nextIndex >= 0 && nextIndex < allCells.length) {
        (allCells[nextIndex] as HTMLElement).focus();
        // Atualizar tabindex
        cells.forEach((cell, i) => {
          cell.setAttribute('tabindex', i === nextIndex ? '0' : '-1');
        });
      }
    };

    table.addEventListener('keydown', handleKeyDown);

    return () => {
      table.removeEventListener('keydown', handleKeyDown);
    };
  }, [data]);

  return tableRef;
};

// Hook para focus management em modais
export const useFocusManagement = (isOpen: boolean) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Salvar elemento atual com foco
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focar primeiro elemento focável no modal
    if (modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }

    // Restaurar foco quando modal fechar
    return () => {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  return modalRef;
};

// Hook para anunciar mudanças para screen readers
export const useScreenReaderAnnouncement = () => {
  const getOrCreateAnnouncementElement = (priority: 'polite' | 'assertive' = 'polite') => {
    let element = document.getElementById('screen-reader-announcements') as HTMLDivElement;
    
    if (!element) {
      element = document.createElement('div');
      element.id = 'screen-reader-announcements';
      element.setAttribute('aria-live', priority);
      element.setAttribute('aria-atomic', 'true');
      element.className = 'sr-only';
      document.body.appendChild(element);
    }
    
    return element;
  };

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const element = getOrCreateAnnouncementElement(priority);
    
    // Atualizar mensagem
    element.textContent = message;
    
    // Limpar após 1 segundo
    setTimeout(() => {
      element.textContent = '';
    }, 1000);
  };

  return { announce };
}; 