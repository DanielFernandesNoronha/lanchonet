-- Alterações na tabela de clientes existente para suportar o novo fluxo de login
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS whatsapp VARCHAR;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS senha_hash VARCHAR;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro_id UUID REFERENCES bairros_entrega(id) ON DELETE SET NULL;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS endereco TEXT;

-- Tornar campos antigos opcionais para evitar erros no cadastro rápido
ALTER TABLE clientes ALTER COLUMN nome DROP NOT NULL;
ALTER TABLE clientes ALTER COLUMN telefone DROP NOT NULL;

-- Criar a restrição única para lojista_id e whatsapp
ALTER TABLE clientes ADD CONSTRAINT clientes_lojista_whatsapp_key UNIQUE (lojista_id, whatsapp);
