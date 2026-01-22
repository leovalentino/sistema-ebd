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
- **Controle de Acesso**: Dois níveis de acesso (Administrador e Professor) protegidos por senha.

## 📂 Estrutura do Projeto

```text
.
├── index.js          # Servidor Express e rotas da API
├── package.json      # Dependências e scripts
├── public/           # Arquivos do Frontend
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

### 3. Configurar Firebase
Obtenha o arquivo JSON de credenciais (Service Account) no console do Firebase e salve na raiz do projeto:
- `ebd-803-firebase-key-test.json` (para desenvolvimento)
- `ebd-803-firebase-key.json` (para produção)

### 4. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
PORT=3000
NODE_ENV=development
SENHA_ADM=sua_senha_adm
SENHA_USR=sua_senha_professor
```

### 5. Executar o projeto
```bash
node index.js
```
Acesse `http://localhost:3000` no seu navegador.

## 🔐 Níveis de Acesso
- **Administrador**: Acesso total ao sistema (Cadastro de turmas/alunos e Financeiro).
- **Professor**: Acesso restrito para realização de chamadas.

## 📄 Licença
Este projeto está sob a licença ISC.
