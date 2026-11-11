// Adicionar, editar e excluir lembranças (com upload de foto).

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

let memEditando = null;   // lembrança que está sendo editada (ou null se for nova)
let memFotoNova = null;   // foto já reduzida, pronta para enviar

function preencherDataAtual() {
  const hoje = new Date();

  memDia.value = hoje.getDate();
  memMes.value = hoje.getMonth() + 1;
  memAno.value = hoje.getFullYear();
}

function abrirFormulario(memoria) {
  memEditando = memoria || null;
  memFotoNova = null;
  memForm.reset();
  memErro.textContent = '';

  document.getElementById('mem-titulo-tela').textContent =
    memoria ? 'Editar lembrança' : 'Nova lembrança';

   if (memoria) {
    const [ano, mes, dia] = String(memoria.memory_date).slice(0, 10).split('-');

    memAno.value = ano;
    memMes.value = memoria.date_precision === 'ano' ? '' : Number(mes);
    memDia.value = memoria.date_precision === 'dia' ? Number(dia) : '';
  } else {
    preencherDataAtual();
  }

// Valida e monta a data conforme as informações preenchidas
function obterDataMemoria() {
  const ano = Number(memAno.value);
  const mes = memMes.value ? Number(memMes.value) : null;
  const dia = memDia.value ? Number(memDia.value) : null;

  if (!Number.isInteger(ano) || ano < 1900 || ano > 2100) {
    throw new Error('Informe um ano válido entre 1900 e 2100.');
  }

  if (dia && !mes) {
    throw new Error('Para informar o dia, você também precisa informar o mês.');
  }

  let precisao = 'ano';
  let data = `${ano}-01-01`;

  if (mes) {
    precisao = 'mes';
    data = `${ano}-${String(mes).padStart(2, '0')}-01`;
  }

  if (dia) {
    const dataTeste = new Date(ano, mes - 1, dia);

    if (
      dataTeste.getFullYear() !== ano ||
      dataTeste.getMonth() !== mes - 1 ||
      dataTeste.getDate() !== dia
    ) {
      throw new Error('Essa data não existe. Confira o dia e o mês.');
    }

    precisao = 'dia';
    data = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  return { data, precisao };
}


  if (memoria) {
    memTitulo.value = memoria.title || '';
    memDesc.value = memoria.description || '';
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

// Reduz a foto (celulares geram arquivos de 3 a 8 MB) e converte para JPEG
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

memForm.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  memErro.textContent = '';
  memSalvar.disabled = true;
  memSalvar.textContent = 'Salvando…';

  const bucket = db.storage.from('memory-photos');
  let novoCaminho = null;

  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sessão expirada');

    // 1) envia a foto nova (se houver)
    if (memFotoNova) {
      novoCaminho = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await bucket.upload(novoCaminho, memFotoNova, { contentType: 'image/jpeg' });
      if (error) throw error;
    }

    // 2) salva os dados
    
    // 2) valida e salva os dados
    const dataMemoria = obterDataMemoria();

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

    if (resposta.error) {
      if (novoCaminho) await bucket.remove([novoCaminho]);  // desfaz o upload
      throw resposta.error;
    }

    // 3) se trocou a foto de uma lembrança existente, apaga a antiga
    if (memEditando && novoCaminho && memEditando.image_path) {
      await bucket.remove([memEditando.image_path]);
    }

    fecharFormulario();
    await carregarLembrancas();
  }   } catch (e) {
    console.error(e);
    memErro.textContent = e.message || 'Não consegui salvar. Verifique a internet e tente de novo.';
  } finally {
    memSalvar.disabled = false;
    memSalvar.textContent = 'Salvar';
  }
});

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