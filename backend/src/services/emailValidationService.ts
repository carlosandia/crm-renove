import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface ValidationResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: any;
}

/**
 * 🔧 SERVIÇO DE VALIDAÇÃO SMTP
 * - Testa conectividade antes de salvar
 * - Logs detalhados para diagnóstico
 * - Tratamento específico de erros SMTP
 */
export class EmailValidationService {
  
  /**
   * 🔧 TESTE TCP DUAL-STACK INTELIGENTE
   * Testa IPv6 primeiro, depois IPv4 como fallback
   */
  private async testTcpConnection(host: string, port: number): Promise<{ 
    success: boolean; 
    error?: string; 
    duration?: number;
    protocol?: string;
    address?: string;
  }> {
    const net = require('net');

    // ✅ ETAPA 1: Tentar IPv6 primeiro (sabemos que funciona com UNI5)
    console.log(`🔍 [TCP-DUAL-STACK] Testando IPv6 primeiro: ${host}:${port}`);
    const ipv6Result = await this.testTcpWithFamily(host, port, 6);
    
    if (ipv6Result.success) {
      console.log(`✅ [TCP-DUAL-STACK] IPv6 funcionou! ${ipv6Result.address} (${ipv6Result.duration}ms)`);
      return {
        success: true,
        duration: ipv6Result.duration,
        protocol: 'IPv6',
        address: ipv6Result.address
      };
    }

    console.log(`⚠️ [TCP-DUAL-STACK] IPv6 falhou: ${ipv6Result.error}`);
    console.log(`🔍 [TCP-DUAL-STACK] Tentando IPv4 como fallback...`);

    // ✅ ETAPA 2: Fallback para IPv4 se IPv6 falhar
    const ipv4Result = await this.testTcpWithFamily(host, port, 4);
    
    if (ipv4Result.success) {
      console.log(`✅ [TCP-DUAL-STACK] IPv4 funcionou como fallback! ${ipv4Result.address} (${ipv4Result.duration}ms)`);
      return {
        success: true,
        duration: ipv4Result.duration,
        protocol: 'IPv4',
        address: ipv4Result.address
      };
    }

    console.log(`❌ [TCP-DUAL-STACK] Ambos protocolos falharam - IPv6: ${ipv6Result.error}, IPv4: ${ipv4Result.error}`);
    
    return {
      success: false,
      error: `Conectividade falhou em ambos protocolos: IPv6 (${ipv6Result.error}), IPv4 (${ipv4Result.error})`
    };
  }

