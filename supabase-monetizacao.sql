-- ============================================================
-- FASE 1: MONETIZAÇÃO LANCHONET — BANCO DE DADOS
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- PASSO 1: Criar tabela de planos
CREATE TABLE IF NOT EXISTS planos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT NOT NULL,
  valor_mensal NUMERIC(10,2) NOT NULL,
  descricao    TEXT,
  ativo        BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir o plano padrão
INSERT INTO planos (nome, valor_mensal, descricao)
VALUES ('Plano Padrão', 150.00, 'Acesso completo ao sistema LanchoNET')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PASSO 2: Adicionar colunas de assinatura na tabela lojistas
-- ============================================================

ALTER TABLE lojistas
  ADD COLUMN IF NOT EXISTS plano_id               UUID REFERENCES planos(id),
  ADD COLUMN IF NOT EXISTS status_assinatura      TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_iniciado_em      TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_expira_em        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS ultima_cobranca        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proximo_vencimento     TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS abacatepay_customer_id TEXT;

-- ============================================================
-- PASSO 3: Definir plano para todos os lojistas existentes
--          e garantir que estão no trial com 30 dias a contar de hoje
-- ============================================================

UPDATE lojistas
SET
  plano_id              = (SELECT id FROM planos WHERE ativo = TRUE ORDER BY created_at LIMIT 1),
  status_assinatura     = 'trial',
  trial_iniciado_em     = NOW(),
  trial_expira_em       = NOW() + INTERVAL '30 days',
  proximo_vencimento    = NOW() + INTERVAL '30 days'
WHERE status_assinatura IS NULL OR status_assinatura = 'trial';

-- ============================================================
-- PASSO 4: Criar tabela de histórico de cobranças
-- ============================================================

CREATE TABLE IF NOT EXISTS assinaturas_historico (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lojista_id   UUID REFERENCES lojistas(id) ON DELETE CASCADE,
  plano_id     UUID REFERENCES planos(id),
  valor        NUMERIC(10,2),
  status       TEXT NOT NULL DEFAULT 'pendente', -- pago | pendente | expirado
  cobranca_id  TEXT,                             -- ID da cobrança na AbacatePay
  pago_em      TIMESTAMPTZ,
  vencimento   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASSO 5: Criar tabela de dados bancários do lojista
-- ============================================================

CREATE TABLE IF NOT EXISTS dados_bancarios_lojista (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lojista_id              UUID REFERENCES lojistas(id) ON DELETE CASCADE UNIQUE,
  tipo_chave              TEXT,  -- cpf | cnpj | email | telefone | aleatoria
  chave_pix               TEXT,
  nome_titular            TEXT,
  banco                   TEXT,
  abacatepay_account_id   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASSO 6: Habilitar RLS nas novas tabelas
-- ============================================================

ALTER TABLE planos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas_historico   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_bancarios_lojista ENABLE ROW LEVEL SECURITY;

-- Planos: qualquer usuário autenticado pode ler
CREATE POLICY "planos_select_public" ON planos
  FOR SELECT USING (TRUE);

-- Histórico: lojista só vê os próprios registros
CREATE POLICY "historico_select_own" ON assinaturas_historico
  FOR SELECT USING (
    lojista_id IN (
      SELECT id FROM lojistas WHERE user_id = auth.uid()
    )
  );

-- Dados bancários: lojista só vê e edita os próprios
CREATE POLICY "dados_bancarios_select_own" ON dados_bancarios_lojista
  FOR SELECT USING (
    lojista_id IN (
      SELECT id FROM lojistas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "dados_bancarios_insert_own" ON dados_bancarios_lojista
  FOR INSERT WITH CHECK (
    lojista_id IN (
      SELECT id FROM lojistas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "dados_bancarios_update_own" ON dados_bancarios_lojista
  FOR UPDATE USING (
    lojista_id IN (
      SELECT id FROM lojistas WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- VERIFICAÇÃO FINAL: Confirme que o lojista está em trial
-- ============================================================

SELECT id, nome, slug, status_assinatura, trial_iniciado_em, trial_expira_em, proximo_vencimento
FROM lojistas;
