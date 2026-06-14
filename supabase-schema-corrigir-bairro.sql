-- Corrigir a foreign key do bairro_id que estava apontando para a tabela errada
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_bairro_id_fkey;

-- Agora apontamos para taxas_entrega, que é a tabela que a interface de Configurações do admin gerencia
ALTER TABLE clientes ADD CONSTRAINT clientes_bairro_id_fkey FOREIGN KEY (bairro_id) REFERENCES taxas_entrega(id) ON DELETE SET NULL;
