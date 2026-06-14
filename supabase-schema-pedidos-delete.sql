CREATE POLICY "Pedidos delete dono" ON pedidos FOR DELETE USING (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));