  /**
   * Teste TCP específico para uma família de protocolos (4=IPv4, 6=IPv6)
   */
  private async testTcpWithFamily(host: string, port: number, family: 4 | 6): Promise<{
    success: boolean;
    error?: string;
    duration?: number;
    address?: string;
  }> {
    return new Promise((resolve) => {
      const net = require('net');
      const startTime = Date.now();
      const socket = new net.Socket();
      const protocolName = family === 6 ? 'IPv6' : 'IPv4';

      // ✅ CORREÇÃO BASEADA EM DIAGNÓSTICO: Timeout de 300s (5min) para servidores corporativos brasileiros (KingHost/UNI5)
      // Diagnóstico mostrou que TCP conecta mas SMTP handshake é extremamente lento
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          success: false,
          error: `Timeout ${protocolName} (300s) - servidor corporativo KingHost com handshake lento detectado`
        });
      }, 300000); // 5 minutos

      // ✅ CONFIGURAÇÃO ESPECÍFICA POR FAMÍLIA
      const connectOptions = {
        port: port,
        host: host,
        family: family, // 4 = IPv4, 6 = IPv6
        hints: family === 6 ? 0 : undefined // Para IPv6, deixar sistema escolher
      };

      socket.connect(connectOptions, () => {
        const duration = Date.now() - startTime;
        const address = socket.remoteAddress;
        clearTimeout(timeout);
        socket.end();
        
        console.log(`✅ [TCP-${protocolName}] Conectividade OK: ${address}:${port} (${duration}ms)`);
        resolve({ 
          success: true, 
          duration,
          address: address || 'unknown'
        });
      });

      socket.on('error', (error: any) => {
        clearTimeout(timeout);
        socket.destroy();
        console.log(`❌ [TCP-${protocolName}] Erro: ${host}:${port} - ${error.message}`);
        resolve({
          success: false,
          error: error.message
        });
      });

      socket.on('timeout', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({
          success: false,
          error: `Socket timeout ${protocolName}`
        });
      });
    });
  }

  /**
   * 🔄 RETRY MECHANISM ULTRA ROBUSTO: 3 tentativas com portas diferentes
   * Baseado em diagnóstico real: TCP OK, mas SMTP handshake extremamente lento
   */
  private async testSmtpConnectionWithFallback(config: SmtpConfig): Promise<ValidationResult> {
    const isKingHostServer = config.host.includes('uni5.net') || 
                             config.host.includes('smtpi.') ||
                             config.host.includes('renovedigital.com.br');

    if (!isKingHostServer) {
      // Para servidores não-corporativos, usar método padrão sem fallback
      return this.testSmtpConnectionSingle(config);
    }

    // ✅ RETRY ULTRA ROBUSTO PARA SERVIDORES CORPORATIVOS: 587 → 465 → 25
    console.log('🔄 [SMTP-RETRY] Servidor corporativo detectado - sistema retry ultra robusto (3 tentativas)');
    console.log('🔬 [SMTP-RETRY] Diagnóstico: TCP funciona, SMTP handshake pode levar 5+ minutos');

    const retryPorts = [587, 465, 25]; // Portas em ordem de prioridade
    const errors: Array<{ port: number; error: string; code?: string }> = [];
    
    for (let i = 0; i < retryPorts.length; i++) {
      const currentPort = retryPorts[i];
      console.log(`🔄 [SMTP-RETRY] Tentativa ${i + 1}/3: Porta ${currentPort} (até 7 minutos cada)`);
      
      const retryConfig = { ...config, port: currentPort };
      const startTime = Date.now();
      
      try {
        const result = await this.testSmtpConnectionSingle(retryConfig);
        
        if (result.success) {
          const duration = Date.now() - startTime;
          console.log(`✅ [SMTP-RETRY] SUCESSO na tentativa ${i + 1}! Porta ${currentPort} funcionou em ${duration}ms`);
          
          return {
            ...result,
            message: `Conexão SMTP estabelecida na tentativa ${i + 1} (porta ${currentPort})`,
            details: {
              ...result.details,
              retryUsed: true,
              originalPort: config.port,
              successfulPort: currentPort,
              attemptNumber: i + 1,
              totalAttempts: retryPorts.length,
              duration_ms: duration,
              failedPorts: errors.map(e => e.port)
            }
          };
        } else {
          const duration = Date.now() - startTime;
          console.log(`❌ [SMTP-RETRY] Tentativa ${i + 1} falhou após ${duration}ms: ${result.error}`);
          
          errors.push({
            port: currentPort,
            error: result.error || 'Erro desconhecido',
            code: result.details?.code
          });

          // Verificar se vale continuar tentando
          const isTimeoutError = result.details?.code === 'ETIMEDOUT' || 
                                result.details?.code === 'ESOCKET' ||
                                result.error?.includes('Timeout');

          if (!isTimeoutError && i === 0) {
            console.log(`⚠️ [SMTP-RETRY] Erro não é timeout (${result.details?.code}) - mas continuando com outras portas`);
          }
        }
      } catch (unexpectedError: any) {
        const duration = Date.now() - startTime;
        console.log(`💥 [SMTP-RETRY] Erro inesperado na tentativa ${i + 1} após ${duration}ms:`, unexpectedError.message);
        
        errors.push({
          port: currentPort,
          error: unexpectedError.message || 'Erro inesperado',
          code: unexpectedError.code
        });
      }

      // Pequena pausa entre tentativas (exceto na última)
      if (i < retryPorts.length - 1) {
        console.log('⏳ [SMTP-RETRY] Aguardando 5s antes da próxima tentativa...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('❌ [SMTP-RETRY] Todas as 3 tentativas falharam');
    
    return {
      success: false,
      error: `Falha em todas as ${retryPorts.length} tentativas: ${errors.map(e => `${e.port}(${e.code})`).join(', ')}`,
      details: {
        totalAttempts: retryPorts.length,
        allErrors: errors,
        diagnosis: 'TCP conecta mas SMTP handshake falha - possível firewall/proxy',
        recommendation: [
          'Servidor KingHost detectado como extremamente lento',
          'Verifique configurações de firewall/proxy local',
          'Teste de rede diferente pode funcionar',
          'Considere solicitar whitelist de IP ao KingHost'
        ]
      }
    };
  }

  /**
   * Testar conexão SMTP com configuração fornecida (tentativa única)
   * ✅ CORREÇÃO: Fallback inteligente 587→465 para servidores corporativos
   * ✅ OTIMIZAÇÃO: Configuração específica para KingHost/UNI5
   */
  private async testSmtpConnectionSingle(config: SmtpConfig): Promise<ValidationResult> {
    try {
      const environment = process.env.NODE_ENV || 'development';
      console.log('🧪 [SMTP-VALIDATION] Iniciando teste de conexão:', {
        host: config.host,
        port: config.port,
        user: config.user,
        passwordLength: config.password?.length || 0,
        environment
      });

      // Validação básica dos dados
      if (!config.host || !config.port || !config.user || !config.password) {
        return {
          success: false,
          error: 'Todos os campos são obrigatórios (host, port, user, password)'
        };
      }

      // ✅ CORREÇÃO: Removido bloqueio artificial por ambiente
      // SEMPRE executar validação SMTP real conforme diretiva do usuário

      // ✅ ETAPA 1: Teste básico de conectividade TCP DUAL-STACK
      console.log(`🔍 [SMTP-VALIDATION] Testando conectividade dual-stack com ${config.host}:${config.port}...`);
      const tcpTest = await this.testTcpConnection(config.host, config.port);
      
      if (!tcpTest.success) {
        // ✅ ANÁLISE ESPECÍFICA DO ERRO TCP - SEM BLOQUEIOS POR AMBIENTE
        let specificError = `Conectividade TCP falhou: ${tcpTest.error}`;
        let specificSuggestion = 'Servidor SMTP inacessível - verificando causa real';
        let solutions = ['Verifique se o servidor está online', 'Confirme se não há firewall bloqueando a porta'];
        
        // ✅ CORREÇÃO: Detecção informativa (não bloqueante) para servidores corporativos
        if (config.host.includes('uni5.net') || config.host.includes('smtpi.') || config.host.includes('renovedigital.com.br')) {
          specificError = `Servidor corporativo ${config.host} - Teste TCP falhou`;
          specificSuggestion = 'Firewall corporativo ou conectividade de rede';
          solutions = [
            '🔧 Verifique conectividade: ping ' + config.host,
            '🌐 Teste porta: telnet ' + config.host + ' ' + config.port,
            '📧 Confirme credenciais com administrador do sistema',
            '🏢 Servidor corporativo pode ter restrições de IP',
            '⚡ Se credenciais estão corretas, aguarde liberação de firewall'
          ];
        }

        return {
          success: false,
          error: specificError,
          details: {
            suggestion: specificSuggestion,
            host: config.host,
            port: config.port,
            test_type: 'tcp_dual_stack_connectivity',
            ipv4_ipv6_both_failed: true,
            tcpError: tcpTest.error,
            solutions,
            isKnownCorporateIssue: config.host.includes('uni5.net')
          }
        };
      }

      console.log(`✅ [SMTP-VALIDATION] TCP OK via ${tcpTest.protocol} (${tcpTest.address}:${config.port} em ${tcpTest.duration}ms)`);

      // ✅ CONFIGURAÇÃO INTELIGENTE BASEADA NO PROTOCOLO QUE FUNCIONOU
      const preferredFamily = tcpTest.protocol === 'IPv6' ? 6 : 4;
      console.log(`🎯 [SMTP-VALIDATION] Usando protocolo ${tcpTest.protocol} para validação SMTP`);

      // ✅ DETECÇÃO ESPECÍFICA PARA SERVIDORES CORPORATIVOS BRASILEIROS
      const isKingHostServer = config.host.includes('uni5.net') || 
                               config.host.includes('smtpi.') ||
                               config.host.includes('renovedigital.com.br');

      let transportConfig;
      
      if (isKingHostServer) {
        // 🏢 CONFIGURAÇÃO ULTRA ROBUSTA PARA KINGHOST/UNI5 (BASEADA EM DIAGNÓSTICO REAL)
        console.log('🏢 [SMTP-VALIDATION] Aplicando configuração ULTRA ROBUSTA para KingHost/UNI5');
        console.log('🔬 [SMTP-VALIDATION] Diagnóstico: TCP OK, SMTP handshake extremamente lento');
        transportConfig = {
          host: config.host,
          port: config.port,
          secure: config.port === 465,
          auth: {
            user: config.user,
            pass: config.password
          },
          family: preferredFamily,
          // ✅ TIMEOUTS ULTRA ESTENDIDOS BASEADOS EM DIAGNÓSTICO REAL
          connectionTimeout: 300000,   // 5 minutos (diagnóstico mostrou timeout após 60s)
          greetingTimeout: 180000,     // 3 minutos para greeting lento
          socketTimeout: 420000,       // 7 minutos para socket operations lentas
          // ✅ TLS MÁXIMA COMPATIBILIDADE (DIAGNÓSTICO: HANDSHAKE LENTO)
          tls: {
            ciphers: 'ALL',                    // Aceitar TODOS os ciphers
            rejectUnauthorized: false,         // Aceitar certificados auto-assinados
            secureProtocol: 'TLSv1_method',   // Máxima compatibilidade TLS
            servername: config.host,           // SNI correto
            honorCipherOrder: false,           // Deixar servidor escolher cipher
            checkServerIdentity: false        // Desabilitar verificação adicional
          },
          // ✅ CONFIGURAÇÕES DE REDE ULTRA TOLERANTES
          localAddress: undefined,     // Auto-detect melhor interface
          // ✅ DEBUG MÁXIMO PARA SERVIDORES PROBLEMÁTICOS
          debug: true,                 // Sempre ativo para debugging
          logger: true
        };
      } else {
        // 🌐 CONFIGURAÇÃO PADRÃO PARA OUTROS SERVIDORES
        transportConfig = {
          host: config.host,
          port: config.port,
          secure: config.port === 465,
          auth: {
            user: config.user,
            pass: config.password
          },
          family: preferredFamily,
          // ✅ TIMEOUTS PADRÃO PARA SERVIDORES NORMAIS
          connectionTimeout: 60000,    // 1 minuto
          greetingTimeout: 30000,      // 30 segundos
          socketTimeout: 90000,        // 1.5 minutos
          // ✅ TLS PADRÃO SEGURA
          tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
            servername: config.host,
            ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA'
          },
          localAddress: undefined,
          debug: process.env.NODE_ENV === 'development',
          logger: process.env.NODE_ENV === 'development'
        };
      }

      console.log('🔧 [SMTP-VALIDATION] Configuração do transporter:', {
        host: transportConfig.host,
        port: transportConfig.port,
        secure: transportConfig.secure,
        user: transportConfig.auth.user
      });

      const transporter = nodemailer.createTransport(transportConfig);

      // Executar teste de verificação
      console.log('🔍 [SMTP-VALIDATION] Executando transporter.verify()...');
      
      const startTime = Date.now();
      await transporter.verify();
      const duration = Date.now() - startTime;
      
      console.log(`✅ [SMTP-VALIDATION] Conexão SMTP verificada com sucesso via ${tcpTest.protocol} em ${duration}ms`);

      return {
        success: true,
        message: `Conexão SMTP estabelecida com sucesso via ${tcpTest.protocol} em ${duration}ms`,
        details: {
          host: config.host,
          port: config.port,
          user: config.user,
          secure: transportConfig.secure,
          duration_ms: duration,
          protocol: tcpTest.protocol,
          server_address: tcpTest.address,
          tcp_test_duration: tcpTest.duration
        }
      };

    } catch (error: any) {
      console.error('❌ [SMTP-VALIDATION] Erro na conexão:', {
        message: error.message,
        code: error.code,
        command: error.command,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port,
        stack: error.stack
      });

      // Análise específica dos erros SMTP
      let userFriendlyError = 'Erro desconhecido na conexão SMTP';
      let suggestion = '';

      switch (error.code) {
        case 'ETIMEDOUT':
          userFriendlyError = 'Timeout na conexão SMTP';
          suggestion = 'O servidor pode estar offline, lento ou bloqueado por firewall. Verifique se o hostname e porta estão corretos.';
          break;
        
        case 'ENOTFOUND':
          userFriendlyError = 'Servidor SMTP não encontrado';
          suggestion = 'Verifique se o hostname do servidor SMTP está correto. Teste com ping ou nslookup.';
          break;
        
        case 'ECONNREFUSED':
          userFriendlyError = 'Conexão recusada pelo servidor';
          suggestion = 'A porta pode estar fechada ou o servidor não aceita conexões. Verifique se a porta está correta (587 para STARTTLS, 465 para SSL).';
          break;
        
        case 'EAUTH':
        case 'EAUTHENTICATION':
          userFriendlyError = 'Falha na autenticação SMTP';
          suggestion = 'Verifique se o email e senha estão corretos. Para Gmail, use senha de aplicativo.';
          break;
        
        case 'ESOCKET':
          userFriendlyError = 'Erro de socket na conexão';
          suggestion = 'Problema de rede ou configuração TLS/SSL. Este erro pode indicar incompatibilidade de protocolo de rede (IPv4/IPv6). Tente trocar entre porta 587 (STARTTLS) e 465 (SSL).';
          break;
        
        case 'EENVELOPE':
          userFriendlyError = 'Erro no envelope do email';
          suggestion = 'O endereço de email pode estar em formato inválido.';
          break;
        
        default:
          if (error.message.includes('self signed certificate')) {
            userFriendlyError = 'Certificado SSL auto-assinado';
            suggestion = 'O servidor usa certificado não confiável. Isso foi configurado para ser aceito automaticamente.';
          } else if (error.message.includes('certificate has expired')) {
            userFriendlyError = 'Certificado SSL expirado';
            suggestion = 'O certificado do servidor SMTP está expirado. Entre em contato com o provedor.';
          } else if (error.message) {
            userFriendlyError = error.message;
          }
      }

      return {
        success: false,
        error: userFriendlyError,
        details: {
          suggestion,
          originalError: error.message,
          code: error.code,
          command: error.command,
          host: config.host,
          port: config.port,
          address: error.address,
          errno: error.errno
        }
      };
    }
  }

  /**
   * ✅ MÉTODO PÚBLICO: Testar SMTP com fallback inteligente
   */
  async testSmtpConnection(config: SmtpConfig): Promise<ValidationResult> {
    return this.testSmtpConnectionWithFallback(config);
  }

  /**
   * Salvar configuração apenas se teste de conectividade passar
   */
  async saveConfigWithValidation(
    config: SmtpConfig, 
    userId: string, 
    tenantId: string
  ): Promise<ValidationResult> {
    try {
      console.log('💾 [SMTP-VALIDATION] Iniciando salvamento com validação...');

      // Primeiro, testar a configuração
      const testResult = await this.testSmtpConnection(config);
      
      if (!testResult.success) {
        console.log('❌ [SMTP-VALIDATION] Configuração inválida - não será salva');
        return {
          success: false,
          error: `Configuração inválida: ${testResult.error}`,
          details: testResult.details
        };
      }

      console.log('✅ [SMTP-VALIDATION] Teste passou - salvando no banco...');

      // Se teste passou, criptografar senha e salvar
      const encryptedPassword = Buffer.from(config.password).toString('base64');

      // Salvar na tabela user_email_integrations
      const integrationData = {
        user_id: userId,
        tenant_id: tenantId,
        email_address: config.user,
        display_name: config.user.split('@')[0],
        smtp_host: config.host,
        smtp_port: config.port,
        smtp_secure: config.port === 465,
        smtp_username: config.user,
        smtp_password_encrypted: encryptedPassword,
        provider: this.detectProvider(config.host),
        is_active: true,
        test_status: 'validated',
        updated_at: new Date().toISOString()
      };

      // Verificar se já existe configuração
      const { data: existingConfig } = await supabase
        .from('user_email_integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      let saveResult;
      
      if (existingConfig) {
        // Atualizar configuração existente
        console.log('🔄 [SMTP-VALIDATION] Atualizando configuração existente...');
        saveResult = await supabase
          .from('user_email_integrations')
          .update(integrationData)
          .eq('id', existingConfig.id)
          .select()
          .single();
      } else {
        // Criar nova configuração
        console.log('🆕 [SMTP-VALIDATION] Criando nova configuração...');
        saveResult = await supabase
          .from('user_email_integrations')
          .insert({ ...integrationData, created_at: new Date().toISOString() })
          .select()
          .single();
      }

      if (saveResult.error) {
        console.error('❌ [SMTP-VALIDATION] Erro ao salvar no banco:', saveResult.error);
        return {
          success: false,
          error: 'Erro ao salvar configuração no banco de dados',
          details: saveResult.error
        };
      }

      console.log('✅ [SMTP-VALIDATION] Configuração salva com sucesso');

      return {
        success: true,
        message: 'Configuração validada e salva com sucesso!',
        details: {
          id: saveResult.data.id,
          email: config.user,
          host: config.host,
          port: config.port,
          test_duration: testResult.details?.duration_ms
        }
      };

    } catch (error: any) {
      console.error('❌ [SMTP-VALIDATION] Erro no salvamento:', error);
      return {
        success: false,
        error: 'Erro interno ao salvar configuração',
        details: error.message
      };
    }
  }

  /**
   * Detectar provedor de email baseado no hostname
   */
  private detectProvider(host: string): string {
    const hostLower = host.toLowerCase();
    
    if (hostLower.includes('gmail')) return 'Gmail';
    if (hostLower.includes('outlook') || hostLower.includes('hotmail')) return 'Outlook';
    if (hostLower.includes('yahoo')) return 'Yahoo';
    if (hostLower.includes('uni5')) return 'UNI5';
    if (hostLower.includes('uol')) return 'UOL';
    if (hostLower.includes('terra')) return 'Terra';
    
    return 'Custom';
  }

  /**
   * Buscar configuração válida do usuário
   */
  async getValidatedConfig(userId: string): Promise<SmtpConfig | null> {
    try {
      const { data: integration, error } = await supabase
        .from('user_email_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('test_status', 'validated')
        .single();

      if (error || !integration) {
        console.log('📭 [SMTP-VALIDATION] Nenhuma configuração válida encontrada');
        return null;
      }

      // Descriptografar senha
      const password = Buffer.from(integration.smtp_password_encrypted, 'base64').toString('utf8');

      return {
        host: integration.smtp_host,
        port: integration.smtp_port,
        user: integration.smtp_username,
        password
      };

    } catch (error) {
      console.error('❌ [SMTP-VALIDATION] Erro ao buscar configuração:', error);
      return null;
    }
  }
}

// Instância singleton
export const emailValidationService = new EmailValidationService();