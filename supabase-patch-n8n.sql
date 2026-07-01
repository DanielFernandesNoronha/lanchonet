-- ============================================================
-- PATCH DE ATUALIZAÇÃO DO N8N (Rode apenas este código)
-- ============================================================

-- 1. Atualizar a View para incluir as colunas do Auto Responder
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


-- 2. Criar a Função Blindada para o N8N pegar as chaves do AbacatePay
CREATE OR REPLACE FUNCTION get_lojista_n8n(p_lojista_id UUID, p_secret VARCHAR)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
    lojista_data JSONB;
BEGIN
    -- Senha hardcoded apenas para o n8n interno não ser bloqueado pelo RLS
    IF p_secret != 'lancho_n8n_master_key_2026' THEN
        RAISE EXCEPTION 'Acesso negado. Secret inválido.';
    END IF;

    SELECT to_jsonb(l.*) INTO lojista_data
    FROM lojistas l
    WHERE id = p_lojista_id;
    
    RETURN lojista_data;
END;
$$ LANGUAGE plpgsql;
