// Login com Supabase Auth. A sessão fica salva no aparelho (não pede senha de novo).

const DOMINIO_EMAIL = '@nossocantinho.com';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Se digitar só "rony" ou "jenny", completa com o domínio
function montarEmail(usuario) {
  const u = usuario.trim().toLowerCase();
  return u.includes('@') ? u : u + DOMINIO_EMAIL;
}

// Chamada depois de escolher a música
async function entrarNoAlbum() {
  const { data } = await db.auth.getSession();
  if (data.session) {
    mostrarTela('tela-album');
    carregarLembrancas();
  } else {
    mostrarTela('tela-login');
  }
}

document.getElementById('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const erro = document.getElementById('login-erro');
  const botao = document.getElementById('btn-login');
  erro.textContent = '';
  botao.disabled = true;
  botao.textContent = 'Entrando…';

  const { error } = await db.auth.signInWithPassword({
    email: montarEmail(document.getElementById('login-usuario').value),
    password: document.getElementById('login-senha').value
  });

  botao.disabled = false;
  botao.textContent = 'Entrar';

  if (error) {
    erro.textContent = 'Usuário ou senha incorretos.';
    return;
  }
  mostrarTela('tela-album');
  carregarLembrancas();
});

document.getElementById('btn-sair').addEventListener('click', async () => {
  await db.auth.signOut();
  location.reload();
});