// script.js - Conversor de valor para extenso (PT-BR) em CAIXA ALTA
// Regras: aceita vírgula ou ponto; valida 0,01 a 999.999,99; sem backend.

const input = document.getElementById('valorInput');
const btnConverter = document.getElementById('btnConverter');
const btnLimpar = document.getElementById('btnLimpar');
const erroEl = document.getElementById('erro');
const resultadoCard = document.getElementById('resultadoCard');
const extensoEl = document.getElementById('extenso');
const btnCopiar = document.getElementById('btnCopiar');
const copiedMsg = document.getElementById('copiedMsg');

// Helpers de UI
function showError(show){
  erroEl.classList.toggle('hidden', !show);
  if (show) resultadoCard.classList.add('hidden');
}
function showResult(text){
  extensoEl.textContent = text;
  resultadoCard.classList.remove('hidden');
  erroEl.classList.add('hidden');
  copiedMsg.classList.add('hidden');
}

// Normaliza entrada: aceita 1.234,56 ou 1234.56 etc
function parseInputToNumber(value){
  if (typeof value !== 'string') return NaN;
  // remover espaços
  let v = value.trim();
  if (v === '') return NaN;
  // substituir '.' por '' quando usado como separador de milhar (ex: 1.234,56)
  // regra simples: se existe vírgula e ponto, assumimos que ponto é milhar e vírgula decimal
  if (v.indexOf(',') > -1 && v.indexOf('.') > -1){
    v = v.replace(/\./g, '').replace(',', '.');
  } else {
    // substituir vírgula por ponto
    v = v.replace(',', '.');
  }
  // permitir apenas dígitos e um ponto
  if (!/^\d+(\.\d{0,2})?$/.test(v)) return NaN;
  const num = Number(v);
  return isFinite(num) ? num : NaN;
}

// valida conforme requisito: numérico e entre 0.01 e 999999.99
function validarValor(num){
  if (isNaN(num)) return false;
  if (num < 0.01) return false;
  if (num > 999999.99) return false;
  return true;
}

/* ===== conversor para extenso (PT-BR) =====
   Implementado para valores até 999.999,99
*/
const UNIDADES = ["","UM","DOIS","TRÊS","QUATRO","CINCO","SEIS","SETE","OITO","NOVE","DEZ","ONZE","DOZE","TREZE","CATORZE","QUINZE","DEZESSEIS","DEZESSETE","DEZOITO","DEZENOVE"];
const DEZENAS = ["","","VINTE","TRINTA","QUARENTA","CINQUENTA","SESSENTA","SETENTA","OITENTA","NOVENTA"];
const CENTENAS = ["","CENTO","DUZENTOS","TREZENTOS","QUATROCENTOS","QUINHENTOS","SEISCENTOS","SETECENTOS","OITOCENTOS","NOVECENTOS"];

// converte segmento 0-999 para extenso em maiúsculas
function centenasToExtenso(n){
  n = Number(n);
  if (n === 0) return "";
  if (n === 100) return "CEM";
  let words = [];
  const c = Math.floor(n / 100);
  const rest = n % 100;
  if (c > 0) words.push(CENTENAS[c]);
  if (rest > 0){
    if (rest < 20){
      words.push(UNIDADES[rest]);
    } else {
      const d = Math.floor(rest / 10);
      const u = rest % 10;
      words.push(DEZENAS[d] + (u ? (" E " + UNIDADES[u]) : ""));
    }
  }
  return words.join(" E ");
}

function numberToExtensoBR(value){
  // value assumed 0 <= value <= 999999.99
  value = Number(value.toFixed(2));
  const inteiro = Math.floor(value);
  const centavos = Math.round((value - inteiro) * 100);

  const milhares = Math.floor(inteiro / 1000);
  const resto = inteiro % 1000;

  let parts = [];

  if (milhares > 0){
    if (milhares === 1){
      parts.push("MIL");
    } else {
      parts.push(centenasToExtenso(milhares) + " MIL");
    }
  }

  if (resto > 0){
    parts.push(centenasToExtenso(resto));
  }

  // se inteiro = 0, dizer "ZERO"
  let inteiroTexto = parts.length ? parts.join(" E ") : "ZERO";

  // reais singular/plural
  const reaisTexto = inteiro === 1 ? `${inteiroTexto} REAL` : `${inteiroTexto} REAIS`;

  // centavos
  const centTexto = (centavos === 0) ? "ZERO" : (centavos < 100 ? (centavos < 20 ? UNIDADES[centavos] : ( (Math.floor(centavos/10) >= 2 ? DEZENAS[Math.floor(centavos/10)] + (centavos%10 ? " E " + UNIDADES[centavos%10] : "") : "") )) : "");
  // centavos fallback: use centenasToExtenso for safety
  const centavosTexto = (centavos === 0) ? "ZERO" : (centavos < 100 ? (centavos < 20 ? UNIDADES[centavos] : (DEZENAS[Math.floor(centavos/10)] + (centavos%10 ? " E " + UNIDADES[centavos%10] : ""))) : centenasToExtenso(centavos));

  const centavosFull = centavos === 1 ? `${centavosTexto} CENTAVO` : `${centavosTexto} CENTAVOS`;

  return `${reaisTexto} E ${centavosFull}`;
}

// event handlers
btnConverter.addEventListener('click', () => {
  const raw = input.value || "";
  const num = parseInputToNumber(raw);
  if (!validarValor(num)){
    showError(true);
    return;
  }
  // converter e mostrar em caixa alta (já está)
  const texto = numberToExtensoBR(num).toUpperCase();
  showResult(texto);
});

btnLimpar.addEventListener('click', () => {
  input.value = "";
  resultadoCard.classList.add('hidden');
  erroEl.classList.add('hidden');
  copiedMsg.classList.add('hidden');
});

// copiar
btnCopiar.addEventListener('click', async () => {
  const txt = extensoEl.textContent || "";
  if (!txt) return;
  try{
    await navigator.clipboard.writeText(txt);
    copiedMsg.classList.remove('hidden');
    setTimeout(()=> copiedMsg.classList.add('hidden'), 2200);
  }catch(e){
    // fallback simples
    alert('Não foi possível copiar automaticamente. Selecione e copie manualmente.');
  }
});
