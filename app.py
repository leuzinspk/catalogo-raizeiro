import csv, json, sys

infile = sys.argv[1] if len(sys.argv)>1 else "produtos_granel.csv"
outfile = sys.argv[2] if len(sys.argv)>2 else "produtos_granel.json"

exclude_terms = ["inativo","invativo","promo","desativado"]

rows = []
with open(infile, newline='', encoding='utf-8') as f:
    r = csv.DictReader(f)
    for row in r:
        nome = (row.get("nome") or row.get("Nome") or row.get("produto") or "").strip()
        if not nome: 
            continue
        if any(term in nome.lower() for term in exclude_terms):
            continue
        rows.append({
            "codigo": row.get("codigo",""),
            "nome": nome,
            "preco": row.get("preco",""),
            "unidade": row.get("unidade",""),
            "imagem": row.get("imagem","")
        })

with open(outfile, "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)

print(f"Gerado: {outfile} ({len(rows)} itens)")
