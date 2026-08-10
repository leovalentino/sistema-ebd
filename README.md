# Secretaria EBD - API & Dashboard

Este projeto é uma solução completa para a gestão da Escola Bíblica Dominical (EBD), permitindo o controle de turmas, alunos, chamadas, presença, finanças e geração de relatórios. O sistema conta com uma API robusta em Node.js e uma interface web intuitiva.

## 🚀 Tecnologias Utilizadas

### Backend
- **Node.js**: Ambiente de execução.
- **Express**: Framework web para criação da API.
- **Firebase Admin SDK**: Integração com o Google Firestore para banco de dados.
- **CORS**: Gerenciamento de acessos externos.
- **Dotenv**: Gestão de variáveis de ambiente.

### Frontend
- **HTML5 / CSS3 / JavaScript (ES6+)**: Tecnologias base.
- **Pico.css**: Framework CSS minimalista para uma interface limpa e responsiva.
- **Fetch API**: Comunicação com o backend.

## 📋 Funcionalidades

### Gestão Acadêmica
- **Turmas**: Criação e listagem de turmas.
- **Alunos**: Cadastro, edição e desativação de alunos vinculados a turmas.
- **Chamada Digital**: Registro de presença, uso de Bíblia e revista, além de registro de visitantes.
- **Diário Geral**: Registro de informações do dia, como clima, secretário responsável e observações gerais.

### Gestão Financeira
- **Ofertas**: Registro de ofertas por turma durante a chamada.
- **Painel Financeiro**: Resumo consolidado de entradas agrupado por trimestre e total acumulado.

### Relatórios e Dashboard
- **Dashboard**: Visualização de todos os relatórios de aula anteriores.
- **Histórico**: Consulta e exclusão de relatórios antigos.

### Segurança
- **Firebase Authentication**: login exclusivo com Google e sessão gerenciada pelo SDK.
- **Autorização no backend**: papéis `admin` e `professor` consultados na coleção `usuariosAutorizados`.

## 📂 Estrutura do Projeto

```text
.
├── index.js          # Servidor Express e rotas da API
├── package.json      # Dependências e scripts
├── public/           # Arquivos do Frontend
│   ├── login.html    # Login com Google
│   ├── index.html    # Tela de Chamada (Principal)
│   ├── cadastro.html # Gestão de Alunos e Turmas
│   ├── dashboard.html# Visualização de Relatórios
│   ├── financeiro.html# Resumo Financeiro
│   ├── common.js     # Lógica compartilhada e autenticação
│   └── style.css     # Estilos personalizados
└── .env              # Configurações de ambiente (não versionado)
```

## ⚙️ Configuração e Instalação

### Pré-requisitos
- Node.js instalado (v14 ou superior recomendado).
- Conta no Firebase com um projeto Firestore configurado.

### 1. Clonar o repositório
```bash
git clone <url-do-repositorio>
cd ebd-api
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar Firebase Admin
Obtenha o arquivo JSON de credenciais (Service Account) no console do Firebase e salve na raiz do projeto:
- `ebd-803-firebase-key-test.json` (para desenvolvimento)
- `ebd-803-firebase-key.json` (para produção)

### 4. Configurar login Google e aplicativo web

No Console do Firebase:

1. Acesse **Authentication → Sign-in method → Google**, habilite o provedor e escolha o e-mail de suporte.
2. Em **Authentication → Settings → Authorized domains**, adicione `localhost` e o domínio do serviço no Render (por exemplo, `seu-app.onrender.com`).
3. Em **Project settings → General → Your apps**, crie/selecione um aplicativo Web e copie os valores de `firebaseConfig`.

### 5. Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:
```env
PORT=3000
NODE_ENV=development
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

Cadastre as mesmas seis variáveis no serviço do Render. Esses valores identificam o aplicativo web e são públicos; nunca coloque a chave privada ou o JSON da service account no frontend. Depois da migração, remova do ambiente do Render as antigas variáveis de senha compartilhada.

### 6. Autorizar usuários

Não há cadastro público. Crie manualmente um documento no Firestore:

```text
Collection: usuariosAutorizados
Document ID: usuario@gmail.com

nome: "Nome"
role: "admin"
ativo: true
```

O ID deve ser o e-mail sem espaços e em letras minúsculas. `role` aceita somente `admin` ou `professor`. Para revogar o acesso, altere `ativo` para `false`.

Adicionar uma pessoa em **Usuários e permissões** do projeto Firebase concede acesso administrativo ao projeto Google, mas **não** autoriza essa pessoa neste sistema. A autorização da aplicação existe somente em `usuariosAutorizados`.

### 7. Executar e testar localmente
```bash
npm install
npm start
```
Acesse `http://localhost:3000/login.html`. O arquivo de credenciais de desenvolvimento deve existir e `localhost` deve estar nos domínios autorizados do Firebase Authentication.

## 🔐 Níveis de Acesso
- **Administrador**: acesso a chamada, cadastros, dashboard, relatórios, diário e financeiro.
- **Professor**: acesso às turmas, alunos da turma e realização/consulta da chamada.

## 📄 Licença
Este projeto está sob a licença ISC.
