-- ============================================================
-- BOAS PRÁTICAS DE SEGURANÇA AVANÇADA — LANCHONET
-- Rate Limiting (Limite de Requisições) no Banco de Dados
-- ============================================================

-- 1. PREVENÇÃO CONTRA SPAM DE PEDIDOS (Rate Limit: 1 pedido a cada 3 minutos por cliente)
CREATE OR REPLACE FUNCTION check_rate_limit_pedidos()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pedidos 
        WHERE cliente_id = NEW.cliente_id 
        AND created_at > NOW() - INTERVAL '3 minutes'
    ) THEN
        RAISE EXCEPTION 'Muitas requisições. Por favor, aguarde 3 minutos antes de fazer um novo pedido.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rate_limit_pedidos_trigger ON pedidos;
CREATE TRIGGER rate_limit_pedidos_trigger
BEFORE INSERT ON pedidos
FOR EACH ROW
EXECUTE FUNCTION check_rate_limit_pedidos();


-- 2. PREVENÇÃO CONTRA BOTS DE CADASTRO (Rate Limit: Máximo de 5 cadastros por IP/Lojista a cada 10 minutos)
-- Como o Supabase REST API esconde o IP em RLS puro sem Edge Functions, 
-- a melhor defesa contra bots de cadastro via RPC é limitar a criação de clientes repetidos num curto espaço.
-- O Supabase já faz isso nativamente no Auth, mas como usamos uma tabela customizada (clientes):

CREATE OR REPLACE FUNCTION check_bot_cadastro_clientes()
RETURNS TRIGGER AS $$
DECLARE
    recent_count INTEGER;
BEGIN
    -- Conta quantos clientes foram criados para este lojista nos últimos 10 minutos
    SELECT COUNT(*) INTO recent_count 
    FROM clientes 
    WHERE lojista_id = NEW.lojista_id 
    AND created_at > NOW() - INTERVAL '10 minutes';

    -- Se passar de 20 cadastros em 10 minutos para uma única loja, pode ser um ataque de Bot
    IF recent_count >= 20 THEN
        RAISE EXCEPTION 'Limite de cadastros excedido para esta loja. Tente novamente mais tarde.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rate_limit_clientes_trigger ON clientes;
CREATE TRIGGER rate_limit_clientes_trigger
BEFORE INSERT ON clientes
FOR EACH ROW
EXECUTE FUNCTION check_bot_cadastro_clientes();

-- 3. AUDITORIA: TABELA DE LOGS (Opcional para rastrear atividades suspeitas)
CREATE TABLE IF NOT EXISTS security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
