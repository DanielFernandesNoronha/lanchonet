-- ============================================================
-- ATUALIZAÃ‡ÃƒO DE SEGURANÃ‡A â€” LANCHONET
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- 1. CORREÃ‡ÃƒO DE VAZAMENTO DE CHAVES E DADOS DO LOJISTA
-- Em vez de expor a tabela lojistas inteira (que contÃ©m chaves do AbacatePay e senhas),
-- vamos restringir a leitura apenas ao dono e criar uma VIEW pÃºblica apenas com campos visuais.

-- Revogar a polÃ­tica antiga (se existir)
DROP POLICY IF EXISTS "Lojistas pÃºblico leitura" ON lojistas;

-- Nova polÃ­tica: Apenas o dono pode ler sua linha completa (para ediÃ§Ã£o no painel admin)
CREATE POLICY "Lojistas leitura apenas dono" ON lojistas 
FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM super_admins));

-- Criar a VIEW pÃºblica que esconde campos sensÃ­veis
CREATE OR REPLACE VIEW lojistas_publico AS 
SELECT 
    id, 
    nome, 
    slug, 
    descricao, 
    logo_url, 
    capa_url, 
    cor_principal, 
    cor_secundaria, 
    cor_fundo_cards, 
    cor_texto_normal, 
    cor_texto_secundaria, 
    aberto, 
    pausar_timers,
    tempo_novo,
    tempo_preparando,
    tempo_entrega,
    tempo_concluido,
    tempo_manual_entrega,
    tempo_manual_retirada,
    auto_responder_enabled,
    auto_responder_message
FROM lojistas;

-- 2. CORREÃ‡ÃƒO DE EXPOSIÃ‡ÃƒO DE DADOS DE CLIENTES (PII)
-- A polÃ­tica antiga permitia leitura global. Vamos restringir.

DROP POLICY IF EXISTS "Clientes leitura" ON clientes;

-- O lojista sÃ³ pode ler os clientes vinculados Ã  sua loja
CREATE POLICY "Clientes leitura apenas dono" ON clientes 
FOR SELECT USING (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));

-- Criar uma RPC segura para consultar se o cliente existe
CREATE OR REPLACE FUNCTION get_cliente_by_phone(p_telefone VARCHAR, p_lojista_id UUID)
RETURNS JSONB
SECURITY DEFINER 
AS $$
DECLARE
    cliente_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'nome', nome,
        'whatsapp', whatsapp,
        'endereco', endereco,
        'bairro_id', bairro_id
    ) INTO cliente_data
    FROM clientes
    WHERE whatsapp = p_telefone AND lojista_id = p_lojista_id
    LIMIT 1;
    
    RETURN cliente_data;
END;
$$ LANGUAGE plpgsql;

-- Criar uma RPC segura para registrar cliente e devolver ID
CREATE OR REPLACE FUNCTION register_cliente_secure(p_whatsapp VARCHAR, p_nome VARCHAR, p_lojista_id UUID, p_senha_hash VARCHAR DEFAULT 'na')
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
    cliente_data JSONB;
BEGIN
    INSERT INTO clientes (whatsapp, nome, lojista_id, senha_hash)
    VALUES (p_whatsapp, p_nome, p_lojista_id, p_senha_hash)
    RETURNING jsonb_build_object(
        'id', id, 
        'nome', nome, 
        'whatsapp', whatsapp, 
        'endereco', endereco, 
        'bairro_id', bairro_id
    ) INTO cliente_data;
    
    RETURN cliente_data;
END;
$$ LANGUAGE plpgsql;

-- 3. CORREÃ‡ÃƒO DE STORAGE (ARQUIVOS/IMAGENS)
-- Evitar que usuÃ¡rios deletem/atualizem arquivos que nÃ£o sÃ£o deles
DROP POLICY IF EXISTS "Imagens update autenticado" ON storage.objects;

CREATE POLICY "Imagens update apenas dono" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'imagens' AND auth.uid() = owner
);

CREATE POLICY "Imagens delete apenas dono" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'imagens' AND auth.uid() = owner
);

-- ============================================================
-- 4. ACESSO SEGURO PARA O N8N
-- ============================================================
-- RPC para o N8N conseguir ler os dados do lojista (como chaves de API) de forma segura
CREATE OR REPLACE FUNCTION get_lojista_n8n(p_lojista_id UUID, p_secret VARCHAR)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
    lojista_data JSONB;
BEGIN
    -- Senha super simples hardcoded apenas para o n8n interno não ser bloqueado pelo RLS
    IF p_secret != 'lancho_n8n_master_key_2026' THEN
        RAISE EXCEPTION 'Acesso negado. Secret inválido.';
    END IF;

    SELECT to_jsonb(l.*) INTO lojista_data
    FROM lojistas l
    WHERE id = p_lojista_id;
    
    RETURN lojista_data;
END;
$$ LANGUAGE plpgsql;
-- RPC para o N8N conseguir ler os dados do lojista de forma segura
CREATE OR REPLACE FUNCTION get_lojista_n8n(p_lojista_id UUID, p_secret VARCHAR)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
    lojista_data JSONB;
BEGIN
    -- Senha super simples hardcoded apenas para o n8n interno nÃ£o ser bloqueado pelo RLS
    IF p_secret != 'lancho_n8n_master_key_2026' THEN
        RAISE EXCEPTION 'Acesso negado. Secret invÃ¡lido.';
    END IF;

    SELECT to_jsonb(l.*) INTO lojista_data
    FROM lojistas l
    WHERE id = p_lojista_id;
    
    RETURN lojista_data;
END;
$$ LANGUAGE plpgsql;

-- RPC para o N8N conseguir ler os dados do lojista de forma segura
CREATE OR REPLACE FUNCTION get_lojista_n8n(p_lojista_id UUID, p_secret VARCHAR)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
    lojista_data JSONB;
BEGIN
    -- Senha super simples hardcoded apenas para o n8n interno não ser bloqueado pelo RLS
    IF p_secret != 'lancho_n8n_master_key_2026' THEN
        RAISE EXCEPTION 'Acesso negado. Secret inválido.';
    END IF;

    SELECT to_jsonb(l.*) INTO lojista_data
    FROM lojistas l
    WHERE id = p_lojista_id;
    
    RETURN lojista_data;
END;
$$ LANGUAGE plpgsql;
