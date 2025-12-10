// qr-reader.js
// Scanner contínuo usando câmera traseira + jsQR
// Mostra conteúdo em fonte grande e sugere UMA ação direta ao usuário.

// Elements
const video = document.getElementById('video');
const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const overlay = document.getElementById('overlay');
const errEl = document.getElementById('err');

const resultCard = document.getElementById('resultCard');
const contentEl = document.getElementById('content');
const suggestBtn = document.getElementById('suggestBtn');
const copyBtn = document.getElementById('copyBtn');
const extraEl = document.getElementById('extra');

let stream = null;
let scanning = false;
let lastResult = null;

// hidden canvas for capture
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// Helpers - type detection
function isURL(text){
  try {
    const u = new URL(text);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch(e){ return false; }
}
function isTel(text){
  return /^tel:\+?\d+/i.test(text) || /^\+?\d{6,}$/i.test(text);
}
function isSMS(text){
  return /^sms:/i.test(text);
}
function isMail(text){
  return /^mailto:/i.test(text) || /\S+@\S+\.\S+/.test(text);
}
function isGeo(text){
  return /^geo:/i.test(text) || /^-?\d+\.\d+,-?\d+\.\d+/.test(text);
}
function isWifi(text){
  return /^WIFI:/i.test(text);
}
function isVCard(text){
  return /BEGIN:VCARD/i.test(text);
}

// sanitize display text (limit length)
function shortText(t, max = 300){
  if (!t) return '—';
  return t.length > max ? t.slice(0, max) + ' …' : t;
}

// Suggested action mapping (returns {label, fn, extra})
function suggestActionFor(text){
  if (isURL(text)){
    return {
      label: 'Abrir Site',
      fn: () => window.open(text, '_blank'),
      extra: text
    };
  }
  if (isTel(text)){
    const tel = text.replace(/^tel:/i, '').trim();
    return {
      label: 'Ligar',
      fn: () => window.location.href = `tel:${tel}`,
      extra: `Telefone: ${tel}`
    };
  }
  if (isSMS(text)){
    return {
      label: 'Enviar SMS',
      fn: () => window.location.href = text,
      extra: text
    };
  }
  if (isMail(text)){
    const mail = text.replace(/^mailto:/i, '').trim();
    const href = /^mailto:/i.test(text) ? text : `mailto:${mail}`;
    return {
      label: 'Enviar E-mail',
      fn: () => window.location.href = href,
      extra: href
    };
  }
  if (isWifi(text)){
    // can't auto-connect from browser; provide copy action with friendly message
    return {
      label: 'Copiar dados do Wi-Fi',
      fn: async () => { await navigator.clipboard.writeText(text); alert('Dados do Wi-Fi copiados.'); },
      extra: 'Conteúdo Wi-Fi (copiado ao tocar)'
    };
  }
  if (isGeo(text)){
    // normalize geo:lat,lon or plain lat,lon
    let link = '';
    if (/^geo:/i.test(text)){
      // geo:lat,lon...
      const m = text.match(/^geo:([^?]+)/i);
      if (m) link = `https://www.google.com/maps/search/?api=1&query=${m[1]}`;
    } else {
      link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
    }
    return {
      label: 'Abrir no Maps',
      fn: () => window.open(link, '_blank'),
      extra: link
    };
  }
  if (isVCard(text)){
    return {
      label: 'Mostrar contato',
      fn: () => alert('vCard detectado. Você pode copiar e salvar no app de contatos.'),
      extra: 'vCard detectado'
    };
  }
  // default: plain text
  return {
    label: 'Copiar Texto',
    fn: async () => { await navigator.clipboard.writeText(text); alert('Texto copiado.'); },
    extra: 'Texto copiado'
  };
}

// UI updates
function showError(msg){
  errEl.textContent = msg;
  errEl.classList.remove('hidden');
}
function clearError(){
  errEl.textContent = '';
  errEl.classList.add('hidden');
}
function showOverlay(msg){
  overlay.textContent = msg || 'Lendo...';
  overlay.classList.remove('hidden');
}
function hideOverlay(){ overlay.classList.add('hidden'); }

function showResult(text, action){
  resultCard.classList.remove('hidden');
  contentEl.textContent = shortText(text, 800);
  suggestBtn.textContent = action.label;
  extraEl.textContent = action.extra || '';
}

// start camera (rear)
async function startCamera(){
  clearError();
  if (scanning) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
  } catch (e) {
    showError('Não foi possível acessar a câmera. Verifique permissões.');
    return;
  }

  video.srcObject = stream;
  video.setAttribute('playsinline', true);
  await video.play();

  // adjust canvas size to video
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  scanning = true;
  btnStart.classList.add('hidden');
  btnStop.classList.remove('hidden');
  hideOverlay();
  tick(); // start scanning frames
}

// stop camera
function stopCamera(){
  scanning = false;
  btnStart.classList.remove('hidden');
  btnStop.classList.add('hidden');
  if (stream){
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  video.pause();
}

// main loop
function tick(){
  if (!scanning) return;
  if (video.readyState === video.HAVE_ENOUGH_DATA){
    // draw current frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // decode
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
    if (code && code.data){
      // if same result as last, don't spam UI updates but keep scanning (we're in continuous mode)
      if (lastResult !== code.data){
        lastResult = code.data;
        const text = code.data.trim();
        const action = suggestActionFor(text);
        showResult(text, action);

        // attach action
        suggestBtn.onclick = () => {
          try { action.fn(); } catch(e){ console.error(e); alert('Não foi possível executar a ação.'); }
        };
        copyBtn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(text);
            alert('Conteúdo copiado');
          } catch {
            alert('Não foi possível copiar automaticamente. Selecione e copie manualmente.');
          }
        };
      }
    }
  }
  // continue scanning
  requestAnimationFrame(tick);
}

// events
btnStart.addEventListener('click', async () => {
  clearError();
  resultCard.classList.add('hidden');
  lastResult = null;
  showOverlay('Lendo...');
  await startCamera();
});
btnStop.addEventListener('click', () => {
  stopCamera();
  hideOverlay();
});

// stop camera when leaving page
window.addEventListener('pagehide', stopCamera);
window.addEventListener('beforeunload', stopCamera);
