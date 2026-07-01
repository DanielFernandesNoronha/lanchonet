-- Script para corrigir as chaves estrangeiras que faltam ON DELETE CASCADE no banco de dados
-- Isso permitirá que o Master exclua a loja e o Supabase limpe tudo automaticamente.

-- 1. Arrumar tabela 'pedidos'
ALTER TABLE pedidos 
  DROP CONSTRAINT IF EXISTS pedidos_lojista_id_fkey;

ALTER TABLE pedidos
  ADD CONSTRAINT pedidos_lojista_id_fkey 
  FOREIGN KEY (lojista_id) REFERENCES lojistas(id) ON DELETE CASCADE;

-- 2. Arrumar tabela 'clientes'
ALTER TABLE clientes 
  DROP CONSTRAINT IF EXISTS clientes_lojista_id_fkey;

ALTER TABLE clientes
  ADD CONSTRAINT clientes_lojista_id_fkey 
  FOREIGN KEY (lojista_id) REFERENCES lojistas(id) ON DELETE CASCADE;

-- 3. (Garantia) Arrumar tabela 'bairros_entrega' (caso não tenha)
ALTER TABLE bairros_entrega 
  DROP CONSTRAINT IF EXISTS bairros_entrega_lojista_id_fkey;

ALTER TABLE bairros_entrega
  ADD CONSTRAINT bairros_entrega_lojista_id_fkey 
  FOREIGN KEY (lojista_id) REFERENCES lojistas(id) ON DELETE CASCADE;
