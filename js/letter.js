// Cartas: listar, ler, escrever, editar e excluir (tabela "letters", protegida por login).

const cartaModal   = document.getElementById('modal-carta');
const cartaForm    = document.getElementById('form-carta');
const cartaTitulo  = document.getElementById('carta-titulo');
const cartaTexto   = document.getElementById('carta-texto');
const cartaErro    = document.getElementById('carta-erro');
const cartaSalvar  = document.getElementById('carta-salvar');

const GIROS_CARTAS = [-0.8, 0.6, -0.5];

let cartasAtuais = [];
let cartaAberta = null;
let cartaEditando = null;
let meuId = null;

function nomeDoEmail(email) {
  const n = String(email || '').split('@')[0];
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
}

function dataDaCarta(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function mostrarListaCartas() {
  document.getElementById('carta-leitura-view').classList.add('oculto');
  document.getElementById('cartas-lista-view').classList.remove('oculto');
  cartaAberta = null;
}

async function carregarCartas() {
  const lista = document.getElementById('cartas-lista');
  lista.innerHTML = '<p class="timeline-vazio">Procurando as cartas… ✿</p>';

  const { data: { user } } = await db.auth.getUser();
  meuId = user ? user.id : null;

  const { data, error } = await db
    .from('letters')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    lista.innerHTML = '<p class="timeline-vazio">Não consegui abrir as cartas. Verifique a internet e tente de novo.</p>';
    return;
  }

  cartasAtuais = data;
  renderCartas();
}

function renderCartas() {
  const lista = document.getElementById('cartas-lista');

  if (cartasAtuais.length === 0) {
    lista.innerHTML = '<p class="timeline-vazio">Ainda não há cartas. Que tal escrever a primeira? ✦</p>';
    return;
  }

  lista.innerHTML = cartasAtuais.map((c, i) => `
    <button class="carta-cartao" type="button" data-id="${escaparHtml(c.id)}"
            style="--giro:${GIROS_CARTAS[i % GIROS_CARTAS.length]}deg">
      <span class="selo">✉</span>
      <span class="carta-cartao-info">
        <span class="carta-cartao-titulo">${escaparHtml(c.title)}</span>
        <span class="carta-cartao-meta">${c.author_name ? 'de ' + escaparHtml(c.author_name) + ' · ' : ''}${dataDaCarta(c.created_at)}</span>
      </span>
    </button>`).join('');
}

function abrirCarta(carta) {
  cartaAberta = carta;
  document.getElementById('carta-titulo-leitura').textContent = carta.title;
  document.getElementById('carta-meta').textContent =
    (carta.author_name ? `escrita por ${carta.author_name} · ` : '') + dataDaCarta(carta.created_at);

  const texto = (carta.content || '').trim();
  document.getElementById('carta-corpo').innerHTML = texto
    ? texto.split(/\n\s*\n/)
        .map(p => `<p>${escaparHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
        .join('')
    : '<p class="carta-aviso">Esta carta está vazia… ✦</p>';

  // Só quem escreveu a carta pode editar ou excluir
  document.getElementById('carta-acoes')
    .classList.toggle('oculto', !(meuId && carta.user_id === meuId));

  document.getElementById('cartas-lista-view').classList.add('oculto');
  document.getElementById('carta-leitura-view').classList.remove('oculto');
  window.scrollTo(0, 0);
}

function abrirFormularioCarta(carta) {
  cartaEditando = carta || null;
  cartaForm.reset();
  cartaErro.textContent = '';
  document.getElementById('carta-titulo-tela').textContent = carta ? 'Editar carta' : 'Nova carta';
  if (carta) {
    cartaTitulo.value = carta.title || '';
    cartaTexto.value = carta.content || '';
  }
  cartaModal.classList.remove('oculto');
  document.body.classList.add('modal-aberto');
}

function fecharFormularioCarta() {
  cartaModal.classList.add('oculto');
  document.body.classList.remove('modal-aberto');
  cartaEditando = null;
}

cartaForm.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  cartaErro.textContent = '';
  cartaSalvar.disabled = true;
  cartaSalvar.textContent = 'Salvando…';

  try {
    const dados = { title: cartaTitulo.value.trim(), content: cartaTexto.value.trim() };
    let resposta;

    if (cartaEditando) {
      resposta = await db.from('letters').update(dados).eq('id', cartaEditando.id);
    } else {
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error('Sessão expirada');
      dados.author_name = nomeDoEmail(user.email);
      resposta = await db.from('letters').insert(dados);
    }
    if (resposta.error) throw resposta.error;

    const idEditado = cartaEditando ? cartaEditando.id : null;
    fecharFormularioCarta();
    await carregarCartas();

    const atualizada = idEditado && cartasAtuais.find(c => c.id === idEditado);
    if (atualizada) abrirCarta(atualizada); else mostrarListaCartas();
  } catch (e) {
    console.error(e);
    cartaErro.textContent = 'Não consegui salvar. Verifique a internet e tente de novo.';
  } finally {
    cartaSalvar.disabled = false;
    cartaSalvar.textContent = 'Salvar';
  }
});

async function excluirCarta(carta) {
  const ok = confirm(`Excluir a carta "${carta.title}"?\nEssa ação não pode ser desfeita.`);
  if (!ok) return;

  const { error } = await db.from('letters').delete().eq('id', carta.id);
  if (error) {
    console.error(error);
    alert('Não consegui excluir. Tente de novo.');
    return;
  }
  mostrarListaCartas();
  await carregarCartas();
}

document.getElementById('cartas-lista').addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-id]');
  if (!botao) return;
  const carta = cartasAtuais.find(c => String(c.id) === botao.dataset.id);
  if (carta) abrirCarta(carta);
});

document.getElementById('btn-nova-carta').addEventListener('click', () => abrirFormularioCarta(null));
document.getElementById('carta-voltar').addEventListener('click', mostrarListaCartas);
document.getElementById('carta-editar').addEventListener('click', () => { if (cartaAberta) abrirFormularioCarta(cartaAberta); });
document.getElementById('carta-excluir').addEventListener('click', () => { if (cartaAberta) excluirCarta(cartaAberta); });
document.getElementById('carta-cancelar').addEventListener('click', fecharFormularioCarta);

cartaModal.addEventListener('click', (evento) => {
  if (evento.target === cartaModal) fecharFormularioCarta();
});
document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape' && !cartaModal.classList.contains('oculto')) fecharFormularioCarta();
});

// Ao abrir a aba "Cartas": volta para a lista e busca as cartas mais recentes
document.querySelector('.menu-btn[data-aba="aba-carta"]').addEventListener('click', () => {
  mostrarListaCartas();
  window.scrollTo(0, 0);
  carregarCartas();
});