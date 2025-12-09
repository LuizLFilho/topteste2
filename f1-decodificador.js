// script.js - minimal, mobile-first, apenas frontend
// usa PDF.js para abrir PDF (com suporte a senha) e extrair texto procurando 47/48 dígitos

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const fileInput = document.getElementById('fileInput');
const statusEl = document.getElementById('status');
const previewCard = document.getElementById('previewCard');
const canvasHolder = document.getElementById('canvasHolder');
const resultBox = document.getElementById('resultBox');
const btnCopy = document.getElementById('btnCopy');
const btnShowFormatted = document.getElementById('btnShowFormatted');

const pwdModal = document.getElementById('pwdModal');
const pwdInput = document.getElementById('pwdInput');
const pwdOk = document.getElementById('pwdOk');
const pwdCancel = document.getElementById('pwdCancel');

let lastArrayBuffer = null;
let lastPdfDoc = null;
let passwordResolve = null;

// helper status
function setStatus(msg){ statusEl.textContent = msg; console.log(msg); }

// prompt de senha -> retorna Promise<string|null>
function promptPassword(){
  pwdInput.value = '';
  pwdModal.style.display = 'flex';
  pwdModal.setAttribute('aria-hidden','false');
  pwdInput.focus();
  return new Promise((res)=> passwordResolve = res);
}
function closePwdModal(){ pwdModal.style.display = 'none'; pwdModal.setAttribute('aria-hidden','true'); }

// eventos modal
pwdOk?.addEventListener('click', () => { closePwdModal(); if (passwordResolve) passwordResolve(pwdInput.value || null); });
pwdCancel?.addEventListener('click', () => { closePwdModal(); if (passwordResolve) passwordResolve(null); });

// upload handler
fileInput.addEventListener('change', async (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
    setStatus('Por favor selecione um arquivo PDF.');
    return;
  }
  setStatus('Arquivo selecionado: ' + f.name);
  lastArrayBuffer = await f.arrayBuffer();
  await processPdf(lastArrayBuffer);
});

// processamento principal
async function processPdf(arrayBuffer){
  // reset UI
  previewCard.style.display = 'none';
  resultBox.textContent = '—';
  btnCopy.disabled = true;
  btnShowFormatted.disabled = true;
  canvasHolder.innerHTML = '<div class="muted">Carregando...</div>';

  try{
    lastPdfDoc = await openPdfWithPassword(arrayBuffer);
  }catch(err){
    setStatus('Erro ao abrir PDF: ' + (err && err.message ? err.message : err));
    canvasHolder.innerHTML = '<div class="muted">Erro ao abrir PDF</div>';
    return;
  }

  setStatus('PDF aberto: ' + lastPdfDoc.numPages + ' página(s)');
  previewCard.style.display = 'block';

  // renderiza primeira página em canvas pra visual
  try{ await renderPageToCanvas(1); }catch(e){ console.warn('render erro', e); }

  // tenta extrair linha digitável (procura 47/48 dígitos)
  const found = await extractCodeFromText(lastPdfDoc);
  if (!found){
    setStatus('Não encontrou a linha digitável (texto).');
    // mostra mensagem, mantém preview e permite usuário reenviar outro pdf se quiser
  }
}

// abrir PDF com suporte a senha via modal
async function openPdfWithPassword(arrayBuffer){
  async function tryOpen(pwCandidate){
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, password: pwCandidate });
    try{
      const pdf = await loadingTask.promise;
      return pdf;
    }catch(err){
      // PDF.js lança PasswordException quando precisa de senha
      if (err && err.name === 'PasswordException'){
        const pw = await promptPassword();
        if (!pw) throw new Error('Senha não fornecida');
        return await tryOpen(pw);
      } else {
        throw err;
      }
    }
  }
  return await tryOpen(null);
}

// renderiza página no canvasHolder
async function renderPageToCanvas(pageNumber=1){
  const page = await lastPdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.2 }); // escala moderada para celular
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: false });
  await page.render({ canvasContext: ctx, viewport }).promise;
  canvasHolder.innerHTML = '';
  canvasHolder.appendChild(canvas);
}

