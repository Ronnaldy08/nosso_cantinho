// Linha temporal: busca as lembranças no Supabase e desenha na tela.

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
               'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Evita que textos digitados sejam interpretados como HTML
function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Formata a data conforme a precisão informada:
// dia: 16 de agosto de 2026
// mes: agosto de 2026
// ano: 2026
function formatarData(iso, precisao = 'dia') {
  const [ano, mes, dia] = String(iso).slice(0, 10).split('-').map(Number);

  if (precisao === 'ano') {
    return String(ano);
  }

  if (precisao === 'mes') {
    return `${MESES[mes - 1]} de ${ano}`;
  }

  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

// Imagem usada quando a lembrança não tem foto
function fotoPlaceholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#E9DCC9"/>
    <rect x="12" y="12" width="376" height="276" fill="none" stroke="#B58D79" stroke-width="2" stroke-dasharray="6 6"/>
    <text x="200" y="170" font-size="72" text-anchor="middle" fill="#A66F73">✿</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const GIROS = [-3, 2.5, -2, 3];
const ENFEITES = ['✿', '✦', '❀', '✦'];

// Busca no banco, gera links temporários das fotos (bucket privado) e desenha
async function carregarLembrancas() {
  const container = document.getElementById('timeline');
  container.innerHTML = '<p class="timeline-vazio">Folheando as páginas… ✿</p>';

  const { data, error } = await db
    .from('memories')
    .select('*')
    .order('memory_date', { ascending: true });

  if (error) {
    console.error(error);
    container.innerHTML = '<p class="timeline-vazio">Não consegui carregar as lembranças. Verifique a internet e tente de novo.</p>';
    return;
  }

  const caminhos = data.filter(m => m.image_path).map(m => m.image_path);
  const urls = {};
  if (caminhos.length > 0) {
    const { data: assinadas } = await db.storage
      .from('memory-photos')
      .createSignedUrls(caminhos, 3600);
    (assinadas || []).forEach(a => { if (a.signedUrl) urls[a.path] = a.signedUrl; });
  }
  data.forEach(m => { m.image_url = urls[m.image_path] || null; });

  renderTimeline(data);
}

function renderTimeline(memorias) {
  const container = document.getElementById('timeline');

  if (!memorias || memorias.length === 0) {
    container.innerHTML = '<p class="timeline-vazio">Ainda não há lembranças. Que tal adicionar a primeira? ✿</p>';
    return;
  }

  // Ordem cronológica (mais antiga primeiro)
  const ordenadas = [...memorias].sort((a, b) =>
    String(a.memory_date).localeCompare(String(b.memory_date)));

  container.innerHTML = ordenadas.map((m, i) => {
    const lado = i % 2 === 0 ? 'foto-esq' : 'foto-dir';
    const foto = m.image_url ? escaparHtml(m.image_url) : fotoPlaceholder();
    return `
      <article class="item ${lado}">
        <figure class="foto-wrap">
          <div class="polaroid" style="--giro:${GIROS[i % GIROS.length]}deg">
            <span class="fita"></span>
            <img src="${foto}" alt="${escaparHtml(m.title)}" loading="lazy">
          </div>
        </figure>
        <span class="marcador">${ENFEITES[i % ENFEITES.length]}</span>
        <div class="texto-wrap">
          <div class="registro">
            <p class="data">${formatarData(m.memory_date, m.date_precision)}</p>
            <h3>${escaparHtml(m.title)}</h3>
            <p class="desc">${escaparHtml(m.description)}</p>
          </div>
        </div>
      </article>`;
  }).join('');

  animarEntrada();
}

// Cada lembrança aparece suavemente ao rolar a página
function animarEntrada() {
  const itens = document.querySelectorAll('#timeline .item');
  if (!('IntersectionObserver' in window)) {
    itens.forEach(i => i.classList.add('visivel'));
    return;
  }
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visivel');
        observador.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  itens.forEach(i => observador.observe(i));
}

// Botão de adicionar (o formulário vem na Etapa 4C)
document.getElementById('btn-nova').addEventListener('click', () => {
  alert('O formulário para adicionar lembranças chega na próxima etapa. ✿');
});