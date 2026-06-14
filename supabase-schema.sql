-- ============================================
-- LanchoNet - Schema Completo (Supabase)
-- Execute no SQL Editor do Supabase
-- ============================================

-- ============================================
-- 0. Limpeza Inicial (DROPS)
-- ATENÇÃO: Isso apagará os dados de teste existentes
-- ============================================
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS taxas_entrega CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS lojistas CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Lojistas (Restaurantes)
CREATE TABLE IF NOT EXISTS lojistas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,               -- URL do cardápio: lanchonet.com/{slug}
  descricao TEXT,
  plano VARCHAR NOT NULL DEFAULT 'percentual' CHECK (plano IN ('percentual', 'fixo')),
  taxa_plataforma DECIMAL(5,2) DEFAULT 5.0,   -- % que você retira de cada venda
  abacatepay_api_key VARCHAR,
  abacatepay_account_id VARCHAR,
  whatsapp_instance VARCHAR,                  -- Nome da instância na Evolution API
  auto_responder_enabled BOOLEAN DEFAULT FALSE, -- Robô de resposta automática ligado/desligado
  auto_responder_message TEXT,                -- Mensagem automática do robô
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefone VARCHAR NOT NULL,
  nome VARCHAR NOT NULL,
  endereco_padrao JSONB,
  lojista_id UUID REFERENCES lojistas(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(telefone, lojista_id)
);

-- 3. Categorias do Cardápio
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lojista_id UUID REFERENCES lojistas(id) ON DELETE CASCADE,
  nome VARCHAR NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lojista_id UUID REFERENCES lojistas(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  nome VARCHAR NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  imagem_url TEXT,
  disponivel BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Taxas de Entrega (por bairro, ligadas ao restaurante)
CREATE TABLE IF NOT EXISTS taxas_entrega (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lojista_id UUID REFERENCES lojistas(id) ON DELETE CASCADE,
  bairro VARCHAR NOT NULL,
  valor DECIMAL(10,2) NOT NULL
);

-- 6. Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lojista_id UUID REFERENCES lojistas(id),
  cliente_id UUID REFERENCES clientes(id),
  cliente_dados JSONB,
  endereco_entrega JSONB,
  itens JSONB,
  subtotal DECIMAL(10,2),
  taxa_entrega DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2),
  status VARCHAR DEFAULT 'novo' CHECK (status IN ('novo', 'preparando', 'entrega', 'concluido')),
  abacate_id VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Policies RLS (Row Level Security)
-- ============================================

ALTER TABLE lojistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxas_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Lojistas: leitura pública (para cardápio), edição apenas pelo próprio
CREATE POLICY "Lojistas público leitura" ON lojistas FOR SELECT USING (true);
CREATE POLICY "Lojistas edição própria" ON lojistas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Lojistas insert próprio" ON lojistas FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Categorias: leitura pública, CRUD pelo dono
CREATE POLICY "Categorias leitura pública" ON categorias FOR SELECT USING (true);
CREATE POLICY "Categorias insert próprio" ON categorias FOR INSERT WITH CHECK (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));
CREATE POLICY "Categorias update próprio" ON categorias FOR UPDATE USING (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));
CREATE POLICY "Categorias delete próprio" ON categorias FOR DELETE USING (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));

-- Produtos: leitura pública, CRUD pelo dono
CREATE POLICY "Produtos leitura pública" ON produtos FOR SELECT USING (true);
CREATE POLICY "Produtos insert próprio" ON produtos FOR INSERT WITH CHECK (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));
CREATE POLICY "Produtos update próprio" ON produtos FOR UPDATE USING (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));
CREATE POLICY "Produtos delete próprio" ON produtos FOR DELETE USING (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));

-- Taxas: leitura pública, CRUD pelo dono
CREATE POLICY "Taxas leitura pública" ON taxas_entrega FOR SELECT USING (true);
CREATE POLICY "Taxas insert próprio" ON taxas_entrega FOR INSERT WITH CHECK (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));
CREATE POLICY "Taxas delete próprio" ON taxas_entrega FOR DELETE USING (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));

-- Pedidos: leitura pelo dono do restaurante, insert público (via n8n)
CREATE POLICY "Pedidos leitura dono" ON pedidos FOR SELECT USING (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));
CREATE POLICY "Pedidos insert público" ON pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Pedidos update dono" ON pedidos FOR UPDATE USING (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));

-- Clientes: leitura pelo dono, insert público
CREATE POLICY "Clientes leitura" ON clientes FOR SELECT USING (true);
CREATE POLICY "Clientes insert" ON clientes FOR INSERT WITH CHECK (true);

-- ============================================
-- Habilitar Realtime nos pedidos
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;

-- ============================================
-- Criar bucket de imagens (Storage)
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('imagens', 'imagens', true)
ON CONFLICT DO NOTHING;

-- Apagar policies antigas caso já existam
DROP POLICY IF EXISTS "Imagens upload autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Imagens leitura pública" ON storage.objects;
DROP POLICY IF EXISTS "Imagens update autenticado" ON storage.objects;

-- Policy para upload público no bucket de imagens
CREATE POLICY "Imagens upload autenticado" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'imagens' AND auth.role() = 'authenticated'
);
CREATE POLICY "Imagens leitura pública" ON storage.objects FOR SELECT USING (bucket_id = 'imagens');
CREATE POLICY "Imagens update autenticado" ON storage.objects FOR UPDATE USING (
  bucket_id = 'imagens' AND auth.role() = 'authenticated'
);
