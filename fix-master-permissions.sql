-- Adiciona políticas para permitir que super_admins façam UPDATE e DELETE em todas as tabelas necessárias

-- 1. LOJISTAS (Permitir DELETE e UPDATE)
DROP POLICY IF EXISTS "super_admins_update_lojistas" ON lojistas;
CREATE POLICY "super_admins_update_lojistas" ON lojistas
  FOR UPDATE USING ( EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()) );

DROP POLICY IF EXISTS "super_admins_delete_lojistas" ON lojistas;
CREATE POLICY "super_admins_delete_lojistas" ON lojistas
  FOR DELETE USING ( EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()) );

-- 2. PEDIDOS (Permitir DELETE para limpar dados)
DROP POLICY IF EXISTS "super_admins_delete_pedidos" ON pedidos;
CREATE POLICY "super_admins_delete_pedidos" ON pedidos
  FOR DELETE USING ( EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()) );

-- 3. PRODUTOS (Permitir DELETE para limpar dados)
DROP POLICY IF EXISTS "super_admins_delete_produtos" ON produtos;
CREATE POLICY "super_admins_delete_produtos" ON produtos
  FOR DELETE USING ( EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()) );

-- 4. CATEGORIAS (Permitir DELETE para limpar dados)
DROP POLICY IF EXISTS "super_admins_delete_categorias" ON categorias;
CREATE POLICY "super_admins_delete_categorias" ON categorias
  FOR DELETE USING ( EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()) );

-- 5. ADICIONAIS (Permitir DELETE para limpar dados)
DROP POLICY IF EXISTS "super_admins_delete_adicionais" ON adicionais;
CREATE POLICY "super_admins_delete_adicionais" ON adicionais
  FOR DELETE USING ( EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()) );
