
// Lista de músicas. Para trocar ou acrescentar, edite apenas esta lista.
const MUSICAS = [
  { id: 'ela-une', titulo: 'Ela Une Todas as Coisas', artista: 'Jorge Vercillo', arquivo: 'assets/music/ela-une-todas-as-coisas.mp3', simbolo: '🌸', giro: -1 },
  { id: 'fantasmas', titulo: 'Fantasmas', artista: 'Humbe', arquivo: 'assets/music/fantasmas.mp3', simbolo: '🌙', giro: 1 },
  { id: 'velha', titulo: 'Velha Infância', artista: 'Tribalistas', arquivo: 'assets/music/velha-infancia.mp3', simbolo: '🪁', giro: -0.8 },
  { id: 'banda', titulo: 'A Banda', artista: 'Chico Buarque', arquivo: 'assets/music/a-banda.mp3', simbolo: '🎺', giro: 1.2 },
  { id: 'alianca', titulo: 'Aliança', artista: 'Tribalistas', arquivo: 'assets/music/alianca.mp3', simbolo: '💍', giro: -1 }
];

const audio = document.getElementById('audio');
const player = document.getElementById('player');
const btnPlay = document.getElementById('btn-play');
const lista = document.getElementById('lista-musicas');

let musicaAtual = null;

// Cria os cartões na tela de escolha
MUSICAS.forEach(m => {
  const cartao = document.createElement('div');
  cartao.className = 'cartao-musica';
  cartao.id = 'cartao-' + m.id;
  cartao.style.setProperty('--giro', m.giro + 'deg');

  cartao.innerHTML = `
    <div class="selo">${m.simbolo}</div>
    <div class="cartao-info">
      <div class="cartao-titulo">${m.titulo}</div>
      <div class="cartao-artista">${m.artista}</div>
    </div>
    <button class="btn-escolher" type="button">Escolher</button>
  `;

  cartao.querySelector('button').addEventListener('click', () => selecionar(m));
  lista.appendChild(cartao);
});

function selecionar(m) {
  // Se for uma música diferente, inicia a reprodução
  if (!musicaAtual || musicaAtual.id !== m.id) {
    musicaAtual = m;
    audio.src = m.arquivo;
    audio.loop = true;

    audio.play().catch(() => {
      document.getElementById('player-artista').textContent = 'Toque em ▶ para ouvir';
    });

    document.getElementById('player-titulo').textContent = m.titulo;
    document.getElementById('player-artista').textContent = m.artista;

    document.querySelectorAll('.cartao-musica').forEach(c => c.classList.remove('tocando'));
    document.getElementById('cartao-' + m.id).classList.add('tocando');

  } else if (audio.paused) {
    audio.play();
  }

  player.classList.remove('oculto');
  entrarNoAlbum();
}

// Botão pausar / continuar
btnPlay.addEventListener('click', () => {
  if (audio.paused) {
    audio.play().catch(() => {});
  } else {
    audio.pause();
  }
});

audio.addEventListener('play', () => {
  btnPlay.textContent = '⏸';
});

audio.addEventListener('pause', () => {
  btnPlay.textContent = '▶';
});

// Botão trocar de música
document.getElementById('btn-trocar').addEventListener('click', () => {
  mostrarTela('tela-musica');
});

// Se o arquivo de música não for encontrado
audio.addEventListener('error', () => {
  document.getElementById('player-artista').textContent = 'Arquivo de música não encontrado';
});
