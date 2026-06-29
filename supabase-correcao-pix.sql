-- Libera a leitura da tabela de PIX para os clientes do checkout poderem ver se a loja aceita PIX
CREATE POLICY "bancarios_select_public" ON dados_bancarios_lojista FOR SELECT USING (true);

-- Comando de fallback caso a tabela esteja com o outro nome (versão antiga)
CREATE POLICY "bancarios_select_public_2" ON lojista_dados_bancarios FOR SELECT USING (true);
