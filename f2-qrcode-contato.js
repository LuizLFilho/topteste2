const nomeInput = document.getElementById("nome");
const telInput = document.getElementById("telefone");
const emailInput = document.getElementById("email");
const gerarBtn = document.getElementById("gerarBtn");
const qrSection = document.getElementById("qrSection");
const downloadOptions = document.getElementById("downloadOptions");
const qrContainer = document.getElementById("qrContainer");

// Máscara de Telefone
telInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
        e.target.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
        e.target.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
        e.target.value = `(${value.slice(0, 2)}`;
    }
});

gerarBtn.onclick = () => {
    const nome = nomeInput.value.trim();
    const telefone = telInput.value.trim();
    const email = emailInput.value.trim();

    if (!nome || telefone.length < 14) {
        alert("Por favor, preencha o nome e o telefone corretamente.");
        return;
    }

    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${nome}
TEL;TYPE=CELL:${telefone}
${email ? "EMAIL:" + email : ""}
END:VCARD`;

    qrContainer.innerHTML = "";
    
    QRCode.toCanvas(vcard, { width: 180, margin: 2 }, (err, canvas) => {
        if (err) return;
        qrContainer.appendChild(canvas);
        qrSection.classList.remove("hidden");
        downloadOptions.classList.remove("hidden");
        gerarBtn.textContent = "Atualizar QR Code";
    });
};

// FUNÇÃO MÁGICA: SALVAR COMO FOTO
document.getElementById("downloadIMG").onclick = () => {
    const cartao = document.getElementById("cartaoVisual");
    
    html2canvas(cartao, { scale: 2 }).then(canvas => {
        const link = document.createElement("a");
        link.download = `meu-cartao-${nomeInput.value}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
};

// DOWNLOAD VCF
document.getElementById("downloadVCF").onclick = () => {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${nomeInput.value}\nTEL;TYPE=CELL:${telInput.value}\nEND:VCARD`;
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contato.vcf";
    a.click();
};

document.getElementById("limparBtn").onclick = () => {
    location.reload();
};
