# ⚡ Overclock

**Overclock** é uma aplicação web criada para registrar, acompanhar e analisar o tempo de estudo de forma simples e eficiente.
A plataforma permite iniciar sessões de estudo, acompanhar metas diárias e visualizar estatísticas de produtividade, tudo sincronizado entre dispositivos.

O objetivo do projeto é ajudar estudantes a **manter consistência e disciplina**, além de fornecer uma visão clara do progresso ao longo do tempo.

---

# 🚀 Demonstração

A aplicação pode ser hospedada utilizando **GitHub Pages**, permitindo acesso direto pelo navegador no computador ou no celular.

Após fazer login com o mesmo e-mail, todos os dados são sincronizados automaticamente.

---

# 🎯 Principais funcionalidades

### ⏱️ Sessões de estudo

* iniciar sessão de estudo com cronômetro
* finalizar sessão registrando tempo estudado
* associar a sessão a uma matéria específica

### 📊 Dashboard de progresso

* tempo estudado **hoje**
* tempo estudado **na semana**
* tempo estudado **no mês**
* sequência de dias estudando (streak)

### 🎯 Metas de estudo

* definir meta diária de estudo
* acompanhar progresso automaticamente
* visualizar percentual da meta cumprida

### 📚 Gerenciamento de matérias

* adicionar novas matérias
* editar matérias existentes
* excluir matérias

### 📈 Estatísticas

* gráfico de horas estudadas nos últimos dias
* lista de sessões recentes
* análise de progresso geral

### ☁️ Sincronização online

* login com **Magic Link**
* dados armazenados no **Supabase (PostgreSQL)**
* sincronização automática entre dispositivos

---

# 🧠 Conceito do nome

O nome **Overclock** vem da computação.

Overclock significa fazer um processador operar **acima da frequência padrão**, extraindo mais desempenho do hardware.

No contexto do projeto:

> **Overclock = levar sua mente além do limite padrão.**

---

# 🏗️ Tecnologias utilizadas

### Frontend

* HTML
* CSS
* JavaScript

### Bibliotecas

* Chart.js (gráficos)

### Backend / Banco de dados

* Supabase
* PostgreSQL
* Supabase Auth (Magic Link)

### Hospedagem

* GitHub Pages

---

# 📂 Estrutura do projeto

```
overclock
│
├── index.html
├── styles.css
├── app.js
├── supabase-config.js
│
├── sql
│   └── supabase-schema.sql
│
└── README.md
```

---

# 🗄️ Estrutura do banco de dados

O projeto utiliza PostgreSQL via Supabase.

Principais tabelas:

### profiles

Armazena informações básicas do usuário.

### subjects

Lista de matérias cadastradas pelo usuário.

### study_sessions

Registra cada sessão de estudo realizada.

### app_settings

Configurações do usuário, como metas de estudo.

Todas as tabelas utilizam **Row Level Security (RLS)** para garantir que cada usuário só tenha acesso aos próprios dados.

---

# 🔐 Autenticação

A autenticação é feita através de **Magic Link**.

Fluxo de login:

1. usuário informa o e-mail
2. o Supabase envia um link de login
3. ao clicar no link, o usuário é autenticado automaticamente

---

# ⚙️ Instalação e execução

### 1️⃣ Clonar o repositório

```bash
git clone https://github.com/seu-usuario/overclock.git
```

---

### 2️⃣ Criar projeto no Supabase

Crie um novo projeto em:

https://supabase.com

Depois execute o arquivo:

```
supabase-schema.sql
```

no **SQL Editor**.

---

### 3️⃣ Configurar o Supabase

No arquivo:

```
supabase-config.js
```

adicione:

```javascript
const SUPABASE_URL = "YOUR_PROJECT_URL"
const SUPABASE_PUBLIC_KEY = "YOUR_PUBLIC_KEY"
```

---

### 4️⃣ Executar localmente

Abra com um servidor HTTP.

Exemplo com **Live Server** no VS Code.

⚠️ Não abrir usando `file://`.

---

### 5️⃣ Deploy

Para publicar:

1. subir o projeto para o GitHub
2. ativar **GitHub Pages**
3. adicionar a URL do site no Supabase em:

```
Authentication → URL Configuration
```

---

# 📱 Acesso em múltiplos dispositivos

Como os dados ficam armazenados no Supabase, o usuário pode acessar o sistema em qualquer dispositivo.

Basta entrar com o mesmo e-mail para sincronizar tudo automaticamente.

---

# 🔮 Melhorias futuras

Algumas funcionalidades planejadas:

* notificações de estudo
* modo offline
* PWA (instalar como app)
* gráficos mais avançados
* exportação de dados
* sistema de metas semanais e mensais

---

# 📄 Licença

Este projeto é open source e pode ser utilizado para fins educacionais e pessoais.

---

# 👨‍💻 Autor

Projeto desenvolvido por **Estevão**.