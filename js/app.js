// Troca de telas e abas, sem recarregar a página.

function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById(id).classList.add('ativa');
  window.scrollTo(0, 0);
}

document.getElementById('btn-abrir').addEventListener('click', () => {
  mostrarTela('tela-musica');
});

// Menu do álbum (Linha temporal / Minha carta)
document.querySelectorAll('.menu-btn').forEach(botao => {
  botao.addEventListener('click', () => {
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('ativo'));
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('ativa'));

    botao.classList.add('ativo');
    document.getElementById(botao.dataset.aba).classList.add('ativa');
  });
});