// extrai texto e procura sequências de 47 ou 48 dígitos
async function extractCodeFromText(pdf){
  const num = pdf.numPages;
  for(let i=1;i<=num;i++){
    try{
      const page = await pdf.getPage(i);
      const txt = await page.getTextContent();
      const strings = txt.items.map(it => it.str || '').join(' ');
      // normaliza: remove quebras e caracteres extras, deixa somente dígitos em sequência
      const digitsOnly = strings.replace(/\D/g,'');
      // procura 47 ou 48
      let m = digitsOnly.match(/(\d{47,48})/);
      if (m){
        const code = m[1];
        showFoundCode(code, `Texto extraído (página ${i})`);
        await renderPageToCanvas(i);
        return true;
      }
      // tenta também detectar partes formatadas (com pontos/espacos)
      const groups = strings.match(/(\d{1,5}[\.\s\-]?\d{1,5}[\.\s\-]?\d{1,5}[\.\s\-]?\d{1,5}[\.\s\-]?\d{1,5,}?)/g);
      // fallback simples: pega qualquer grupo de dígitos que ao juntar dê 47/48
      if (groups){
        for(const g of groups){
          const raw = g.replace(/\D/g,'');
          if (raw.length === 47 || raw.length === 48){
            showFoundCode(raw, `Texto extraído (página ${i})`);
            await renderPageToCanvas(i);
            return true;
          }
        }
      }
      // se não encontrou, continua para próxima página
    }catch(err){
      console.warn('erro extrair página', i, err);
    }
  }
  return false;
}

// exibir resultado e ativar copiar
function showFoundCode(digits, methodText){
  const onlyDigits = digits.replace(/\D/g,'');
  const formatted = formatReadable(onlyDigits);
  resultBox.textContent = formatted;
  resultBox.dataset.raw = onlyDigits;
  resultBox.dataset.formatted = formatted;
  btnCopy.disabled = false;
  btnShowFormatted.disabled = false;
  setStatus('Código detectado (' + onlyDigits.length + ' dígitos) — ' + methodText);
}

// formata para visual (apenas estética)
function formatReadable(d){
  if (!d) return '—';
  if (d.length === 47){
    // exemplo simples: agrupa em 5-5-5-6-... (visual apenas)
    return d.replace(/(.{5})(.{5})(.{5})(.{6})(.{6})(.{6})(.{14})/, '$1 $2 $3 $4 $5 $6 $7').trim();
  } else if (d.length === 48){
    return d.replace(/(.{4})/g,'$1 ').trim();
  } else if (d.length === 44){
    return d.replace(/(.{4})/g,'$1 ').trim();
  } else {
    return d.replace(/(.{4})/g,'$1 ').trim();
  }
}

// copiar para a área de transferência (apenas dígitos)
btnCopy.addEventListener('click', async () => {
  const raw = resultBox.dataset.raw || '';
  if (!raw) return;
  try{
    await navigator.clipboard.writeText(raw);
    setStatus('Código copiado.');
    btnCopy.textContent = 'Copiado ✓';
    setTimeout(()=> btnCopy.textContent = 'Copiar (somente dígitos)', 1400);
  }catch(err){
    setStatus('Erro ao copiar: ' + err);
  }
});

btnShowFormatted.addEventListener('click', () => {
  const formatted = resultBox.dataset.formatted || resultBox.textContent || '—';
  alert('Formato legível:\n\n' + formatted);
});

// D&D opcional: arrastar arquivo para a área do botão (melhora UX)
(function enableDragDrop(){
  const mainCard = document.getElementById('mainCard');
  mainCard.addEventListener('dragover', (e)=>{ e.preventDefault(); mainCard.style.opacity = '0.9'; });
  mainCard.addEventListener('dragleave', (e)=>{ e.preventDefault(); mainCard.style.opacity = '1'; });
  mainCard.addEventListener('drop', async (e)=>{
    e.preventDefault();
    mainCard.style.opacity = '1';
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setStatus('Arraste apenas arquivos PDF.');
      return;
    }
    fileInput.files = e.dataTransfer.files;
    lastArrayBuffer = await f.arrayBuffer();
    await processPdf(lastArrayBuffer);
  });
})();
