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

// extrai texto e procura sequências de 47 ou 48 dígitos com regex específicos
async function extractCodeFromText(pdf){
  const num = pdf.numPages;
  for(let i=1;i<=num;i++){
    try{
      const page = await pdf.getPage(i);
      const txt = await page.getTextContent();
      const strings = txt.items.map(it => it.str || '').join(' ');
      const normalized = strings.replace(/\s+/g, ' ').trim();

      // Regex prioritário para boleto bancário (47 dígitos): 5.5 5.6 5.6 1 14 (pontos opcionais)
      const regex47 = /(\d{5})[\.]?(\d{5})\s*(\d{5})[\.]?(\d{6})\s*(\d{5})[\.]?(\d{6})\s*(\d{1})\s*(\d{14})/;
      const m47 = regex47.exec(normalized);
      if (m47) {
        const code = m47.slice(1).join('');
        if (code.length === 47 && isValidBoletoBancario(code)) {
          showFoundCode(code, `Texto extraído (página ${i} - Boleto Bancário)`);
          await renderPageToCanvas(i);
          return true;
        }
      }

      // Regex prioritário para boleto arrecadação/concessionárias (48 dígitos): 11.1 11.1 11.1 11.1 (pontos opcionais)
      const regex48 = /(\d{11})[\.]?(\d{1})\s*(\d{11})[\.]?(\d{1})\s*(\d{11})[\.]?(\d{1})\s*(\d{11})[\.]?(\d{1})/;
      const m48 = regex48.exec(normalized);
      if (m48) {
        const code = m48.slice(1).join('');
        if (code.length === 48 && isValidBoletoArrecadacao(code)) {
          showFoundCode(code, `Texto extraído (página ${i} - Boleto Arrecadação)`);
          await renderPageToCanvas(i);
          return true;
        }
      }

      // Fallback: método antigo (sequência contínua de dígitos)
      const digitsOnly = normalized.replace(/\D/g, '');
      const mFallback = digitsOnly.match(/(\d{47,48})/);
      if (mFallback) {
        const code = mFallback[1];
        const is47 = code.length === 47;
        const isValid = is47 ? isValidBoletoBancario(code) : isValidBoletoArrecadacao(code);
        if (isValid) {
          showFoundCode(code, `Texto extraído (fallback contínuo - página ${i})`);
          await renderPageToCanvas(i);
          return true;
        }
      }

      // Fallback: grupos formatados genéricos
      const groups = normalized.match(/(\d{1,14}[ \.\-]?)+/g);
      if (groups) {
        for (const g of groups) {
          const raw = g.replace(/\D/g, '');
          const is47 = raw.length === 47;
          if (raw.length === 47 || raw.length === 48) {
            const isValid = is47 ? isValidBoletoBancario(raw) : isValidBoletoArrecadacao(raw);
            if (isValid) {
              showFoundCode(raw, `Texto extraído (fallback grupos - página ${i})`);
              await renderPageToCanvas(i);
              return true;
            }
          }
        }
      }

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
    // agrupa em 5.5 5.6 5.6 1 14
    return d.replace(/(.{5})(.{5})(.{5})(.{6})(.{5})(.{6})(.{1})(.{14})/, '$1.$2 $3.$4 $5.$6 $7 $8').trim();
  } else if (d.length === 48){
    // agrupa em 11.1 11.1 11.1 11.1
    return d.replace(/(.{11})(.{1})(.{11})(.{1})(.{11})(.{1})(.{11})(.{1})/, '$1.$2 $3.$4 $5.$6 $7.$8').trim();
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

// Funções de validação (FEBRABAN)
function modulo10(numero) {
  numero = numero.replace(/\D/g, '');
  let soma = 0;
  let peso = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    let mult = parseInt(numero[i]) * peso;
    if (mult >= 10) mult = 1 + (mult - 10);
    soma += mult;
    peso = (peso === 2) ? 1 : 2;
  }
  let digito = 10 - (soma % 10);
  return (digito === 10) ? 0 : digito;
}

function modulo11Banco(numero) {
  numero = numero.replace(/\D/g, '');
  let soma = 0;
  let peso = 2;
  const base = 9;
  for (let i = numero.length - 1; i >= 0; i--) {
    soma += parseInt(numero[i]) * peso;
    peso = (peso < base) ? peso + 1 : 2;
  }
  let digito = 11 - (soma % 11);
  if (digito > 9) digito = 0;
  if (digito === 0) digito = 1;
  return digito;
}

function modulo11Arrecadacao(numero) {
  numero = numero.replace(/\D/g, '');
  let soma = 0;
  let peso = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    soma += parseInt(numero[i]) * peso;
    peso++;
    if (peso > 9) peso = 2;
  }
  let resto = soma % 11;
  if (resto === 0 || resto === 1) return 0;
  return 11 - resto;
}

function isValidBoletoBancario(linha) {
  linha = linha.replace(/\D/g, '');
  if (linha.length !== 47 || linha.startsWith('000')) return false; // evita zeros placeholders
  // Valida DVs dos campos
  const field1_data = linha.substring(0, 9);
  const dv1 = parseInt(linha.substring(9, 10));
  if (modulo10(field1_data) !== dv1) return false;
  const field2_data = linha.substring(10, 20);
  const dv2 = parseInt(linha.substring(20, 21));
  if (modulo10(field2_data) !== dv2) return false;
  const field3_data = linha.substring(21, 31);
  const dv3 = parseInt(linha.substring(31, 32));
  if (modulo10(field3_data) !== dv3) return false;
  // Reconstrói código de barras sem DV geral e valida
  const general_dv = parseInt(linha.substring(32, 33));
  const barra_without_dv = linha.substring(0, 4) + linha.substring(33, 47) + linha.substring(4, 9) + linha.substring(10, 20) + linha.substring(21, 31);
  const calculated_general = modulo11Banco(barra_without_dv);
  return calculated_general === general_dv;
}

function isValidBoletoArrecadacao(linha) {
  linha = linha.replace(/\D/g, '');
  if (linha.length !== 48 || !linha.startsWith('8')) return false; // deve começar com 8
  const tipoMod = (['6', '7'].includes(linha[2])) ? '10' : '11';
  const blocks = [
    linha.substring(0, 12),
    linha.substring(12, 24),
    linha.substring(24, 36),
    linha.substring(36, 48)
  ];
  for (let block of blocks) {
    const data = block.substring(0, 11);
    const dv = parseInt(block.substring(11, 12));
    let calc = (tipoMod === '10') ? modulo10(data) : modulo11Arrecadacao(data);
    if (calc !== dv) return false;
  }
  return true;
}
