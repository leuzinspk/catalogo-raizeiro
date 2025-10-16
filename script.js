(() => {
  const PAGE_SIZE = 100;
  
  const LOCAL_JSON = 'produtos.json';

  // DOM
  const elCategories = document.getElementById('categories');
  const elGrid = document.getElementById('grid');
  const elLoadMore = document.getElementById('loadMoreBtn');
  const elBack = document.getElementById('btnBack');
  const elSearch = document.getElementById('search');
  const elSortBy = document.getElementById('sortBy');
  const elEmpty = document.getElementById('empty');
  const produtosArea = document.getElementById('produtosArea');
  const categoriaTitle = document.getElementById('categoriaTitle');
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalClose = document.getElementById('modal-close');

  let allProducts = [];
  let categories = {};
  let currentCategory = null;
  let visibleCount = PAGE_SIZE;
  let currentList = [];

  const CATS = {
    "MEL": ["MEL"],
    "SUPLEMENTOS": ["WHEY", "PROTEINA", "CREATINA", "SUPLEMENTO"],
    "FARINHAS": ["FARINHA", "AVEIA", "POLVILHO", "AMIDO", "FUBA", "FLOCOS"],
    "ERVAS (Chás)": ["ERVA", "CAMOMILA", "HIBISCO", "BOLDO", "HORTELA"],
    "CÁPSULAS": ["CAPS", "CAPSULA", "CÁPSULA"],
    "CALDAS": ["CALDA", "XAROPE", "COBERTURA"],
    "SEM GLÚTEN": ["SEM GLUTEN", "S/GLUTEN"],
    "ZERO AÇÚCAR": ["ZERO", "SEM AÇUCAR"],
    "SEM LACTOSE": ["LACTOSE", "SEM LACTOSE"],
    "ESSÊNCIAS": ["ESSENCIA", "EXTRATO"],
    "CORANTES": ["CORANTE", "CORANTES"],
    "OLEAGINOSAS": ["CASTANHA", "AMENDOIM", "AMENDOA", "NOZ"],
    "TEMPEROS": ["PIMENTA", "PAPRICA", "PÁPRICA", "CURCUMA", "AÇAFRAO", "TEMPERO", "SAL", "COMINHO", "CEBOLA", "ALHO"]
  };

  function normalizeStr(s) {
    return String(s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  }

  function normalizeFileName(name) {
    return String(name || '').normalize("NFD").replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^\w_]/g, '').toLowerCase();
  }

  function isValidProduct(nome) {
    if (!nome) return false;
    const lower = nome.toLowerCase();
    return !(lower.includes('promo') || lower.includes('inativo'));
  }

  async function fetchCombinedData() {
    let jsonData = {};
    try {
      const localRes = await fetch(LOCAL_JSON);
      if(localRes.ok) jsonData = await localRes.json();
    } catch (err) {
      console.warn("⚠️ Erro ao carregar local JSON, tentando API...");
    }

    try {
      const apiRes = await fetch(API_URL);
      if(apiRes.ok) {
        const apiData = await apiRes.json();
        for(const cat in apiData) {
          if(!jsonData[cat]) jsonData[cat] = [];
          jsonData[cat] = [...jsonData[cat], ...apiData[cat]];
        }
      }
    } catch(err) {
      console.warn("⚠️ API indisponível, usando apenas JSON local.");
    }

    allProducts = Object.values(jsonData).flat().filter(p => isValidProduct(p.nome));
    categorizeAll();
    renderCategories();
  }

  function categorizeAll() {
    categories = {};
    Object.keys(CATS).forEach(k => categories[k] = []);
    categories['Outros'] = [];

    allProducts.forEach(p => {
      const text = normalizeStr(p.nome);
      let matched = false;
      for(const cat in CATS) {
        for(const word of CATS[cat]) {
          if(text.includes(normalizeStr(word))) {
            categories[cat].push(p);
            matched = true;
            break;
          }
        }
        if(matched) break;
      }
      if(!matched) categories['Outros'].push(p);
    });

    for(const cat in categories) {
      if(!categories[cat].length) delete categories[cat];
    }
  }

  function renderCategories() {
    elCategories.innerHTML = '';
    elCategories.style.display = 'grid';
    produtosArea.style.display = 'none';
    elEmpty.style.display = 'none';

    Object.keys(categories).sort((a,b) => categories[b].length - categories[a].length).forEach(cat => {
      const card = document.createElement('div');
      card.className = 'cat-card';
      const h = document.createElement('h3'); h.textContent = cat;
      card.appendChild(h); // **Não criamos mais o "p" da quantidade**
      card.onclick = () => openCategory(cat);
      elCategories.appendChild(card);
    });
  }

  function openCategory(cat) {
    currentCategory = cat;
    visibleCount = PAGE_SIZE;
    currentList = categories[cat].slice();
    elCategories.style.display = 'none';
    produtosArea.style.display = 'block';
    categoriaTitle.textContent = cat;
    applyFiltersAndRender();
  }

  function backToCategories() {
    currentCategory = null;
    elCategories.style.display = 'grid';
    produtosArea.style.display = 'none';
    elGrid.innerHTML = '';
    elLoadMore.style.display = 'none';
    elEmpty.style.display = 'none';
  }

  function renderProducts(listSlice) {
    elGrid.innerHTML = '';
    if(!listSlice.length) { elEmpty.style.display = 'block'; elEmpty.textContent = 'Nenhum produto encontrado.'; return; }
    elEmpty.style.display = 'none';

    listSlice.forEach(p => {
      const card = document.createElement('div'); card.className = 'card';
      const thumb = document.createElement('div'); thumb.className = 'thumb';

      const img = document.createElement('img');
      img.src = p.imagem || `imagens/${normalizeFileName(p.nome)}.jpg`;
      img.alt = p.nome;
      img.onerror = () => { thumb.innerHTML = p.nome; thumb.style.fontSize='20px'; thumb.style.textAlign='center'; };
      img.addEventListener('click', e=> { e.stopPropagation(); openModal(p); });

      thumb.appendChild(img);
      card.appendChild(thumb);

      const name = document.createElement('div'); name.className = 'name'; name.textContent = p.nome;
      card.appendChild(name);

      elGrid.appendChild(card);
    });

    elLoadMore.style.display = visibleCount < currentList.length ? 'block' : 'none';
  }

  function applyFiltersAndRender() {
  const q = normalizeStr(elSearch.value);

  // TELA INICIAL (categorias)
  if (!currentCategory) {
    if (!q) {
      // campo vazio → mostra categorias
      elCategories.style.display = 'grid';
      produtosArea.style.display = 'none';
      elGrid.innerHTML = '';
      elLoadMore.style.display = 'none';
      elEmpty.style.display = 'none';
      return;
    } else {
      // pesquisa digitada → mostra todos os produtos que batem
      currentList = allProducts.filter(p => normalizeStr(p.nome).includes(q));
      visibleCount = PAGE_SIZE;
      elCategories.style.display = 'none';
      produtosArea.style.display = 'block';
      categoriaTitle.textContent = `Resultado da pesquisa`;
    }
  } else {
    // TELA DE CATEGORIA SELECIONADA
    currentList = categories[currentCategory].slice();
    if (q) {
      currentList = currentList.filter(p => normalizeStr(p.nome).includes(q));
    }
  }

  renderProducts(currentList.slice(0, visibleCount));
}

  // MODAL
  function openModal(p) {
    modalTitle.textContent = p.nome;
    modalImg.src = p.imagem || `imagens/${normalizeFileName(p.nome)}.jpg`;
    modal.classList.add('open');
  }
  function closeModal() { modal.classList.remove('open'); }
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if(e.target===modal) closeModal(); });

  // EVENTOS
  elBack.addEventListener('click', backToCategories);
  elLoadMore.addEventListener('click', ()=> { visibleCount+=PAGE_SIZE; applyFiltersAndRender(); });
  elSearch.addEventListener('input', ()=>{ visibleCount=PAGE_SIZE; applyFiltersAndRender(); });
  elSortBy.addEventListener('change', ()=>{ visibleCount=PAGE_SIZE; applyFiltersAndRender(); });

  fetchCombinedData();
})();




