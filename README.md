# Finanças Pessoais

PWA (Progressive Web App) de gestão de finanças pessoais: registo de despesas e
receitas, categorias, orçamentos mensais com alertas, gráficos e relatórios.
Interface em português, valores em EUR.

**App online:** https://xrafaela.github.io/financas-pessoais/

## Funcionalidades

- Registo manual de movimentos (despesas/receitas) com categorias, data e descrição
- Categorias predefinidas e personalizáveis (com cor e tipo)
- Orçamentos mensais por categoria, com aviso a 80% e alerta a 100%
- Relatórios: últimos 6 meses, comparação com o mês anterior, despesas por categoria
- Funciona offline (PWA instalável no telemóvel e PC)
- Sincronização opcional via OneDrive (entre telemóvel e PC)

## Tecnologia

React 19 + TypeScript (estrito) + Vite. Sem dependências de runtime além do
React: gráficos em SVG próprio, armazenamento em IndexedDB, service worker
manual, autenticação OAuth 2.0 (PKCE) escrita de raiz contra as APIs da
Microsoft (login.microsoftonline.com e Microsoft Graph).

## Desenvolvimento

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # testes unitários (node --test)
npm run lint      # oxlint
npm run build     # tsc -b + vite build (dist/)
```

O deploy para GitHub Pages é automático em cada push para `main`
(`.github/workflows/deploy.yml`).

## Sincronização OneDrive (configuração única)

A app sincroniza um único ficheiro JSON na pasta reservada da app no OneDrive
(`Apps/financas-pessoais/dados.json`). Para a autenticação é preciso registar
uma aplicação no portal Azure (gratuito, ~10 minutos):

1. Entra em https://portal.azure.com com uma conta Microsoft
   (se a conta universitária bloquear a criação de apps, usa uma conta
   pessoal outlook.com — a app funciona com qualquer uma).
2. Procura **Registos de aplicações** (App registrations) → **Novo registo**.
3. Nome: `Financas Pessoais`.
4. Tipos de conta suportados: **Contas em qualquer diretório organizacional e
   contas Microsoft pessoais**.
5. **URI de redirecionamento**: plataforma **Aplicação de página única (SPA)**,
   com estes dois endereços:
   - `https://xrafaela.github.io/financas-pessoais/`
   - `http://localhost:5173/`
6. Registar → copiar o **ID de Aplicação (cliente)**.
7. Na app: Definições (ícone no topo) → colar o Client ID → Guardar →
   **Entrar com a Microsoft** → autorizar.

### Como funciona a sincronização

- Cada alteração local é guardada imediatamente no dispositivo (IndexedDB).
- O botão **Sincronizar agora** (e o arranque da app, se já tiveres sessão)
  compara o carimbo temporal local com o da nuvem:
  - nuvem mais recente → descarrega e substitui os dados locais;
  - local mais recente → envia os dados para o OneDrive;
  - iguais → nada a fazer.
- Limitação da v1: a resolução de conflitos é "o mais recente vence" ao nível
  do ficheiro completo (não faz fusão por movimento). Se editar em dois
  dispositivos ao mesmo tempo, a alteração mais recente substitui a outra.

## Resolução de problemas

- **"Need admin approval" / AADSTS** ao entrar: a conta universitária tem
  políticas que bloqueiam apps OAuth. Usa uma conta Microsoft pessoal.
- **HTTP 401 na sincronização**: a sessão expirou — sai e volta a entrar em
  Definições.
- Dados locais: a app guarda tudo no browser; limpar dados do site remove os
  registos locais (os da nuvem não são afetados).
