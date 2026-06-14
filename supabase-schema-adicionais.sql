-- Criação da tabela de adicionais
CREATE TABLE IF NOT EXISTS adicionais (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lojista_id UUID REFERENCES lojistas(id) ON DELETE CASCADE,
    nome VARCHAR NOT NULL,
    preco DECIMAL(10,2) NOT NULL DEFAULT 0,
    descricao VARCHAR,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE adicionais ENABLE ROW LEVEL SECURITY;

-- Políticas para adicionais
CREATE POLICY "Adicionais visíveis para todos"
    ON adicionais FOR SELECT
    USING (true);

CREATE POLICY "Lojistas gerenciam seus adicionais"
    ON adicionais FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM lojistas WHERE id = lojista_id));

-- Criação da tabela de relacionamento entre produtos e adicionais (Muitos para Muitos)
CREATE TABLE IF NOT EXISTS produto_adicionais (
    produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
    adicional_id UUID REFERENCES adicionais(id) ON DELETE CASCADE,
    PRIMARY KEY (produto_id, adicional_id)
);

-- Habilitar RLS
ALTER TABLE produto_adicionais ENABLE ROW LEVEL SECURITY;

-- Políticas para produto_adicionais
CREATE POLICY "Produto_Adicionais visíveis para todos"
    ON produto_adicionais FOR SELECT
    USING (true);

CREATE POLICY "Lojistas gerenciam relacionamentos de seus produtos"
    ON produto_adicionais FOR ALL
    USING (
        auth.uid() IN (
            SELECT l.user_id 
            FROM produtos p 
            JOIN lojistas l ON p.lojista_id = l.id 
            WHERE p.id = produto_id
        )
    );
