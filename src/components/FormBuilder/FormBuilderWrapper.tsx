
import React, { useEffect } from 'react';
import '../../styles/formio.css';

interface FormBuilderWrapperProps {
  children: React.ReactNode;
}

const FormBuilderWrapper: React.FC<FormBuilderWrapperProps> = ({ children }) => {
  useEffect(() => {
    // Garantir que o CSS customizado seja aplicado
    const formioContainer = document.querySelector('.formio-builder');
    if (formioContainer) {
      formioContainer.classList.add('formio-builder-custom');
    }

    // Aplicar estilos específicos quando necessário
    const applyCustomStyles = () => {
      const style = document.createElement('style');
      style.id = 'formio-custom-override';
      
      if (document.getElementById('formio-custom-override')) {
        return; // Já aplicado
      }

      style.textContent = `
        /* Garantir que o FormBuilder tenha altura adequada */
        .formio-builder-wrapper {
          min-height: 700px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        /* Corrigir qualquer conflito de CSS */
        .formio-builder .formbuilder {
          flex: 1 !important;
          min-height: 600px !important;
        }
        
        /* Melhorar visual dos tooltips */
        .formio-builder .tooltip {
          background: rgba(0, 0, 0, 0.9) !important;
          color: white !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          font-size: 12px !important;
          box-shadow: 0 4px 6px rgb(0 0 0 / 0.1) !important;
        }
        
        /* Melhorar feedback visual durante drag */
        .formio-builder .formcomponent.is-dragging {
          opacity: 0.5 !important;
          transform: rotate(5deg) !important;
          z-index: 1000 !important;
        }
        
        /* Garantir que modais do Form.io apareçam corretamente */
        .formio-dialog {
          z-index: 10000 !important;
        }
        
        .formio-dialog .modal-dialog {
          border-radius: 12px !important;
          overflow: hidden !important;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1) !important;
        }
        
        .formio-dialog .modal-header {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
          color: white !important;
          border-bottom: none !important;
        }
        
        .formio-dialog .modal-body {
          padding: 24px !important;
        }
      `;
      
      document.head.appendChild(style);
    };

    // Aplicar estilos imediatamente e após um pequeno delay
    applyCustomStyles();
    setTimeout(applyCustomStyles, 100);
    
    return () => {
      const customStyle = document.getElementById('formio-custom-override');
      if (customStyle) {
        customStyle.remove();
      }
    };
  }, []);

  return (
    <div className="formio-builder-wrapper">
      {children}
    </div>
  );
};

export default FormBuilderWrapper;
