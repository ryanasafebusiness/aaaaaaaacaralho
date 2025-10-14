-- Script de configuração do banco de dados Supabase
-- Execute este script no SQL Editor do Supabase

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

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_overtime_updated_at BEFORE UPDATE ON overtime
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime ENABLE ROW LEVEL SECURITY;

-- Política para usuários (podem ver apenas seus próprios dados)
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Política para horas extras (usuários podem ver apenas suas próprias)
CREATE POLICY "Users can view own overtime" ON overtime
    FOR SELECT USING (user_id IN (
        SELECT id FROM users WHERE username = current_setting('request.jwt.claims', true)::json->>'username'
    ));

-- Política para administradores (podem ver tudo)
CREATE POLICY "Admins can view all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE username = current_setting('request.jwt.claims', true)::json->>'username' 
            AND is_admin = true
        )
    );

CREATE POLICY "Admins can view all overtime" ON overtime
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE username = current_setting('request.jwt.claims', true)::json->>'username' 
            AND is_admin = true
        )
    );

-- Função para inserir horas extras
CREATE OR REPLACE FUNCTION insert_overtime(
    p_user_id INTEGER,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_has_lunch BOOLEAN DEFAULT FALSE,
    p_observations TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    new_id INTEGER;
BEGIN
    -- Validar se o usuário existe
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Usuário não encontrado';
    END IF;
    
    -- Validar horários
    IF p_start_time >= p_end_time THEN
        RAISE EXCEPTION 'Hora de início deve ser anterior à hora de fim';
    END IF;
    
    -- Inserir registro
    INSERT INTO overtime (user_id, date, start_time, end_time, has_lunch, observations)
    VALUES (p_user_id, p_date, p_start_time, p_end_time, p_has_lunch, p_observations)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular total de horas de um usuário
CREATE OR REPLACE FUNCTION calculate_user_total_hours(p_user_id INTEGER, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS DECIMAL AS $$
DECLARE
    total_hours DECIMAL := 0;
    overtime_record RECORD;
    hours_worked DECIMAL;
BEGIN
    FOR overtime_record IN 
        SELECT * FROM overtime 
        WHERE user_id = p_user_id
        AND (p_start_date IS NULL OR date >= p_start_date)
        AND (p_end_date IS NULL OR date <= p_end_date)
    LOOP
        -- Calcular horas trabalhadas
        hours_worked := EXTRACT(EPOCH FROM (overtime_record.end_time - overtime_record.start_time)) / 3600;
        
        -- Subtrair hora de almoço se aplicável
        IF overtime_record.has_lunch THEN
            hours_worked := hours_worked - 1;
        END IF;
        
        -- Adicionar apenas se positivo
        IF hours_worked > 0 THEN
            total_hours := total_hours + hours_worked;
        END IF;
    END LOOP;
    
    RETURN total_hours;
END;
$$ LANGUAGE plpgsql;

-- View para relatórios de usuários
CREATE VIEW user_overtime_summary AS
SELECT 
    u.id,
    u.name,
    u.username,
    u.email,
    COUNT(o.id) as total_records,
    COALESCE(SUM(
        CASE 
            WHEN o.end_time > o.start_time THEN 
                EXTRACT(EPOCH FROM (o.end_time - o.start_time)) / 3600 - 
                CASE WHEN o.has_lunch THEN 1 ELSE 0 END
            ELSE 0
        END
    ), 0) as total_hours,
    COALESCE(SUM(
        CASE 
            WHEN o.end_time > o.start_time THEN 
                (EXTRACT(EPOCH FROM (o.end_time - o.start_time)) / 3600 - 
                 CASE WHEN o.has_lunch THEN 1 ELSE 0 END) * 15.75
            ELSE 0
        END
    ), 0) as total_value
FROM users u
LEFT JOIN overtime o ON u.id = o.user_id
GROUP BY u.id, u.name, u.username, u.email;

-- Comentários nas tabelas
COMMENT ON TABLE users IS 'Tabela de usuários do sistema';
COMMENT ON TABLE overtime IS 'Tabela de horas extras registradas';

COMMENT ON COLUMN users.is_admin IS 'Indica se o usuário é administrador';
COMMENT ON COLUMN overtime.has_lunch IS 'Indica se houve horário de almoço (desconta 1 hora)';
COMMENT ON COLUMN overtime.observations IS 'Observações opcionais sobre a hora extra';
