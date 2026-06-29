-- Adicionar colunas de tempo manual na tabela lojistas
ALTER TABLE public.lojistas 
ADD COLUMN IF NOT EXISTS tempo_manual_entrega text, 
ADD COLUMN IF NOT EXISTS tempo_manual_retirada text;
