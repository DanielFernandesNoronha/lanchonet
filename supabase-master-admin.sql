-- ============================================================
-- PAINEL MASTER — LANCHONET
-- Execute no Supabase SQL Editor
-- ============================================================

-- Tabela de super-admins
CREATE TABLE IF NOT EXISTS super_admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: super_admins podem ler a própria linha
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_ler_proprio" ON super_admins
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- APÓS CRIAR A CONTA DE ADMIN NO /master/login (ou pelo Supabase),
-- rode o comando abaixo substituindo pelo seu user_id real:
-- ============================================================
-- INSERT INTO super_admins (user_id, email)
-- VALUES ('SEU-USER-ID-AQUI', 'seu@email.com');
-- ============================================================

-- Policy para lojistas: super_admins podem ler TODAS as lojas e ATUALIZAR qualquer loja
CREATE POLICY "super_admins_update_lojistas" ON lojistas
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
  );


-- View para o painel master (facilita a query)
CREATE OR REPLACE VIEW master_lojas_view AS
SELECT
  l.id,
  l.nome,
  l.slug,
  l.email,
  l.status_assinatura,
  l.trial_expira_em,
  l.proximo_vencimento,
  l.ultima_cobranca,
  l.aberto,
  l.created_at,
  p.nome AS plano_nome,
  p.valor_mensal AS plano_valor,
  (SELECT COUNT(*) FROM pedidos pd WHERE pd.lojista_id = l.id) AS total_pedidos,
  (SELECT COALESCE(SUM(pd.total), 0) FROM pedidos pd WHERE pd.lojista_id = l.id) AS faturamento_total
FROM lojistas l
LEFT JOIN planos p ON p.id = l.plano_id;

-- A view precisa de acesso via service_role no n8n
-- O frontend master vai chamar um webhook n8n que usa a service_role para buscar os dados
