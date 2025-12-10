const ssidInput = document.getElementById("ssid");
const passInput = document.getElementById("password");
const noPassCheck = document.getElementById("noPass");
const generateBtn = document.getElementById("generateBtn");
const errorMsg = document.getElementById("errorMsg");
const qrContainer = document.getElementById("qrContainer");
const downloadBtn = document.getElementById("downloadBtn");

let qrcode = null;

// Quando marcar "Rede sem senha", desabilita o campo senha
noPassCheck.addEventListener("change", () => {
    if (noPassCheck.checked) {
        passInput.value = "";
        passInput.disabled = true;
    } else {
        passInput.disabled = false;
    }
});

generateBtn.addEventListener("click", () => {
    const ssid = ssidInput.value.trim();
    const password = passInput.value.trim();

    errorMsg.textContent = "";

    if (ssid === "") {
        errorMsg.textContent = "Por favor, preencha o Nome da Rede (SSID).";
        return;
    }

    if (!noPassCheck.checked && password === "") {
        errorMsg.textContent =
            "Por favor, preencha a Senha ou marque 'Rede sem senha'.";
        return;
    }

    const wifiString = noPassCheck.checked
        ? `WIFI:S:${ssid};T:nopass;;`
        : `WIFI:S:${ssid};T:WPA;P:${password};;`;

    // Limpa QR anterior
    if (qrcode) {
        qrcode.clear();
        qrcode = null;
    }
    document.getElementById("qrcode").innerHTML = "";

    // Cria o QR
    qrcode = new QRCode(document.getElementById("qrcode"), {
        text: wifiString,
        width: 250,
        height: 250
    });

    qrContainer.style.display = "block";
});

// Baixar imagem do QR
downloadBtn.addEventListener("click", () => {
    const canvas = document.querySelector("#qrcode canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "wifi-qrcode.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
});
