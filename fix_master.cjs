const fs = require('fs');

let content = fs.readFileSync('src/pages/master/MasterDashboard.jsx', 'utf8');

// Remover os planos do Master
content = content.replace(
  /\{\/\* Planos \(Modernizado\) \*\/\}[\s\S]+?<\/div>[\s\S]+?<\/div>[\s\S]+?<\/div>/,
  ''
);

// O dropdown ficava escondido por causa do overflowX: auto
// Vamos mudar a forma como o dropdown se comporta ou mudar o overflow.
// A tabela tinha <div style={{ overflowX: 'auto', minHeight: 250 }}>
content = content.replace(
  /<div style=\{\{ overflowX: 'auto', minHeight: 250 \}\}>/,
  '<div style={{ minHeight: 250 }}>' // removido o overflowX para não cortar o menu
);

// E para o botão 3 pontinhos não ficar com borda, já tinha outline: none, 
// mas vamos melhorar o style
content = content.replace(
  /outline: 'none'/g,
  "outline: 'none', border: 'none'"
);

fs.writeFileSync('src/pages/master/MasterDashboard.jsx', content);
