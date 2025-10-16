require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: { encrypt: false, trustServerCertificate: true }
};

function normalize(str) {
  return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : "";
}

// === Mapeamento de categorias automáticas ===
function categorizar(nome) {
  const n = normalize(nome);
  if (n.includes("MEL")) return "MÉIS";
  if (n.includes("WHEY") || n.includes("CREATINA") || n.includes("PROTEINA") || n.includes("SUPLEMENTO")) return "SUPLEMENTOS";
  if (n.includes("FARIN") || n.includes("AVEIA") || n.includes("FUBA") || n.includes("POLVILHO") || n.includes("AMIDO")) return "FARINHAS";
  if (n.includes("ERVA") || n.includes("CHÁ") || n.includes("BOLDO") || n.includes("HIBISCO") || n.includes("HORTELA")) return "ERVAS (CHÁS)";
  if (n.includes("CAPS")) return "CÁPSULAS";
  if (n.includes("CALDA") || n.includes("XAROPE") || n.includes("COBERTURA")) return "CALDAS";
  if (n.includes("GLUTEN")) return "PRODUTOS SEM GLÚTEN";
  if (n.includes("ZERO") || n.includes("AÇUCAR")) return "PRODUTOS ZERO AÇÚCAR";
  if (n.includes("LACTOSE")) return "PRODUTOS SEM LACTOSE";
  if (n.includes("ESSENCIA") || n.includes("EXTRATO")) return "ESSÊNCIAS";
  if (n.includes("CORANTE")) return "CORANTES";
  if (n.includes("CASTANHA") || n.includes("AMENDOA") || n.includes("NOZ") || n.includes("AMENDOIM")) return "OLEAGINOSAS";
  if (n.includes("PIMENTA") || n.includes("CURCUMA") || n.includes("AÇAFRAO") || n.includes("TEMPERO") || n.includes("SAL") || n.includes("PAPRICA")) return "TEMPEROS";
  return "Outros";
}

async function atualizarJSON() {
  try {
    await sql.connect(config);
    const request = new sql.Request();
    const result = await request.execute('sp_TabelasPreco1e2');
    const produtos = result.recordset;

    // === Lê o JSON antigo (para manter imagens) ===
    const caminho = path.join(__dirname, 'produtos.json');
    let jsonAntigo = {};
    if (fs.existsSync(caminho)) {
      try {
        jsonAntigo = JSON.parse(fs.readFileSync(caminho, 'utf8'));
      } catch (e) {
        console.warn("⚠️ Não foi possível ler produtos.json antigo, criando novo.");
      }
    }

    // Cria mapa de imagens antigas (por nome)
    const mapaImagens = {};
    Object.values(jsonAntigo).flat().forEach(p => {
      if (p.nome && p.imagem) mapaImagens[p.nome] = p.imagem;
    });

    const agrupado = {};

    produtos.forEach(prod => {
      const nome = prod.nome_Prod || "";
      const categoria = categorizar(nome);
      if (!agrupado[categoria]) agrupado[categoria] = [];

      agrupado[categoria].push({
        codigo: String(prod["id Prod"]),
        nome,
        preco: (prod.pVenda_TAB1 || "").toString(),
        unidade: (prod.unidade || "").toUpperCase(),
        imagem: mapaImagens[nome] || "" // mantém imagem antiga se existir
      });
    });

    fs.writeFileSync(caminho, JSON.stringify(agrupado, null, 2), 'utf8');
    console.log("✅ produtos.json atualizado e categorizado com sucesso (imagens preservadas)!");
    sql.close();
  } catch (err) {
    console.error("❌ Erro ao atualizar JSON:", err);
    sql.close();
  }
}

atualizarJSON();

