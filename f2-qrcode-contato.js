const nomeInput = document.getElementById("nome");
const telInput = document.getElementById("telefone");
const emailInput = document.getElementById("email");
const erroBox = document.getElementById("erro");

const gerarBtn = document.getElementById("gerarBtn");
const limparBtn = document.getElementById("limparBtn");

const qrSection = document.getElementById("qrSection");
const qrContainer = document.getElementById("qrContainer");
const downloadVCF = document.getElementById("downloadVCF");


// 🔹 Carregar dados salvos
window.onload = () => {
    nomeInput.value = localStorage.getItem("nome") || "";
    telInput.value = localStorage.getItem("telefone") || "";
    emailInput.value = localStorage.getItem("email") || "";
};


// 🔹 Máscara inteligente de telefone (sem bug ao apagar)
telInput.addEventListener("input", () => {
    let v = telInput.value.replace(/\D/g, "");

    if (v.length > 11) v = v.slice(0, 11);

    if (v.length > 6) {
        telInput.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    } else if (v.length > 2) {
        telInput.value = `(${v.slice(0,2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
        telInput.value = `(${v}`;
    }
});


// 🔹 Validação
function validarTelefone(tel) {
    return /^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(tel);
}


// 🔹 Gerar QR
gerarBtn.onclick = () => {
    const nome = nomeInput.value.trim();
    const telefone = telInput.value.trim();
    const email = emailInput.value.trim();

    erroBox.textContent = "";

    if (!nome) {
        erroBox.textContent = "Digite seu nome.";
        return;
    }
    if (!validarTelefone(telefone)) {
        erroBox.textContent = "Digite um telefone válido.";
        return;
    }

    // Salvar localmente
    localStorage.setItem("nome", nome);
    localStorage.setItem("telefone", telefone);
    localStorage.setItem("email", email);

    const vcard =
`BEGIN:VCARD
VERSION:3.0
FN:${nome}
TEL;TYPE=CELL:${telefone}
${email ? "EMAIL:" + email : ""}
END:VCARD`;

    // LIMPAR QR antigo
    qrContainer.innerHTML = "";

    // Criar QR via DataURL (100% compatível)
    QRCode.toDataURL(vcard, { width: 260 }, (err, url) => {
        if (err) {
            erroBox.textContent = "Erro ao gerar QR Code.";
            return;
        }

        const img = document.createElement("img");
        img.src = url;
        img.classList.add("fade");
        qrContainer.appendChild(img);
    });

    qrSection.classList.remove("hidden");

    // Download do VCF
    downloadVCF.onclick = () => {
        const blob = new Blob([vcard], { type: "text/vcard" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${nome.replace(/\s+/g, "_")}.vcf`;
        a.click();
    };
};


// 🔹 Limpar tudo
limparBtn.onclick = () => {
    nomeInput.value = "";
    telInput.value = "";
    emailInput.value = "";
    qrSection.classList.add("hidden");

    localStorage.clear();
};
