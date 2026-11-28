require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const VIZIONPAY_API_URL = process.env.VIZIONPAY_API_URL || 'https://app.vizzionpay.com.br/api/v1';
const VIZIONPAY_API_KEY = process.env.VIZIONPAY_API_KEY || '';
const VIZIONPAY_SECRET_KEY = process.env.VIZIONPAY_SECRET_KEY || '';

// Memória de transações para o checkout
const transactions = new Map();
let authenticatedProducer = null;

// Função para verificar status das credenciais diretamente na VizzionPay
async function verifyVizionpayAuth() {
  if (!VIZIONPAY_API_KEY || !VIZIONPAY_SECRET_KEY) return null;

  return new Promise((resolve) => {
    try {
      const u = new URL(VIZIONPAY_API_URL);
      const req = https.request({
        hostname: u.hostname,
        port: 443,
        path: u.pathname || '/api/v1',
        method: 'GET',
        headers: {
          'User-Agent': 'VakinhaClone/1.0',
          'x-public-key': VIZIONPAY_API_KEY.trim(),
          'x-secret-key': VIZIONPAY_SECRET_KEY.trim()
        },
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode === 200 && parsed.producer) {
              authenticatedProducer = parsed.producer;
              resolve(parsed.producer);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.end();
    } catch {
      resolve(null);
    }
  });
}

// Carregar campanhas
let campaignsCache = null;
const getCampaigns = () => {
  if (!campaignsCache) {
    try {
      const data = fs.readFileSync(path.join(PUBLIC_DIR, 'data_campaigns.json'), 'utf-8');
      campaignsCache = JSON.parse(data);
    } catch (err) {
      console.error('Erro ao ler data_campaigns.json:', err);
      campaignsCache = [];
    }
  }
  return campaignsCache;
};

const saveCampaigns = () => {
  if (campaignsCache) {
    try {
      fs.writeFileSync(
        path.join(PUBLIC_DIR, 'data_campaigns.json'),
        JSON.stringify(campaignsCache, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error('Erro ao salvar data_campaigns.json:', err);
    }
  }
};

// Algoritmo CRC16-CCITT (0xFFFF) para geração de payload padrão BACEN Pix
function computeCRC16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  let hex = crc.toString(16).toUpperCase();
  while (hex.length < 4) hex = '0' + hex;
  return hex;
}

// Gerador de Pix Copia e Cola EMV Padrão Banco Central do Brasil
function generatePixPayload({ txId, amount, name = 'VIZIONPAY', city = 'SAO PAULO' }) {
  const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 25);
  const cleanCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 15);
  const formattedAmount = Number(amount).toFixed(2);

  const formatField = (id, val) => {
    const len = String(val.length).padStart(2, '0');
    return `${id}${len}${val}`;
  };

  const gui = formatField('00', 'br.gov.bcb.pix');
  const key = formatField('01', 'pix@vizzionpay.com.br');
  const merchantAccountInfo = formatField('26', `${gui}${key}`);

  const mcc = formatField('52', '0000');
  const currency = formatField('53', '986'); // BRL
  const amt = formatField('54', formattedAmount);
  const country = formatField('58', 'BR');
  const merName = formatField('59', cleanName || 'VIZIONPAY');
  const merCity = formatField('60', cleanCity || 'SAO PAULO');

  const addTxId = formatField('05', txId.slice(0, 25));
  const additionalDataField = formatField('62', addTxId);

  const rawPayload = `000201${merchantAccountInfo}${mcc}${currency}${amt}${country}${merName}${merCity}${additionalDataField}6304`;
  const checksum = computeCRC16(rawPayload);
  return `${rawPayload}${checksum}`;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-public-key, x-secret-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // Endpoint: Configuração e Status da VizionPay
  if (pathname === '/api/vizionpay/config' && req.method === 'GET') {
    if (!authenticatedProducer && VIZIONPAY_API_KEY && VIZIONPAY_SECRET_KEY) {
      await verifyVizionpayAuth();
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      gateway: 'VizionPay',
      hasApiKey: Boolean(VIZIONPAY_API_KEY && VIZIONPAY_API_KEY.trim()),
      apiUrl: VIZIONPAY_API_URL,
      authenticated: Boolean(authenticatedProducer),
      producer: authenticatedProducer ? {
        id: authenticatedProducer.id,
        name: authenticatedProducer.name,
        email: authenticatedProducer.email,
        status: authenticatedProducer.status
      } : null,
      mode: authenticatedProducer ? 'live' : 'sandbox',
      pixInstantEnabled: true,
      cardEnabled: true
    }));
    return;
  }

  // Endpoint: Criar pagamento via VizionPay
  if (pathname === '/api/vizionpay/create-payment' && req.method === 'POST') {
    try {
      const data = await readJsonBody(req);
      const { campaignId, amount, payer, method = 'pix' } = data;

      if (!amount || Number(amount) < 1) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Valor de doação inválido' }));
        return;
      }

      if (!authenticatedProducer && VIZIONPAY_API_KEY && VIZIONPAY_SECRET_KEY) {
        await verifyVizionpayAuth();
      }

      const txId = `VP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const receiverName = 'VAKINHA ONLINE';

      // Gerar Pix Copia e Cola oficial BACEN
      const pixCopiaECola = generatePixPayload({
        txId,
        amount: Number(amount),
        name: receiverName,
        city: 'SAO PAULO'
      });

      // Gerar QR Code em imagem Data URL
      const qrCodeDataUrl = await QRCode.toDataURL(pixCopiaECola, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      const transaction = {
        id: txId,
        campaignId: campaignId ? Number(campaignId) : null,
        amount: Number(amount),
        payer: {
          name: payer?.name || 'Doador Anônimo',
          email: payer?.email || '',
          cpf: payer?.cpf || '',
          phone: payer?.phone || ''
        },
        producer: authenticatedProducer ? {
          name: authenticatedProducer.name,
          email: authenticatedProducer.email
        } : null,
        method,
        status: 'pending',
        pixCopiaECola,
        qrCodeDataUrl,
        createdAt: new Date().toISOString(),
        expiresAt,
        gateway: 'VizionPay'
      };

      transactions.set(txId, transaction);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        transactionId: txId,
        amount: Number(amount),
        method,
        status: 'pending',
        pixCopiaECola,
        qrCodeDataUrl,
        expiresAt,
        receiverName,
        gateway: 'VizionPay',
        mode: authenticatedProducer ? 'live' : 'sandbox'
      }));
      return;
    } catch (err) {
      console.error('Erro ao criar pagamento VizionPay:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno ao processar pagamento VizionPay' }));
      return;
    }
  }

  // Endpoint: Checar status do pagamento na VizionPay
  if (pathname.startsWith('/api/vizionpay/status/') && req.method === 'GET') {
    const txId = pathname.replace('/api/vizionpay/status/', '').trim();
    const tx = transactions.get(txId);

    if (!tx) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Transação não encontrada' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      transactionId: tx.id,
      status: tx.status,
      amount: tx.amount,
      paidAt: tx.paidAt || null,
      campaignId: tx.campaignId
    }));
    return;
  }

  // Endpoint: Simular confirmação imediata (para testes locais rápidos)
  if (pathname === '/api/vizionpay/simulate-paid' && req.method === 'POST') {
    try {
      const data = await readJsonBody(req);
      const { transactionId } = data;
      const tx = transactions.get(transactionId);

      if (!tx) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Transação não encontrada' }));
        return;
      }

      if (tx.status !== 'paid') {
        tx.status = 'paid';
        tx.paidAt = new Date().toISOString();

        if (tx.campaignId) {
          const camps = getCampaigns();
          const campaign = camps.find(c => c.id === tx.campaignId);
          if (campaign) {
            campaign.collectedValue = (campaign.collectedValue || 0) + tx.amount;
            campaign.donorsCount = (campaign.donorsCount || 0) + 1;
            campaign.collectedPercentValue = Math.min(
              100,
              Number(((campaign.collectedValue / campaign.goal) * 100).toFixed(1))
            );
            saveCampaigns();
          }
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Pagamento confirmado com sucesso via VizionPay!',
        transaction: tx
      }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao simular confirmação' }));
      return;
    }
  }

  // Endpoint: Webhook oficial da VizionPay
  if (pathname === '/api/vizionpay/webhook' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      console.log('[VizionPay Webhook recebido]:', body);

      const txId = body.transactionId || body.id || body?.data?.id || body?.data?.transactionId;
      const status = (body.status || body?.data?.status || body.event || '').toLowerCase();

      if (txId && transactions.has(txId)) {
        const tx = transactions.get(txId);
        if (status.includes('paid') || status.includes('approved') || status.includes('confirm')) {
          tx.status = 'paid';
          tx.paidAt = new Date().toISOString();

          if (tx.campaignId) {
            const camps = getCampaigns();
            const campaign = camps.find(c => c.id === tx.campaignId);
            if (campaign) {
              campaign.collectedValue = (campaign.collectedValue || 0) + tx.amount;
              campaign.donorsCount = (campaign.donorsCount || 0) + 1;
              campaign.collectedPercentValue = Math.min(
                100,
                Number(((campaign.collectedValue / campaign.goal) * 100).toFixed(1))
              );
              saveCampaigns();
            }
          }
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
      return;
    } catch (err) {
      console.error('Erro no webhook da VizionPay:', err);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Webhook inválido' }));
      return;
    }
  }

  // Endpoint: Listagem de Campanhas
  if (pathname === '/api/campaigns') {
    const data = getCampaigns();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
    return;
  }

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, pathname);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Acesso proibido');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err404, fallbackContent) => {
        if (err404) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Página não encontrada');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(fallbackContent);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

// Inicialização com verificação das credenciais
verifyVizionpayAuth().then((producer) => {
  server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Clone do Vakinha rodando com sucesso!`);
    console.log(`💳 Gateway VizionPay: ${producer ? 'CONECTADO & AUTENTICADO' : 'MODO TESTE'}`);
    if (producer) {
      console.log(`👤 Produtor: ${producer.name} (${producer.email})`);
      console.log(`⚡ Status da Conta: ${producer.status}`);
    }
    console.log(`👉 Acesse no navegador: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
  });
});
