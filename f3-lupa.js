// script.js - Camera zoom + torch + pinch + fallback digital zoom
// Mobile-first. Tente usar Chrome Android para melhor suporte à lanterna.

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnTorch = document.getElementById('btnTorch');
const btnSwitch = document.getElementById('btnSwitch');

const previewWrap = document.getElementById('previewWrap');
const video = document.getElementById('video');
const zoomRange = document.getElementById('zoomRange');
const zoomIn = document.getElementById('zoomIn');
const zoomOut = document.getElementById('zoomOut');

const statusEl = document.getElementById('status');
const videoFrame = document.querySelector('.video-frame');

let stream = null;
let videoTrack = null;
let imageCapture = null;
let supportsTorch = false;
let useNativeZoom = false;
let minZoom = 1, maxZoom = 1, stepZoom = 0.1;
let currentZoom = 1;

let facingMode = 'environment'; // try back camera first

// *** Helpers de status
function setStatus(msg){
  statusEl.textContent = msg;
}

// *** Start camera
btnStart.addEventListener('click', async () => {
  try {
    await startCamera();
  } catch (err) {
    console.error(err);
    setStatus('Erro ao acessar câmera: ' + (err.message || err));
  }
});

// Stop camera
btnStop.addEventListener('click', () => {
  stopCamera();
});

// Torch toggle
btnTorch.addEventListener('click', async () => {
  if (!videoTrack) return;
  if (!supportsTorch) return;
  const current = btnTorch.getAttribute('aria-pressed') === 'true';
  try {
    await toggleTorch(!current);
    btnTorch.setAttribute('aria-pressed', String(!current));
    btnTorch.textContent = !current ? 'LANTERNA ON' : 'LANTERNA';
  } catch (err) {
    console.warn('Torch error', err);
    setStatus('Não foi possível acender a lanterna.');
  }
});

// Switch camera (front/back)
btnSwitch.addEventListener('click', async () => {
  facingMode = (facingMode === 'environment') ? 'user' : 'environment';
  await restartCameraPreserveState();
});

// Zoom controls
zoomIn.addEventListener('click', () => adjustZoom(currentZoom + stepZoom));
zoomOut.addEventListener('click', () => adjustZoom(currentZoom - stepZoom));
zoomRange.addEventListener('input', (e) => adjustZoom(Number(e.target.value)));

// Pinch-to-zoom (mobile)
let pinchStartDist = null;
let pinchStartZoom = null;
video.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    pinchStartDist = distance(e.touches[0], e.touches[1]);
    pinchStartZoom = currentZoom;
  }
});
video.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2 && pinchStartDist && pinchStartZoom) {
    const newDist = distance(e.touches[0], e.touches[1]);
    const ratio = newDist / pinchStartDist;
    adjustZoom(pinchStartZoom * ratio);
    e.preventDefault();
  }
});
video.addEventListener('touchend', (e) => {
  if (e.touches.length < 2) {
    pinchStartDist = null;
    pinchStartZoom = null;
  }
});

function distance(t1, t2){
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx*dx + dy*dy);
}

// *** Start camera implementation
async function startCamera(){
  stopCamera(); // garante limpeza

  setStatus('Solicitando permissão da câmera...');
  btnStart.disabled = true;

  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    btnStart.disabled = false;
    throw err;
  }

  // attach stream
  video.srcObject = stream;
  video.play().catch(()=>{});

  // track
  videoTrack = stream.getVideoTracks()[0];

  // try to create ImageCapture (for torch)
  try {
    imageCapture = new ImageCapture(videoTrack);
  } catch (err) {
    imageCapture = null;
  }

  // check capabilities
  const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
  // detect torch
  supportsTorch = !!capabilities.torch || false;
  btnTorch.disabled = !supportsTorch;
  if (supportsTorch) {
    btnTorch.setAttribute('aria-pressed','false');
    btnTorch.textContent = 'LANTERNA';
  } else {
    btnTorch.setAttribute('aria-pressed','false');
    btnTorch.textContent = 'LANTERNA (não suport.)';
  }

  // detect native zoom support
  if (capabilities.zoom) {
    useNativeZoom = true;
    minZoom = capabilities.zoom.min || 1;
    maxZoom = capabilities.zoom.max || 1;
    stepZoom = capabilities.zoom.step || 0.1;
    currentZoom = videoTrack.getSettings().zoom || minZoom;
    setStatus('Zoom nativo disponível: ' + minZoom + ' → ' + maxZoom);
  } else {
    // fallback digital: allow from 1 to 4 (configurável)
    useNativeZoom = false;
    minZoom = 1;
    maxZoom = 4;
    stepZoom = 0.1;
    currentZoom = 1;
    setStatus('Zoom nativo não disponível — usando zoom digital (menos nítido).');
  }

  // update UI controls
  zoomRange.min = minZoom;
  zoomRange.max = maxZoom;
  zoomRange.step = stepZoom;
  zoomRange.value = currentZoom;

  // enable preview UI
  previewWrap.classList.remove('hidden');
  btnStop.disabled = false;
  btnStart.disabled = true;

  // apply initial zoom
  await applyZoom(currentZoom);

  // try to detect stream ended
  videoTrack.onended = () => {
    stopCamera();
  };
}

