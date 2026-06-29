-- Garante a identidade de réplica completa para entregar o payload completo nas atualizações
alter table lojistas replica identity full;
alter table categorias replica identity full;
alter table produtos replica identity full;
alter table pedidos replica identity full;

-- Adiciona as tabelas ao Realtime de forma segura (sem dar erro se já existirem)
do $$
begin
  if not exists (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE c.relname = 'lojistas'
  ) then
    alter publication supabase_realtime add table lojistas;
  end if;

  if not exists (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE c.relname = 'categorias'
  ) then
    alter publication supabase_realtime add table categorias;
  end if;

  if not exists (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE c.relname = 'produtos'
  ) then
    alter publication supabase_realtime add table produtos;
  end if;

  if not exists (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE c.relname = 'pedidos'
  ) then
    alter publication supabase_realtime add table pedidos;
  end if;
end
$$;
