// localizacao.js
// Fluxo:
// 1) Usuário clica em "Enviar Minha Localização" -> tenta obter geolocalização com alta precisão.
// 2) Ao obter: mostra modal de alerta (com nível de precisão).
// 3) Se confirmar, tenta usar navigator.share (Web Share API).
// 4) Fallback: mostra resultado com link, permite copiar ou abrir WhatsApp deep link.

// Elementos
const btnGet = document.getElementById('btnGet');
const statusEl = document.getElementById('status');
const modal = document.getElementById('alertModal');
const confirmBtn = document.getElementById('confirmShare');
const abortBtn = document.getElementById('abortShare');
const precisionNote = document.getElementById('precisionNote');

const resultCard = document.getElementById('resultCard');
const coordsEl = document.getElementById('coords');
const mapsLinkEl = document.getElementById('mapsLink');
const btnCopy = document.getElementById('btnCopy');
const btnWhats = document.getElementById('btnWhats');

let lastPayload = null;

// Config geolocation
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 12000, // 12s
  maximumAge: 0
};

function setStatus(msg){
  statusEl.textContent = msg;
}

// Mostrar modal
function showModal(){ modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false'); }
// Fechar modal
function closeModal(){ modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }

// Gerar link do Google Maps
function mapsLink(lat, lon){
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

// Montar mensagem para compartilhar
function buildMessage(lat, lon, accuracy){
  const link = mapsLink(lat, lon);
  const alertText = '⚠️ ALERTA: Compartilhe sua localização APENAS com contatos de total confiança. Tenha CERTEZA de que você está enviando para a pessoa correta. ATENÇÃO!';
  const body = `${alertText}\nLocalização: ${link}\n(Precisão estimada: ${Math.round(accuracy)} m)`;
  return { text: body, link };
}

// Copiar para área de transferência
async function copyToClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch(e){
    return false;
  }
}

// Ação principal: obter posição
btnGet.addEventListener('click', async () => {
  setStatus('Solicitando permissão para obter localização...');
  resultCard.classList.add('hidden');

  if (!('geolocation' in navigator)){
    setStatus('Geolocalização não suportada no seu navegador.');
    return;
  }

  btnGet.disabled = true;
  setStatus('Buscando localização (pode levar alguns segundos)...');

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const acc = pos.coords.accuracy || 0;

    lastPayload = buildMessage(lat, lon, acc);

    // mostrar nota de precisão no modal
    if (acc <= 30) {
      precisionNote.textContent = `Precisão estimada: ${Math.round(acc)} m — Localização CONFÍAVEL.`;
    } else if (acc <= 100) {
      precisionNote.textContent = `Precisão estimada: ${Math.round(acc)} m — Localização geralmente adequada.`;
    } else {
      precisionNote.textContent = `Precisão estimada: ${Math.round(acc)} m — Atenção: localização POUCO precisa. Verifique antes de enviar.`;
    }

    setStatus('Localização encontrada.');
    showModal();
    btnGet.disabled = false;

  }, (err) => {
    console.error(err);
    btnGet.disabled = false;
    if (err.code === 1) {
      setStatus('Permissão negada. Ative o acesso à localização e tente novamente.');
    } else if (err.code === 3) {
      setStatus('Tempo esgotado ao buscar localização. Tente novamente em um local com sinal GPS.');
    } else {
      setStatus('Não foi possível obter a localização: ' + (err.message || 'erro desconhecido'));
    }
  }, GEO_OPTIONS);
});

// Modal botões
abortBtn.addEventListener('click', () => {
  closeModal();
  setStatus('Compartilhamento cancelado pelo usuário.');
});

confirmBtn.addEventListener('click', async () => {
  closeModal();
  if (!lastPayload) {
    setStatus('Nenhuma localização válida para compartilhar.');
    return;
  }

  const shareData = { text: lastPayload.text, title: 'Minha localização' };

  // Tenta usar Web Share API
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      setStatus('Compartilhamento iniciado pelo sistema.');
      return;
    } catch (e) {
      // usuário pode ter cancelado ou falha
      console.warn('share failed', e);
      setStatus('Compartilhamento não foi concluído pelo sistema.');
    }
  }

  // Fallback: mostra link e opções de copiar/WhatsApp
  coordsEl.textContent = lastPayload.link;
  mapsLinkEl.href = lastPayload.link;
  resultCard.classList.remove('hidden');
  setStatus('Compartilhamento manual disponível: copie ou abra o WhatsApp.');
});

// copiar botão
btnCopy.addEventListener('click', async () => {
  if (!lastPayload) return;
  const ok = await copyToClipboard(lastPayload.text);
  if (ok) {
    setStatus('Mensagem copiada para área de transferência.');
  } else {
    setStatus('Não foi possível copiar automaticamente. Selecione e copie manualmente.');
  }
});

// abrir WhatsApp
btnWhats.addEventListener('click', () => {
  if (!lastPayload) return;
  const encoded = encodeURIComponent(lastPayload.text);
  // whatsapp web or app deep link
  const wa = `https://wa.me/?text=${encoded}`;
  window.open(wa, '_blank');
});