// *** Stop camera
function stopCamera(){
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  video.srcObject = null;
  videoTrack = null;
  imageCapture = null;
  previewWrap.classList.add('hidden');
  btnStart.disabled = false;
  btnStop.disabled = true;
  btnTorch.disabled = true;
  setStatus('Câmera parada');
}

// *** restart preserving facing mode
async function restartCameraPreserveState(){
  const prevZoom = currentZoom;
  const prevTorch = btnTorch.getAttribute('aria-pressed') === 'true';
  await startCamera();
  // try to restore zoom & torch
  setTimeout(()=> {
    adjustZoom(prevZoom);
    if (supportsTorch && prevTorch) toggleTorch(true);
  }, 400);
}

// *** Apply zoom (native or fallback)
async function applyZoom(zoomValue){
  currentZoom = Math.max(minZoom, Math.min(maxZoom, zoomValue));
  zoomRange.value = currentZoom;

  if (!videoTrack) return;

  if (useNativeZoom) {
    try {
      await videoTrack.applyConstraints({ advanced: [{ zoom: currentZoom }] });
    } catch (err) {
      console.warn('Erro ao aplicar zoom nativo:', err);
      // fallback to digital
      useNativeZoom = false;
      setStatus('Usando fallback digital de zoom.');
      applyDigitalZoom(currentZoom);
    }
  } else {
    applyDigitalZoom(currentZoom);
  }
}

// digital zoom by CSS transform (less sharp)
function applyDigitalZoom(zoom){
  // keep video centered and scaled
  video.style.transform = `scale(${zoom})`;
  // provide slight pulsing for user feedback
  if (zoom > 1) videoFrame.classList.add('anim'); else videoFrame.classList.remove('anim');
}

// wrapper to adjust zoom and clamp
async function adjustZoom(value){
  const v = Number(value);
  if (isNaN(v)) return;
  const clamped = Math.max(minZoom, Math.min(maxZoom, v));
  await applyZoom(clamped);
}

// *** Toggle torch (lanterna)
async function toggleTorch(on){
  if (!videoTrack) throw new Error('Sem track de vídeo');
  const cap = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
  // preferred method: applyConstraints with torch
  if ('torch' in cap && cap.torch === true) {
    try {
      await videoTrack.applyConstraints({ advanced: [{ torch: on }] });
      return;
    } catch (err) {
      console.warn('applyConstraints torch erro', err);
    }
  }

  // fallback: ImageCapture (some browsers expose photoCapabilities.fillLightMode)
  if (imageCapture && imageCapture.getPhotoCapabilities) {
    try {
      const photoCap = await imageCapture.getPhotoCapabilities();
      // try using fillLightMode if available (rare)
      if (photoCap.fillLightMode && photoCap.fillLightMode.length) {
        // can't programmatically set fillLightMode, but some platforms allow applyConstraints
        await videoTrack.applyConstraints({ advanced: [{ torch: on }] });
        return;
      }
    } catch (err) {
      console.warn('imageCapture photoCap error', err);
    }
  }

  throw new Error('Torch não suportada neste dispositivo / navegador');
}

// *** On page unload, stop camera
window.addEventListener('pagehide', () => stopCamera());
window.addEventListener('beforeunload', () => stopCamera());

// accessibility: keyboard support for zoom +/- when focused
zoomIn.addEventListener('keydown', (e)=> { if (e.key === 'Enter') adjustZoom(currentZoom + stepZoom); });
zoomOut.addEventListener('keydown', (e)=> { if (e.key === 'Enter') adjustZoom(currentZoom - stepZoom); });

// initial UI state
setStatus('Pronto — abra a câmera para iniciar');
