let stream;
let track;
let capabilities = {};
let torchOn = false;

// Botões
const openBtn = document.getElementById("openCameraBtn");
const cameraArea = document.getElementById("cameraArea");
const video = document.getElementById("video");
const zoomSlider = document.getElementById("zoomSlider");
const flashBtn = document.getElementById("flashBtn");
const whiteLightBtn = document.getElementById("whiteLightBtn");

// --- ABRIR CÂMERA ---
openBtn.addEventListener("click", async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { exact: "environment" }, // traseira
                zoom: true
            }
        });

        video.srcObject = stream;
        cameraArea.classList.remove("hidden");

        track = stream.getVideoTracks()[0];
        capabilities = track.getCapabilities();

        // Zoom suportado
        if (capabilities.zoom) {
            zoomSlider.min = capabilities.zoom.min;
            zoomSlider.max = capabilities.zoom.max;
            zoomSlider.value = capabilities.zoom.min;
            zoomSlider.step = 0.1;
        }

        // Torch suportado?
        if ("torch" in capabilities) {
            flashBtn.classList.remove("hidden");
        } else {
            flashBtn.innerText = "Lanterna não suportada";
            flashBtn.disabled = true;
            flashBtn.classList.remove("hidden");
        }

    } catch (err) {
        alert("Não foi possível abrir a câmera.");
        console.error(err);
    }
});

// --- ZOOM ---
zoomSlider.addEventListener("input", () => {
    if (track && capabilities.zoom) {
        track.applyConstraints({
            advanced: [{ zoom: zoomSlider.value }]
        });
    }
});

// --- TORCH (ANDROID APENAS) ---
flashBtn.addEventListener("click", async () => {
    if (!track) return;

    try {
        torchOn = !torchOn;

        await track.applyConstraints({
            advanced: [{ torch: torchOn }]
        });

        flashBtn.innerText = torchOn ? "Lanterna: ON" : "Lanterna: OFF";

    } catch (e) {
        alert("Lanterna não é suportada neste dispositivo.");
    }
});

// --- LUZ AUXILIAR (FUNCIONA EM QUALQUER CELULAR) ---
whiteLightBtn.addEventListener("click", () => {
    openWhiteScreen();
});

function openWhiteScreen() {
    const w = window.open("", "_blank", "fullscreen=yes");
    if (!w) return alert("Bloqueado pelo navegador.");

    w.document.write(`
        <body style="
            margin:0; 
            background:white; 
            width:100vw; 
            height:100vh;
            ">
        <button 
            onclick="window.close()" 
            style="
                position:absolute;
                top:20px;
                left:20px;
                padding:12px 16px;
                font-size:16px;
                border:none;
                background:#000;
                color:white;
                border-radius:8px;
            ">
            Fechar Luz
        </button>
        </body>
    `);
}
