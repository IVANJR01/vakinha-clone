# Clone da Página "Vaquinhas em Destaque" - Vakinha.com.br (com Checkout VizionPay)

Este projeto é um **clone completo e de alta fidelidade** da página [Vaquinhas em Destaque](https://www.vakinha.com.br/tag/vaquinhas-em-destaque) do Vakinha, construído com foco em pixel-perfection, fidelidade visual, interatividade completa e **gateway de pagamento VizionPay integrado**.

---

## 🎯 Funcionalidades Implementadas

1. **Design & Identidade Visual Idênticos**:
   - Paleta oficial do Vakinha: Verde principal (`#24CA68`), Verde escuro (`#009D4E`), fundos e tipografia com as fontes oficiais (**Lato** e **Montserrat**).
   - Logotipo oficial em vetor SVG de alta definição no cabeçalho e rodapé.
   - Ícones oficiais e estilos responsivos extraídos do design system da plataforma.

2. **Dados Reais Extraídos do Vakinha**:
   - Contém **45 vaquinhas reais** extraídas diretamente da API do Vakinha, incluindo fotos reais, valores arrecadados, metas, barras de progresso, descrições completas, cidades, estados e avatares dos apoiadores.

3. **Checkout Integrado com Gateway VizionPay (VizzionPay)**:
   - **Ambiente Seguro Co-branded**: Selo de criptografia 256-bit e identidade visual profissional da VizionPay.
   - **Pix Instantâneo D+0**: Emissão imediata de cobrança Pix padrão Banco Central (EMV) com checksum CRC16 válido.
   - **QR Code Real em Alta Resolução**: Renderizado dinamicamente via biblioteca `qrcode`, pronto para escaneamento em qualquer app de banco.
   - **Chave Pix Copia e Cola**: Botão de cópia rápida com feedback tátil/visual.
   - **Contador Regressivo**: Timer de expiração de 15 minutos em tempo real.
   - **Verificação Automática de Pagamento**: Polling em background a cada 2,5 segundos checando o endpoint `/api/vizionpay/status/:id`.
   - **Webhook Oficial & Modo Teste**: Endpoint `/api/vizionpay/webhook` para notificações da VizionPay e botão de simulação imediata para testes ágeis de desenvolvimento.
   - **Formulário do Doador**: Campos de Nome, CPF, E-mail e WhatsApp com máscaras automáticas.

4. **Interatividade Completa da Aplicação**:
   - **Busca em tempo real**: Campo de pesquisa dinâmico no cabeçalho que filtra instantaneamente por título, descrição, nome do criador ou ID da vaquinha.
   - **Filtros por Categoria**: Chips interativos (*Todas, Saúde / Tratamentos, Casa / Moradia, Sonhos / Outros, Projetos Sociais, Emergências*).
   - **Filtros Avançados**: Modal com filtro por Estado (UF: RS, SP, RJ, GO, PR, SC, etc.).
   - **Ordenação Inteligente**: Ordenar por *Em destaque, Mais apoiadas, Maior arrecadação, Menor arrecadação, Mais próximas da meta (%) e Mais recentes*.
   - **Reação de Coração (Stickers / Curtidas)**: Botão de coração flutuante com contagem, animação de microinteração e notificação toast.
   - **Modal de Detalhes da Vaquinha**: Clique no card para abrir o modal completo com a história detalhada, criador, cidade, meta e botão de compartilhamento.
   - **Criação de Vaquinha**: Modal interativo para cadastrar uma nova vaquinha, inserindo-a instantaneamente no grid.
   - **Paginação Dinâmica ("Carregar mais vaquinhas")**: Carrega blocos de vaquinhas com indicador de carregamento.
   - **Menu Responsivo (Mobile Drawer)**: Gaveta lateral retrátil para navegação perfeita em smartphones e tablets.
   - **Sistema de Toasts Notificadores**: Feedback visual flutuante para ações (copiar link, doações, curtidas).

---

## 💳 Configuração do Gateway VizionPay

O projeto suporta tanto o modo de produção (Live) quanto o modo de simulação interativa com QR Code real (Sandbox).

As credenciais podem ser configuradas no arquivo `.env` na raiz do projeto:

```env
PORT=3000
VIZIONPAY_API_URL=https://api.vizzionpay.com.br/v1
VIZIONPAY_API_KEY=sua_chave_aqui
VIZIONPAY_SECRET_KEY=sua_chave_secreta_aqui
VIZIONPAY_WEBHOOK_SECRET=seu_webhook_secret_aqui
```

> **Nota:** Se as chaves estiverem em branco, o sistema funciona perfeitamente em modo de desenvolvimento/demonstração, gerando códigos Pix válidos e permitindo a simulação completa do fluxo de ponta a ponta.

---

## 📂 Estrutura de Arquivos

```
vakinha-clone/
├── .env                       # Arquivo de configuração e chaves VizionPay
├── .env.example               # Exemplo de configuração
├── index.html                 # Página principal com o Checkout VizionPay
├── server.js                  # Servidor Node.js com endpoints da VizionPay
├── package.json               # Configurações do projeto e dependências (qrcode, dotenv)
├── css/
│   ├── vakinha-original.css   # Estilos base globais extraídos do Vakinha
│   ├── vakinha-styled.css     # Estilos styled-components do Vakinha
│   └── custom.css             # Estilos de refinamento e design do checkout VizionPay
├── js/
│   ├── campaigns-data.js      # Base com 45 vaquinhas reais formatadas
│   └── app.js                 # Lógica reativa: busca, filtros e fluxo de pagamento VizionPay
├── assets/
│   └── vakinha_logo.svg       # Logotipo vetorial oficial
└── data_campaigns.json        # Dados de campanhas persistidos
```

---

## 🚀 Como Executar Localmente

No terminal, dentro da pasta do projeto:

```bash
npm install
npm start
```

Abra seu navegador em: **`http://localhost:3000`**
