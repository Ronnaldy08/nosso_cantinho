// Adicionar, editar e excluir lembranças (com upload de foto e data flexível).

const memModal   = document.getElementById('modal-memoria');
const memForm    = document.getElementById('form-memoria');
const memTitulo  = document.getElementById('mem-titulo');
const memDia     = document.getElementById('mem-dia');
const memMes     = document.getElementById('mem-mes');
const memAno     = document.getElementById('mem-ano');
const memDesc    = document.getElementById('mem-desc');
const memFoto    = document.getElementById('mem-foto');
const memPrevia  = document.getElementById('mem-previa');
const memErro    = document.getElementById('mem-erro');
const memSalvar  = document.getElementById('mem-salvar');

let memEditando = null;
let memFotoNova = null;

class ErroDeData extends Error {}

// Valida e monta a data conforme o que foi preenchido
function obterDataMemoria() {
  const ano = Number(memAno.value);
  const mes = memMes.value ? Number(memMes.value) : null;
  const dia = memDia.value ? Number(memDia.value) : null;

  if (!Number.isInteger(ano) || ano < 1900 || ano > 2100) {
    throw new ErroDeData('Informe um ano válido entre 1900 e 2100.');
  }
  if (memDia.value && !dia) {
    throw new ErroDeData('Informe um dia válido.');
  }
  if (dia && !mes) {
    throw new ErroDeData('Para informar o dia, escolha também o mês.');
  }

  const p = n => String(n).padStart(2, '0');

  if (dia) {
    const teste = new Date(ano, mes - 1, dia);
    if (teste.getFullYear() !== ano || teste.getMonth() !== mes - 1 || teste.getDate() !== dia) {
      throw new ErroDeData('Essa data não existe. Confira o dia e o mês.');
    }
    return { data: `${ano}-${p(mes)}-${p(dia)}`, precisao: 'dia' };
  }
  if (mes) {
    return { data: `${ano}-${p(mes)}-01`, precisao: 'mes' };
  }
  return { data: `${ano}-01-01`, precisao: 'ano' };
}

// Abre o formulário para criar ou editar
function abrirFormulario(memoria) {
  memEditando = memoria || null;
  memFotoNova = null;
  memForm.reset();
  memErro.textContent = '';

  document.getElementById('mem-titulo-tela').textContent =
    memoria ? 'Editar lembrança' : 'Nova lembrança';

  if (memoria) {
    const [ano, mes, dia] = String(memoria.memory_date).slice(0, 10).split('-').map(Number);
    const precisao = memoria.date_precision || 'dia';
    memAno.value = ano;
    memMes.value = precisao === 'ano' ? '' : String(mes);
    memDia.value = precisao === 'dia' ? String(dia) : '';
    memTitulo.value = memoria.title || '';
    memDesc.value = memoria.description || '';
  } else {
    memAno.value = new Date().getFullYear();   // só o ano vem preenchido
  }

  if (memoria && memoria.image_url) {
    memPrevia.src = memoria.image_url;
    memPrevia.classList.remove('oculto');
  } else {
    memPrevia.removeAttribute('src');
    memPrevia.classList.add('oculto');
  }

  memModal.classList.remove('oculto');
  document.body.classList.add('modal-aberto');
}

function fecharFormulario() {
  memModal.classList.add('oculto');
  document.body.classList.remove('modal-aberto');
  memEditando = null;
  memFotoNova = null;
}

// Reduz a foto e converte para JPEG
function reduzirFoto(arquivo, maxLado = 1600, qualidade = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * escala);
      const h = Math.round(img.naturalHeight * escala);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Falha ao converter a foto')),
        'image/jpeg',
        qualidade
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não consegui ler essa foto'));
    };

    img.src = url;
  });
}

// Pré-visualização da fotografia
memFoto.addEventListener('change', async () => {
  const arquivo = memFoto.files[0];
  memErro.textContent = '';
  memFotoNova = null;
  if (!arquivo) return;

  try {
    memFotoNova = await reduzirFoto(arquivo);
    memPrevia.src = URL.createObjectURL(memFotoNova);
    memPrevia.classList.remove('oculto');
  } catch (e) {
    console.error(e);
    memFoto.value = '';
    memErro.textContent = 'Não consegui usar essa foto. Tente outra (JPG ou PNG).';
  }
});

// Salvar ou atualizar lembrança
memForm.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  memErro.textContent = '';
  memSalvar.disabled = true;
  memSalvar.textContent = 'Salvando…';

  const bucket = db.storage.from('memory-photos');
  let novoCaminho = null;
  let salvou = false;

  try {
    // Valida a data antes de enviar a fotografia
    const dataMemoria = obterDataMemoria();

    const { data: { user }, error: erroUsuario } = await db.auth.getUser();
    if (erroUsuario || !user) throw new Error('Sessão expirada');

    // 1) envia a foto nova, se houver
    if (memFotoNova) {
      novoCaminho = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await bucket.upload(novoCaminho, memFotoNova, { contentType: 'image/jpeg' });
      if (error) throw error;
    }

    // 2) salva os dados
    const dados = {
      title: memTitulo.value.trim(),
      description: memDesc.value.trim(),
      memory_date: dataMemoria.data,
      date_precision: dataMemoria.precisao
    };
    if (novoCaminho) dados.image_path = novoCaminho;

    const resposta = memEditando
      ? await db.from('memories').update(dados).eq('id', memEditando.id)
      : await db.from('memories').insert(dados);
    if (resposta.error) throw resposta.error;
    salvou = true;

    // 3) apaga a foto antiga se foi substituída
    if (memEditando && novoCaminho && memEditando.image_path) {
      await bucket.remove([memEditando.image_path]);
    }

    fecharFormulario();
    await carregarLembrancas();
  } catch (e) {
    console.error(e);
    // desfaz o upload só se a lembrança não chegou a ser salva
    if (novoCaminho && !salvou) await bucket.remove([novoCaminho]);
    memErro.textContent = (e instanceof ErroDeData)
      ? e.message
      : 'Não consegui salvar. Verifique a internet e tente de novo.';
  } finally {
    memSalvar.disabled = false;
    memSalvar.textContent = 'Salvar';
  }
});

// Excluir lembrança
async function excluirMemoria(memoria) {
  const ok = confirm(`Excluir a lembrança "${memoria.title}"?\nEssa ação não pode ser desfeita.`);
  if (!ok) return;

  const { error } = await db.from('memories').delete().eq('id', memoria.id);
  if (error) {
    console.error(error);
    alert('Não consegui excluir. Tente de novo.');
    return;
  }
  if (memoria.image_path) {
    await db.storage.from('memory-photos').remove([memoria.image_path]);
  }
  await carregarLembrancas();
}

// Botões: adicionar, cancelar, editar e excluir
document.getElementById('btn-nova').addEventListener('click', () => abrirFormulario(null));
document.getElementById('mem-cancelar').addEventListener('click', fecharFormulario);

document.getElementById('timeline').addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;
  const memoria = memoriasAtuais.find(m => String(m.id) === botao.dataset.id);
  if (!memoria) return;
  if (botao.dataset.acao === 'editar') abrirFormulario(memoria);
  if (botao.dataset.acao === 'excluir') excluirMemoria(memoria);
});

// Fechar tocando fora do cartão ou com a tecla Esc
memModal.addEventListener('click', (evento) => {
  if (evento.target === memModal) fecharFormulario();
});
document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape' && !memModal.classList.contains('oculto')) fecharFormulario();
});