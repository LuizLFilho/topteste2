const btn = document.getElementById("openCamera");
const video = document.getElementById("video");
const cameraArea = document.getElementById("cameraArea");
const zoomRange = document.getElementById("zoomRange");
const torchBtn = document.getElementById("torchBtn");
const msg = document.getElementById("msg");
const flashScreen = document.getElementById("flashScreen");

let track = null;
let torchOn = false;
let supportsTorch = false;

btn.onclick = async () => {
    msg.textContent = "";

    const constraints = {
        video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            zoom: true,
            advanced: [{ torch: true }]
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.play();

        cameraArea.classList.remove("hidden");

        track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();

        // --------- ZOOM ---------
        if ("zoom" in capabilities) {
            zoomRange.min = capabilities.zoom.min;
            zoomRange.max = capabilities.zoom.max;
            zoomRange.step = capabilities.zoom.step || 0.1;
            zoomRange.disabled = false;

            msg.textContent = "Zoom disponível 👍";
        } else {
            msg.textContent = "Seu dispositivo não possui zoom.";
        }

        // --------- LANTERNA ---------
        supportsTorch = capabilities.torch || false;

        if (supportsTorch) {
            torchBtn.textContent = "Ligar Lanterna";
        } else {
            torchBtn.textContent = "Brilho Extra";
        }

    } catch (e) {
        msg.textContent = "Erro ao acessar a câmera: " + e.message;
    }
};


// ----------- ZOOM -----------
zoomRange.addEventListener("input", () => {
    if (!track) return;
    track.applyConstraints({ advanced: [{ zoom: zoomRange.value }] });
});


// ----------- LANTERNA / FALLBACK -----------
torchBtn.onclick = async () => {
    if (!track) return;

    // LANTERNA REAL
    if (supportsTorch) {
        try {
            torchOn = !torchOn;
            await track.applyConstraints({ advanced: [{ torch: torchOn }] });
            torchBtn.textContent = torchOn ? "Desligar Lanterna" : "Ligar Lanterna";
        } catch (e) {
            msg.textContent = "Lanterna falhou. Usando modo brilho.";
            supportsTorch = false; // força fallback
        }
    }

    // FALLBACK 1 — EXPOSIÇÃO/ISO (melhora de brilho real)
    if (!supportsTorch) {
        try {
            await track.applyConstraints({ advanced: [{ exposureMode: "continuous" }] });
            msg.textContent = "Brilho aumentado 👍";
            torchBtn.textContent = "Tela Branca";
            supportsTorch = "fake-bright";
        } catch {
            supportsTorch = "force-flash";
        }
    }

    // FALLBACK 2 — TELA BRANCA SUPER FORTE
    if (supportsTorch === "force-flash") {
        flashScreen.style.display = "block";
        torchBtn.textContent = "Desligar Tela";
        torchBtn.onclick = () => {
            flashScreen.style.display = "none";
            torchBtn.textContent = "Tela Branca";
        };
    }
};
