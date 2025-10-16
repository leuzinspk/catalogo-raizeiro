require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Configuração do SQL Server via .env
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Caminho correto dentro do CATALOGO-RZ
const caminhoJSON = path.join(__dirname, 'produtos.json');

// === Categorias automáticas ===
function categorizar(nome) {
  nome = nome.toUpperCase();
  if (nome.includes('FARINHA') || nome.includes('AVEIA') || nome.includes('POLVILHO') || nome.includes('AMIDO') || nome.includes('GOMA')) {
    return 'FARINHAS';
  } else if (nome.includes('CASTANHA') || nome.includes('AMENDOA') || nome.includes('NOZ') || nome.includes('AMENDOIM')) {
    return 'CASTANHAS';
  } else if (nome.includes('PIMENTA') || nome.includes('CURCUMA') || nome.includes('AÇAFRÃO') || nome.includes('TEMPERO') || nome.includes('SAL') || nome.includes('CHIMICHURRI') || nome.includes('PÁPRICA')) {
    return 'TEMPEROS';
  } else if (nome.includes('ERVA') || nome.includes('HORTELÃ') || nome.includes('CAMOMILA') || nome.includes('BOLDO') || nome.includes('HIBISCO')) {
    return 'ERVAS';
  } else {
    return 'SNACKS E OUTROS';
  }
}

// === Rota para listar produtos ===
app.get('/produtos-local', (req, res) => {
  try {
    const dados = fs.readFileSync(caminhoJSON, 'utf8');
    res.type('json').send(dados);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao ler o JSON.' });
  }
});

// === Rota para editar produto ===
app.post('/editar-produto', (req, res) => {
  const { nome, codigo, preco, unidade } = req.body;

  let dados;
  try {
    dados = JSON.parse(fs.readFileSync(caminhoJSON, 'utf8'));
  } catch (e) {
    return res.status(500).json({ erro: 'Erro ao ler o JSON.' });
  }

  const categoria = categorizar(nome);
  let produtoAtualizado = null;

  for (const cat in dados) {
    const index = dados[cat].findIndex(p => p.codigo === codigo);
    if (index !== -1) {
      const removido = dados[cat].splice(index, 1)[0];
      if (!dados[categoria]) dados[categoria] = [];

      produtoAtualizado = {
        nome,
        codigo,
        preco: preco.toString().replace('.', ','),
        unidade: unidade.toUpperCase(),
        imagem: removido.imagem || ""
      };

      dados[categoria].push(produtoAtualizado);
      break;
    }
  }

  if (!produtoAtualizado) {
    return res.status(404).json({ erro: 'Produto não encontrado.' });
  }

  fs.writeFileSync(caminhoJSON, JSON.stringify(dados, null, 2), 'utf8');
  res.json({ sucesso: true, msg: 'Produto atualizado com sucesso!' });
});

// === Rota para remover produto ===
app.delete('/remover-produto/:codigo', (req, res) => {
  const codigo = req.params.codigo;

  let dados;
  try {
    dados = JSON.parse(fs.readFileSync(caminhoJSON, 'utf8'));
  } catch (e) {
    return res.status(500).json({ erro: 'Erro ao ler o JSON.' });
  }

  let removido = false;

  for (const cat in dados) {
    const index = dados[cat].findIndex(p => p.codigo === codigo);
    if (index !== -1) {
      dados[cat].splice(index, 1);
      removido = true;
      if (dados[cat].length === 0) delete dados[cat];
      break;
    }
  }

  if (!removido) {
    return res.status(404).json({ erro: 'Produto não encontrado.' });
  }

  fs.writeFileSync(caminhoJSON, JSON.stringify(dados, null, 2), 'utf8');
  res.json({ sucesso: true, msg: 'Produto removido com sucesso!' });
});

app.listen(PORT, () => {
  console.log(`✅ API rodando em http://localhost:${PORT}`);
});
