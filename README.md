# Sistema de Administração de Horas Extras

Um sistema completo para gerenciar horas extras de trabalho com dashboard moderno e painel administrativo.

## 🚀 Funcionalidades

### Para Usuários Normais
- ✅ Dashboard com visualização de horas totais
- ✅ Registro de horas extras com data e horário
- ✅ Cálculo automático do valor (R$ 15,75 por hora)
- ✅ Desconto automático de 1 hora para almoço
- ✅ Relatórios por período (semana, mês, ano)
- ✅ Histórico completo de horas extras
- ✅ Interface responsiva e moderna

### Para Administradores (adm1)
- ✅ Painel administrativo completo
- ✅ Gerenciamento de usuários (criar, editar, excluir)
- ✅ Gerenciamento de horas extras de todos os usuários
- ✅ Relatórios gerais e estatísticas
- ✅ Visualização de dados consolidados

## 🔐 Login

### Administrador
- **Usuário:** adm1
- **Senha:** adm111

### Usuários de Demonstração
- **Usuário:** joao / **Senha:** 123456
- **Usuário:** maria / **Senha:** 123456

## 💰 Cálculos

- **Valor por hora extra:** R$ 15,75
- **Desconto de almoço:** 1 hora
- **Cálculo automático:** (hora fim - hora início) - (almoço se marcado)

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript ES6+
- **Backend:** Supabase (PostgreSQL)
- **Deploy:** Vercel
- **Ícones:** Font Awesome
- **Estilo:** Design moderno com tema escuro

## 📦 Instalação e Configuração

### 1. Configuração do Supabase

1. Crie uma conta no [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Vá em "SQL Editor" e execute o seguinte script:

```sql
-- Tabela de usuários
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de horas extras
CREATE TABLE overtime (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    has_lunch BOOLEAN DEFAULT FALSE,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir usuário administrador
INSERT INTO users (name, username, email, password, is_admin) 
VALUES ('Administrador', 'adm1', 'admin@exemplo.com', 'adm111', TRUE);

-- Inserir usuários de demonstração
INSERT INTO users (name, username, email, password) 
VALUES 
    ('João Silva', 'joao', 'joao@exemplo.com', '123456'),
    ('Maria Santos', 'maria', 'maria@exemplo.com', '123456');

-- Criar índices para melhor performance
CREATE INDEX idx_overtime_user_id ON overtime(user_id);
CREATE INDEX idx_overtime_date ON overtime(date);
CREATE INDEX idx_users_username ON users(username);
```

4. Vá em "Settings" > "API" e copie:
   - Project URL
   - Anon public key

### 2. Configuração Local

1. Clone ou baixe os arquivos do projeto
2. Abra o arquivo `script.js`
3. Substitua as configurações do Supabase:

```javascript
const SUPABASE_URL = 'SUA_URL_DO_SUPABASE_AQUI';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANONIMA_AQUI';
```

4. Descomente as linhas de inicialização do Supabase:

```javascript
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 3. Deploy no Vercel

1. Crie uma conta no [Vercel](https://vercel.com)
2. Conecte seu repositório GitHub ou faça upload dos arquivos
3. Configure as variáveis de ambiente (opcional):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Deploy automático!

## 📱 Como Usar

### Para Usuários
1. Faça login com suas credenciais
2. Visualize seu dashboard com horas totais
3. Clique no botão "+" para registrar nova hora extra
4. Preencha data, horários e marque se teve almoço
5. Visualize relatórios e histórico

### Para Administradores
1. Faça login com adm1/adm111
2. Acesse o painel administrativo
3. Gerencie usuários na aba "Usuários"
4. Visualize todas as horas extras na aba "Horas Extras"
5. Acompanhe relatórios gerais na aba "Relatórios"

## 🔧 Personalização

### Alterar Valor da Hora Extra
No arquivo `script.js`, linha 8:
```javascript
const OVERTIME_RATE = 15.75; // Altere aqui
```

### Alterar Desconto de Almoço
No arquivo `script.js`, linha 9:
```javascript
const LUNCH_DEDUCTION = 1; // Altere aqui (em horas)
```

### Alterar Meta Mensal
No arquivo `script.js`, linha 234:
```javascript
const monthlyGoal = 160; // Altere aqui
```

## 🎨 Design

O sistema foi desenvolvido com:
- **Tema escuro** moderno
- **Gradientes** e efeitos de vidro
- **Animações** suaves
- **Responsividade** para mobile
- **Ícones** Font Awesome
- **Tipografia** moderna

## 📊 Funcionalidades Avançadas

- **Cálculo automático** de horas e valores
- **Validação** de horários
- **Filtros** de período nos relatórios
- **Notificações** visuais
- **Armazenamento local** como backup
- **Interface intuitiva** e moderna

## 🚨 Segurança

- **Autenticação** por usuário e senha
- **Controle de acesso** baseado em roles
- **Validação** de dados no frontend
- **Proteção** contra XSS básica

## 📈 Próximas Funcionalidades

- [ ] Integração completa com Supabase
- [ ] Sistema de aprovação de horas
- [ ] Notificações por email
- [ ] Exportação de relatórios em PDF
- [ ] App mobile (React Native)
- [ ] Integração com sistemas de RH
- [ ] Dashboard com gráficos avançados

## 🐛 Solução de Problemas

### Erro de CORS
Se houver problemas de CORS com o Supabase, verifique:
1. URLs configuradas corretamente
2. Políticas RLS (Row Level Security) no Supabase
3. Domínios autorizados no painel do Supabase

### Dados não salvam
1. Verifique a conexão com o Supabase
2. Confirme as chaves de API
3. Verifique o console do navegador para erros

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique este README
2. Consulte o console do navegador
3. Verifique a documentação do Supabase
4. Teste com os usuários de demonstração

## 📄 Licença

Este projeto é de uso livre para fins educacionais e comerciais.

---

**Desenvolvido com ❤️ para facilitar o gerenciamento de horas extras**
