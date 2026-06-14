-- Tabela de Bairros de Entrega
CREATE TABLE IF NOT EXISTS bairros_entrega (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lojista_id UUID REFERENCES lojistas(id) ON DELETE CASCADE,
    nome VARCHAR NOT NULL,
    taxa DECIMAL(10,2) NOT NULL DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para bairros
ALTER TABLE bairros_entrega ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bairros visíveis para todos"
    ON bairros_entrega FOR SELECT
    USING (true);

CREATE POLICY "Lojistas gerenciam seus bairros"
    ON bairros_entrega FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM lojistas WHERE id = lojista_id));

-- Tabela de Clientes (Login via WhatsApp)
CREATE TABLE IF NOT EXISTS clientes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lojista_id UUID REFERENCES lojistas(id) ON DELETE CASCADE,
    whatsapp VARCHAR NOT NULL,
    senha_hash VARCHAR NOT NULL,
    nome VARCHAR,
    endereco TEXT,
    bairro_id UUID REFERENCES bairros_entrega(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lojista_id, whatsapp)
);

-- Habilitar RLS para clientes
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes gerenciam a si mesmos"
    ON clientes FOR ALL
    USING (true); -- Controle será feito via backend/aplicação

CREATE POLICY "Lojistas veem seus clientes"
    ON clientes FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM lojistas WHERE id = lojista_id));

-- Atualizar tabela de produtos para suportar um array de observações ou já é tratado no JSON do carrinho?
-- A observação é no item do carrinho, então a tabela `pedidos` receberá essas infos no JSON dos `itens`.
-- Portanto, pedidos não precisa alterar a estrutura, apenas como salvamos o JSON.
