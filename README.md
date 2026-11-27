# Clone da Página "Vaquinhas em Destaque" - Vakinha.com.br

Este projeto é um **clone completo e de alta fidelidade** da página [Vaquinhas em Destaque](https://www.vakinha.com.br/tag/vaquinhas-em-destaque) do Vakinha, construído com foco em pixel-perfection, fidelidade visual e interatividade completa.

---

## 🎯 Funcionalidades Implementadas

1. **Design & Identidade Visual Idênticos**:
   - Paleta oficial do Vakinha: Verde principal (`#24CA68`), Verde escuro (`#009D4E`), fundos e tipografia com as fontes oficiais (**Lato** e **Montserrat**).
   - Logotipo oficial em vetor SVG de alta definição no cabeçalho e rodapé.
   - Ícones oficiais e estilos responsivos extraídos do design system da plataforma.

2. **Dados Reais Extraídos do Vakinha**:
   - Contém **45 vaquinhas reais** extraídas diretamente da API do Vakinha, incluindo fotos reais, valores arrecadados, metas, barras de progresso, descrições completas, cidades, estados e avatares dos apoiadores.

3. **Interatividade Completa**:
   - **Busca em tempo real**: Campo de pesquisa dinâmico no cabeçalho que filtra instantaneamente por título, descrição, nome do criador ou ID da vaquinha.
   - **Filtros por Categoria**: Chips interativos (*Todas, Saúde / Tratamentos, Casa / Moradia, Sonhos / Outros, Projetos Sociais, Emergências*).
   - **Filtros Avançados**: Modal com filtro por Estado (UF: RS, SP, RJ, GO, PR, SC, etc.).
   - **Ordenação Inteligente**: Ordenar por *Em destaque, Mais apoiadas, Maior arrecadação, Menor arrecadação, Mais próximas da meta (%) e Mais recentes*.
   - **Reação de Coração (Stickers / Curtidas)**: Botão de coração flutuante com contagem, animação de microinteração e notificação toast.
   - **Modal de Detalhes da Vaquinha**: Clique no card para abrir o modal completo com a história detalhada, criador, cidade, meta e botão de compartilhamento.
   - **Checkout & Doação Simulada (Pix & QR Code)**:
     - Botão "Ajudar" abre o fluxo de doação.
     - Seletores rápidos de valor (*R$ 25, R$ 50, R$ 100, R$ 250* ou valor personalizado).
     - Geração automática de chave Pix Copia e Cola e QR Code.
     - Confirmação de doação que atualiza o valor arrecadado, a barra de progresso e o total de doadores em tempo real na tela!
   - **Criação de Vaquinha**: Modal interativo para cadastrar uma nova vaquinha, inserindo-a instantaneamente no grid.
   - **Paginação Dinâmica ("Carregar mais vaquinhas")**: Carrega blocos de vaquinhas com indicador de carregamento.
   - **Menu Responsivo (Mobile Drawer)**: Gaveta lateral retrátil para navegação perfeita em smartphones e tablets.
   - **Sistema de Toasts Notificadores**: Feedback visual flutuante para ações (copiar link, doações, curtidas).

---

## 📂 Estrutura de Arquivos

```
vakinha-clone/
├── index.html                 # Página principal com todo o layout estruturado
├── server.js                  # Servidor local Node.js nativo (sem dependências externas)
├── package.json               # Configurações do projeto e scripts npm
├── css/
│   ├── vakinha-original.css   # Estilos base globais extraídos do Vakinha
│   ├── vakinha-styled.css     # Estilos styled-components do Vakinha
│   └── custom.css             # Estilos de refinamento, modais, animações e toasts
├── js/
│   ├── campaigns-data.js      # Base com 45 vaquinhas reais formatadas
│   └── app.js                 # Lógica reativa: busca, filtros, doação, modais
├── assets/
│   └── vakinha_logo.svg       # Logotipo vetorial oficial
└── data_campaigns.json        # Dados brutos em formato JSON
```

---

## 🚀 Como Executar Localmente

### Opção 1: Usando Node.js (Recomendado)
No terminal, dentro da pasta do projeto:
```bash
npm start
```
ou simplesmente:
```bash
node server.js
```
Abra seu navegador em: **`http://localhost:3000`**

### Opção 2: Abrindo diretamente o arquivo HTML
Você também pode abrir o arquivo `index.html` com dois cliques diretamente no seu navegador preferido (Chrome, Edge, Firefox, etc.) ou via extensão Live Server no editor.
