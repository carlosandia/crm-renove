// Arquivo interno TypeScript para lógica de embed
// Este arquivo será compilado para o form-embed.js público

interface EmbedConfig {
  formId: string;
  formType: string;
  domain: string;
  security: {
    domainRestriction: boolean;
    allowedDomains: string[];
    httpsOnly: boolean;
  };
  customization: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    borderRadius: string;
    animation: boolean;
  };
  behavior: {
    autoLoad: boolean;
    lazyLoad: boolean;
    closeOnSuccess: boolean;
    showPoweredBy: boolean;
  };
  tracking: {
    analytics: boolean;
    gtag: string;
    fbPixel: string;
  };
  version: string;
}

interface FormData {
  name: string;
  email: string;
  phone?: string;
  [key: string]: any;
}

class CRMFormEmbed {
  private forms: Map<string, any> = new Map();
  private config: EmbedConfig | null = null;
  
  constructor() {
    this.initializeGlobalHandlers();
  }

  init(formId: string, config: EmbedConfig): void {
    this.config = config;
    
    // Validações de segurança
    if (!this.validateSecurity(config)) {
      console.error('CRM Form: Falha na validação de segurança');
      return;
    }

    // Verificar se deve carregar imediatamente ou com lazy loading
    if (config.behavior.lazyLoad) {
      this.setupLazyLoading(formId, config);
    } else {
      this.loadForm(formId, config);
    }
  }

  private validateSecurity(config: EmbedConfig): boolean {
    const currentDomain = window.location.hostname;
    
    // Verificar HTTPS
    if (config.security.httpsOnly && window.location.protocol !== 'https:') {
      return false;
    }

    // Verificar domínios permitidos
    if (config.security.domainRestriction) {
      return config.security.allowedDomains.some(domain => 
        currentDomain === domain || currentDomain.endsWith('.' + domain)
      );
    }

    return true;
  }

