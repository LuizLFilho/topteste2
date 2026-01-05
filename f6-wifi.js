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
        errorMsg.textContent = "Por favor, preencha o nome da sua internet.";
        return;
    }

    let wifiString = "";
    if (noPassCheck.checked) {
        // Formato para rede aberta (Sem aspas)
        wifiString = `WIFI:S:${ssid};T:nopass;;`;
    } else {
        if (password === "") {
            errorMsg.textContent = "Por favor, preencha a Senha.";
            return;
        }
        // Formato padrão universal (Sem aspas)
        // WIFI:S:NOME;T:WPA;P:SENHA;;
        wifiString = `WIFI:S:${ssid};T:WPA;P:${password};;`;
    }

    console.log("String gerada:", wifiString);

    document.getElementById("qrcode").innerHTML = "";
    
    qrcode = new QRCode(document.getElementById("qrcode"), {
        text: wifiString,
        width: 250,
        height: 250,
        correctLevel: QRCode.CorrectLevel.M // Nível Médio costuma ser mais legível para senhas longas
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
