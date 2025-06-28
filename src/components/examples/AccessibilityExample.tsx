import React, { useState } from 'react';
import { useAccessibleTable, useFocusManagement, useScreenReaderAnnouncement } from '../../hooks/useAccessibility';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

// Exemplo de uso dos hooks de acessibilidade
const AccessibilityExample: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { announce } = useScreenReaderAnnouncement();
  
  // Dados de exemplo para tabela
  const tableData = [
    { id: 1, name: 'João Silva', email: 'joao@email.com', role: 'Admin' },
    { id: 2, name: 'Maria Santos', email: 'maria@email.com', role: 'User' },
    { id: 3, name: 'Pedro Costa', email: 'pedro@email.com', role: 'Editor' }
  ];

  // Hook para tabela acessível
  const tableRef = useAccessibleTable(tableData);
  
  // Hook para focus management no modal
  const modalRef = useFocusManagement(isModalOpen);

  const handleButtonClick = () => {
    announce('Dados da tabela atualizados', 'polite');
  };

  const openModal = () => {
    setIsModalOpen(true);
    announce('Modal aberto', 'polite');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    announce('Modal fechado', 'polite');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Exemplo de Acessibilidade</h2>
        <p className="text-muted-foreground mb-6">
          Esta página demonstra o uso dos hooks de acessibilidade criados.
        </p>
      </div>

      {/* Exemplo de botões acessíveis */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Botões com Anúncios</h3>
        
        <Button 
          onClick={handleButtonClick}
          aria-label="Atualizar dados da tabela"
        >
          Atualizar Dados
        </Button>
        
        <Button 
          onClick={openModal}
          aria-label="Abrir modal de exemplo"
        >
          Abrir Modal
        </Button>
      </div>

      {/* Exemplo de tabela acessível */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tabela Acessível</h3>
        <p className="text-sm text-muted-foreground">
          Use as setas do teclado para navegar, Home/End para ir ao início/fim
        </p>
        
        <div className="border rounded-lg overflow-hidden">
          <table 
            ref={tableRef}
            className="w-full border-collapse"
          >
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left border-r">Nome</th>
                <th className="p-3 text-left border-r">Email</th>
                <th className="p-3 text-left">Role</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((item) => (
                <tr key={item.id} className="border-t hover:bg-muted/50">
                  <td className="p-3 border-r">{item.name}</td>
                  <td className="p-3 border-r">{item.email}</td>
                  <td className="p-3">{item.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal com focus management */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent ref={modalRef} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modal Acessível</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p>
              Este modal demonstra o focus management. 
              O foco foi automaticamente movido para o primeiro elemento focável.
            </p>
            
            <div className="space-x-2">
              <Button onClick={closeModal}>
                Fechar
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => announce('Ação executada!', 'assertive')}
              >
                Executar Ação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instruções de uso */}
      <div className="bg-muted p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Como usar os hooks:</h3>
        
        <div className="space-y-2 text-sm">
          <div>
            <code className="bg-background px-2 py-1 rounded">useAccessibleTable(data)</code>
            - Melhora navegação por teclado em tabelas
          </div>
          
          <div>
            <code className="bg-background px-2 py-1 rounded">useFocusManagement(isOpen)</code>
            - Gerencia foco em modais e overlays
          </div>
          
          <div>
            <code className="bg-background px-2 py-1 rounded">useScreenReaderAnnouncement()</code>
            - Anuncia mudanças para screen readers
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityExample; 