  private setupLazyLoading(formId: string, config: EmbedConfig): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadForm(formId, config);
          observer.unobserve(entry.target);
        }
      });
    });

    const formContainer = document.getElementById(`crm-form-${formId}`);
    if (formContainer) {
      observer.observe(formContainer);
    }
  }

  private async loadForm(formId: string, config: EmbedConfig): Promise<void> {
    try {
      // Buscar dados do formulário
      const formData = await this.fetchFormData(formId, config);
      
      // Renderizar formulário
      this.renderForm(formId, formData, config);
      
      // Configurar tracking
      this.setupTracking(formId, config);
      
      // Salvar referência
      this.forms.set(formId, { config, formData });

    } catch (error) {
      console.error('CRM Form: Erro ao carregar formulário', error);
      this.showError(formId, 'Erro ao carregar formulário');
    }
  }

  private async fetchFormData(formId: string, config: EmbedConfig): Promise<any> {
    const response = await fetch(`${config.domain}/api/forms/${formId}/render`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  private renderForm(formId: string, formData: any, config: EmbedConfig): void {
    const container = document.getElementById(`crm-form-${formId}`);
    if (!container) return;

    // Aplicar estilos baseados na configuração
    this.applyStyles(container, config);

    // Gerar HTML do formulário
    const formHTML = this.generateFormHTML(formData, config);
    
    // Renderizar baseado no tipo
    switch (config.formType) {
      case 'exit_intent':
        this.renderExitIntentForm(container, formHTML, config);
        break;
      case 'scroll_trigger':
        this.renderScrollTriggerForm(container, formHTML, config);
        break;
      case 'time_delayed':
        this.renderTimeDelayedForm(container, formHTML, config);
        break;
      default:
        container.innerHTML = formHTML;
    }

    // Configurar eventos
    this.setupFormEvents(formId, config);
  }

  private generateFormHTML(formData: any, config: EmbedConfig): string {
    const fields = formData.fields || [];
    
    let fieldsHTML = fields.map((field: any) => {
      switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
          return `
            <div class="crm-field">
              <label class="crm-label">${field.label}${field.required ? ' *' : ''}</label>
              <input 
                type="${field.type}"
                name="${field.name}"
                placeholder="${field.placeholder || ''}"
                class="crm-input"
                ${field.required ? 'required' : ''}
              />
            </div>
          `;
        case 'textarea':
          return `
            <div class="crm-field">
              <label class="crm-label">${field.label}${field.required ? ' *' : ''}</label>
              <textarea 
                name="${field.name}"
                placeholder="${field.placeholder || ''}"
                class="crm-textarea"
                ${field.required ? 'required' : ''}
              ></textarea>
            </div>
          `;
        case 'select':
          const options = field.options.map((opt: any) => 
            `<option value="${opt.value}">${opt.label}</option>`
          ).join('');
          return `
            <div class="crm-field">
              <label class="crm-label">${field.label}${field.required ? ' *' : ''}</label>
              <select name="${field.name}" class="crm-select" ${field.required ? 'required' : ''}>
                <option value="">Selecione...</option>
                ${options}
              </select>
            </div>
          `;
        default:
          return '';
      }
    }).join('');

    return `
      <form class="crm-form" id="crm-form-${formData.id}">
        <div class="crm-form-header">
          <h3 class="crm-form-title">${formData.name}</h3>
          ${formData.description ? `<p class="crm-form-description">${formData.description}</p>` : ''}
        </div>
        <div class="crm-form-fields">
          ${fieldsHTML}
        </div>
        <div class="crm-form-actions">
          <button type="submit" class="crm-submit-btn">
            <span class="crm-btn-text">${formData.submitText || 'Enviar'}</span>
            <span class="crm-btn-loading" style="display: none;">Enviando...</span>
          </button>
        </div>
        ${config.behavior.showPoweredBy ? '<div class="crm-powered-by">Powered by <a href="#" target="_blank">CRM Marketing</a></div>' : ''}
      </form>
    `;
  }

  private applyStyles(container: HTMLElement, config: EmbedConfig): void {
    const styles = `
      <style>
        .crm-form {
          max-width: 500px;
          margin: 0 auto;
          padding: 24px;
          border-radius: ${config.customization.borderRadius};
          background: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          font-family: system-ui, -apple-system, sans-serif;
        }
        .crm-form-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: ${config.customization.primaryColor};
        }
        .crm-form-description {
          color: #666;
          margin-bottom: 20px;
        }
        .crm-field {
          margin-bottom: 16px;
        }
        .crm-label {
          display: block;
          font-weight: 500;
          margin-bottom: 6px;
          color: #374151;
        }
        .crm-input, .crm-textarea, .crm-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        .crm-input:focus, .crm-textarea:focus, .crm-select:focus {
          outline: none;
          border-color: ${config.customization.primaryColor};
          box-shadow: 0 0 0 3px ${config.customization.primaryColor}20;
        }
        .crm-submit-btn {
          width: 100%;
          background: ${config.customization.primaryColor};
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .crm-submit-btn:hover {
          opacity: 0.9;
        }
        .crm-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .crm-powered-by {
          text-align: center;
          margin-top: 16px;
          font-size: 12px;
          color: #9ca3af;
        }
        .crm-powered-by a {
          color: inherit;
          text-decoration: none;
        }
        ${config.customization.theme === 'dark' ? this.getDarkModeStyles() : ''}
      </style>
    `;

    container.insertAdjacentHTML('beforebegin', styles);
  }

  private getDarkModeStyles(): string {
    return `
      .crm-form {
        background: #1f2937;
        color: white;
      }
      .crm-label {
        color: #f3f4f6;
      }
      .crm-input, .crm-textarea, .crm-select {
        background: #374151;
        border-color: #4b5563;
        color: white;
      }
    `;
  }

  private renderExitIntentForm(container: HTMLElement, formHTML: string, config: EmbedConfig): void {
    let exitIntentShown = false;

    document.addEventListener('mouseleave', (e) => {
      if (e.clientY <= 0 && !exitIntentShown) {
        this.showModal(formHTML, config);
        exitIntentShown = true;
      }
    });
  }

  private renderScrollTriggerForm(container: HTMLElement, formHTML: string, config: EmbedConfig): void {
    let scrollTriggered = false;
    const triggerPercent = 70; // 70% da página

    window.addEventListener('scroll', () => {
      if (scrollTriggered) return;

      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      
      if (scrollPercent >= triggerPercent) {
        this.showModal(formHTML, config);
        scrollTriggered = true;
      }
    });
  }

  private renderTimeDelayedForm(container: HTMLElement, formHTML: string, config: EmbedConfig): void {
    const delay = 5000; // 5 segundos padrão

    setTimeout(() => {
      this.showModal(formHTML, config);
    }, delay);
  }

  private showModal(formHTML: string, config: EmbedConfig): void {
    const modal = document.createElement('div');
    modal.className = 'crm-modal-overlay';
    modal.innerHTML = `
      <div class="crm-modal">
        <button class="crm-modal-close">&times;</button>
        ${formHTML}
      </div>
    `;

    document.body.appendChild(modal);

    // Fechar modal
    modal.querySelector('.crm-modal-close')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  private setupFormEvents(formId: string, config: EmbedConfig): void {
    const form = document.getElementById(`crm-form-${formId}`) as HTMLFormElement;
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleFormSubmit(form, formId, config);
    });
  }

  private async handleFormSubmit(form: HTMLFormElement, formId: string, config: EmbedConfig): Promise<void> {
    const submitBtn = form.querySelector('.crm-submit-btn') as HTMLButtonElement;
    const btnText = submitBtn?.querySelector('.crm-btn-text') as HTMLElement;
    const btnLoading = submitBtn?.querySelector('.crm-btn-loading') as HTMLElement;

    // Loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';

    try {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const response = await fetch(`${config.domain}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        this.handleSuccess(form, config);
        this.trackEvent('form_submit_success', formId, config);
      } else {
        throw new Error('Erro no envio');
      }

    } catch (error) {
      this.handleError(form, 'Erro ao enviar formulário');
      this.trackEvent('form_submit_error', formId, config);
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
    }
  }

  private handleSuccess(form: HTMLFormElement, config: EmbedConfig): void {
    form.innerHTML = `
      <div class="crm-success-message">
        <h3>Obrigado!</h3>
        <p>Seu formulário foi enviado com sucesso.</p>
      </div>
    `;

    if (config.behavior.closeOnSuccess) {
      setTimeout(() => {
        const modal = form.closest('.crm-modal-overlay');
        if (modal) {
          document.body.removeChild(modal);
        }
      }, 2000);
    }
  }

  private handleError(form: HTMLFormElement, message: string): void {
    let errorDiv = form.querySelector('.crm-error-message') as HTMLElement;
    
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'crm-error-message';
      form.insertBefore(errorDiv, form.firstChild);
    }

    errorDiv.innerHTML = `<p style="color: #ef4444; margin-bottom: 16px;">${message}</p>`;
  }

  private showError(formId: string, message: string): void {
    const container = document.getElementById(`crm-form-${formId}`);
    if (container) {
      container.innerHTML = `
        <div class="crm-error">
          <p>${message}</p>
        </div>
      `;
    }
  }

  private setupTracking(formId: string, config: EmbedConfig): void {
    if (!config.tracking.analytics) return;

    // Google Analytics
    if (config.tracking.gtag && (window as any).gtag) {
      (window as any).gtag('event', 'form_view', {
        form_id: formId,
        form_type: config.formType
      });
    }

    // Facebook Pixel
    if (config.tracking.fbPixel && (window as any).fbq) {
      (window as any).fbq('track', 'ViewContent', {
        content_name: `Form ${formId}`,
        content_category: config.formType
      });
    }
  }

  private trackEvent(event: string, formId: string, config: EmbedConfig): void {
    if (!config.tracking.analytics) return;

    // Google Analytics
    if (config.tracking.gtag && (window as any).gtag) {
      (window as any).gtag('event', event, {
        form_id: formId,
        form_type: config.formType
      });
    }

    // Facebook Pixel
    if (config.tracking.fbPixel && (window as any).fbq) {
      const fbEvent = event === 'form_submit_success' ? 'Lead' : 'CustomEvent';
      (window as any).fbq('track', fbEvent, {
        content_name: `Form ${formId}`,
        content_category: config.formType
      });
    }
  }

  private initializeGlobalHandlers(): void {
    // Adicionar estilos globais para modais
    const globalStyles = `
      <style>
        .crm-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .crm-modal {
          position: relative;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .crm-modal-close {
          position: absolute;
          top: 10px;
          right: 15px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          z-index: 1;
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', globalStyles);
  }

  destroy(formId: string): void {
    this.forms.delete(formId);
    const container = document.getElementById(`crm-form-${formId}`);
    if (container) {
      container.innerHTML = '';
    }
  }
}

// Expor globalmente
(window as any).CRMFormEmbed = new CRMFormEmbed();

export default CRMFormEmbed; 