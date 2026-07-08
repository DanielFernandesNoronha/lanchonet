const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/Financeiro.jsx', 'utf8');

// 1. Remove supabase import and add API imports if not there
content = content.replace(/import \{ supabase \} from '\.\.\/\.\.\/lib\/supabase';\n/, "import { api, SSE_URL } from '../../lib/apiClient';\n");

// 2. Replace SSE using supabase with native EventSource via SSE_URL
const sseOld = `
  useEffect(() => {
    if (!lojista?.id) return;

    // Escuta mudanças de assinatura na tabela de lojistas
    const channel = supabase
      .channel('public:lojistas')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lojistas', filter: \`id=eq.\${lojista.id}\` }, (payload) => {
        if (payload.new.status_assinatura === 'ativo' && lojista.status_assinatura !== 'ativo') {
          toast.success('Pagamento confirmado! Acesso liberado! 🎉');
          fetchLojista(); // Recarrega os dados do auth
          setPixData(null);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [lojista?.id, lojista?.status_assinatura]);
`;

const sseNew = `
  useEffect(() => {
    if (!lojista?.id) return;
    const token = localStorage.getItem('lanchonet_token');
    if (!token) return;

    const eventSource = new EventSource(\`\${SSE_URL}/\${lojista.id}?auth_token=\${token}\`);
    
    eventSource.addEventListener('assinatura_atualizada', (e) => {
      const payload = JSON.parse(e.data);
      if (payload.statusAssinatura === 'ativo') {
        toast.success('Pagamento confirmado! Acesso liberado! 🎉');
        fetchLojista();
        setPixData(null);
      }
    });

    return () => eventSource.close();
  }, [lojista?.id]);
`;

// It might not exactly match `sseOld` textually, let's replace by start and end
content = content.replace(
  /useEffect\(\(\) => \{\s+if \(\!lojista\?\.id\) return;\s+\/\/ Escuta mudanças[\s\S]+?return \(\) => supabase\.removeChannel\(channel\);\s+\}, \[lojista\?\.id, lojista\?\.status_assinatura\]\);/,
  sseNew.trim()
);

// 3. Fetch dados_bancarios
const fetchDbOld = /supabase\.from\('dados_bancarios_lojista'\)\.select\('\*'\)\.eq\('lojista_id', lojista\.id\)\.maybeSingle\(\)/;
// Wait, the block was:
/*
  useEffect(() => {
    if (!lojista?.id) return;
    supabase.from('dados_bancarios_lojista').select('*').eq('lojista_id', lojista.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDadosBancarios(data);
          setFormBanco({ tipo_chave: data.tipo_chave || 'cpf', chave_pix: data.chave_pix || '', nome_titular: data.nome_titular || '', banco: data.banco || '' });
        }
      });
  }, [lojista?.id]);
*/
content = content.replace(
  /useEffect\(\(\) => \{\s+if \(\!lojista\?\.id\) return;\s+supabase\.from\('dados_bancarios_lojista'\)[\s\S]+?\}\);\s+\}, \[lojista\?\.id\]\);/,
  `useEffect(() => {
    if (!lojista?.id) return;
    async function carregarFinanceiro() {
      try {
        const data = await api.get('/lojistas/financeiro');
        if (data && data.dadosBancarios) {
          const db = data.dadosBancarios;
          setDadosBancarios(db);
          setFormBanco({ 
            tipo_chave: db.tipoChave || 'cpf', 
            chave_pix: db.chavePix || '', 
            nome_titular: db.nomeTitular || '', 
            banco: db.banco || '' 
          });
        }
      } catch(e) {}
    }
    carregarFinanceiro();
  }, [lojista?.id]);`
);

// 4. Salvar banco:
/*
    try {
      const payload = {
        lojista_id: lojista.id,
        ...formBanco
      };
      
      const { error } = await supabase.from('dados_bancarios_lojista')
        .upsert(payload, { onConflict: 'lojista_id' });
*/
content = content.replace(
  /const payload = \{\s+lojista_id: lojista\.id,\s+\.\.\.formBanco\s+\};\s+const \{ error \} = await supabase\.from\('dados_bancarios_lojista'\)\s+\.upsert\(payload, \{ onConflict: 'lojista_id' \}\);\s+if \(error\) throw error;/,
  `const dbPayload = {
        tipoChave: formBanco.tipo_chave,
        chavePix: formBanco.chave_pix,
        nomeTitular: formBanco.nome_titular,
        banco: formBanco.banco
      };
      await api.put('/lojistas/financeiro', dbPayload);`
);

// And now fix "testandoPix" if it calls API (cadastrarContaRecebimento handles the N8N flow which we can keep).
// The `cadastrarContaRecebimento` is imported from `../../lib/api`. We keep it.

fs.writeFileSync('src/pages/admin/Financeiro.jsx', content);
