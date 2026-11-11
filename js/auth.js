// Login com Supabase Auth. A sessão fica salva no aparelho (não pede senha de novo).

const DOMINIO_EMAIL = '@nossocantinho.com';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Se digitar só "rony" ou "jenny", completa com o domínio
function montarEmail(usuario) {
  const u = usuario.trim().toLowerCase();
  return u.includes('@') ? u : u + DOMINIO_EMAIL;
}

// Chamada ao tocar em "Abrir o presente":
// com sessão salva vai para as músicas, sem sessão vai para o login
async function abrirPresente() {
  const { data } = await db.auth.getSession();
  mostrarTela(data.session ? 'tela-musica' : 'tela-login');
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
  mostrarTela('tela-musica');
});

document.getElementById('btn-sair').addEventListener('click', async () => {
  await db.auth.signOut();
  location.reload();
});