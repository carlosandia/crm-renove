import express, { Request, Response } from 'express';

const router = express.Router();

/**
 * 🎯 ROTA PARA SUGERIR CONFIGURAÇÃO SMTP POR AMBIENTE
 * Ajuda usuários a configurar email corretamente baseado no ambiente
 */

// GET /api/email/suggest-config - Sugerir configuração por ambiente
router.get('/suggest-config', (req: Request, res: Response) => {
  try {
    const environment = process.env.NODE_ENV || 'development';
    
    console.log(`🎯 [SUGGEST-CONFIG] Solicitação para ambiente: ${environment}`);

    if (environment === 'development') {
      res.json({
        environment: 'development',
        message: 'Para desenvolvimento, recomendamos Gmail App Password',
        recommended: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          note: 'Use Gmail App Password para desenvolvimento - mais confiável'
        },
        corporateServers: {
          warning: 'Servidores corporativos geralmente bloqueiam IPs de desenvolvimento',
          examples: [
            'smtpi.uni5.net - Requer IP whitelistado',
            'smtp.renovedigital.com.br - Apenas produção'
          ],
          note: 'Funcionarão perfeitamente em produção'
        },
        instructions: {
          gmail: [
            '1. ✅ Ative verificação em duas etapas no Gmail',
            '2. 🔑 Acesse: https://myaccount.google.com/apppasswords',
            '3. 📧 Selecione "Email" como aplicativo',
            '4. 🔐 Gere senha de 16 caracteres',
            '5. 🚀 Use essa senha no campo "Senha"'
          ],
          alternative: [
            'Outlook: smtp-mail.outlook.com:587',
            'Yahoo: smtp.mail.yahoo.com:587',
            'Outros: Verifique documentação do provedor'
          ]
        },
        troubleshooting: {
          common_issues: [
            'Gmail: Use senha de app, não senha normal',
            'Outlook: Pode precisar de autenticação OAuth',
            'Yahoo: Habilite "Aplicativos menos seguros"'
          ]
        }
      });
    } else {
      // Produção
      res.json({
        environment: 'production',
        message: 'Em produção, servidores corporativos funcionam normalmente',
        corporate: {
          host: 'smtpi.uni5.net',
          port: 587,
          secure: false,
          note: 'Servidor corporativo configurado com IP whitelistado'
        },
        fallback: {
          host: 'smtp.gmail.com',
          port: 587,
          note: 'Gmail como backup se necessário'
        },
        security: {
          note: 'IPs de produção são whitelistados nos servidores corporativos',
          firewall: 'Firewall corporativo permitirá conexões do servidor'
        }
      });
    }

  } catch (error) {
    console.error('❌ [SUGGEST-CONFIG] Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao sugerir configuração',
      details: error
    });
  }
});

// GET /api/email/providers - Lista provedores com configurações
router.get('/providers', (req: Request, res: Response) => {
  try {
    const environment = process.env.NODE_ENV || 'development';
    
    const providers = [
      {
        name: 'Gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        recommended: environment === 'development',
        note: 'Mais confiável para desenvolvimento',
        setup_url: 'https://myaccount.google.com/apppasswords'
      },
      {
        name: 'Outlook',
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        recommended: false,
        note: 'Funciona bem para desenvolvimento e produção'
      },
      {
        name: 'Yahoo',
        host: 'smtp.mail.yahoo.com',
        port: 587,
        secure: false,
        recommended: false,
        note: 'Pode precisar habilitar aplicativos menos seguros'
      },
      {
        name: 'UNI5 Corporativo',
        host: 'smtpi.uni5.net',
        port: 587,
        secure: false,
        recommended: environment === 'production',
        note: environment === 'development' 
          ? 'Não funciona em desenvolvimento - use Gmail' 
          : 'Servidor corporativo para produção',
        restrictions: environment === 'development' 
          ? ['Firewall bloqueia IPs externos', 'Apenas IPs whitelistados'] 
          : []
      },
      {
        name: 'Renove Digital',
        host: 'smtp.renovedigital.com.br',
        port: 587,
        secure: false,
        recommended: environment === 'production',
        note: environment === 'development'
          ? 'Não funciona em desenvolvimento - use Gmail'
          : 'Servidor interno da empresa',
        restrictions: environment === 'development'
          ? ['Servidor interno', 'Requer VPN corporativa']
          : []
      }
    ];

    res.json({
      environment,
      providers,
      recommendation: environment === 'development' 
        ? 'Use Gmail App Password para desenvolvimento' 
        : 'Servidores corporativos funcionam em produção'
    });

  } catch (error) {
    console.error('❌ [PROVIDERS] Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar provedores',
      details: error
    });
  }
});

export default router;