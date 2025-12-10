document.getElementById("btnTestar").addEventListener("click", executarDiagnostico);

function executarDiagnostico() {
    const results = document.getElementById("results");
    results.classList.remove("hidden");

    detectarTipoConexao();
    detectarInternetAtiva();
}

/* ---------------------------------------------------
   1. Detectar Tipo de Conexão (Wi-Fi, 4G, 5G, etc.)
--------------------------------------------------- */
function detectarTipoConexao() {
    const tipoConexaoEl = document.getElementById("tipoConexao");
    let tipo = "Desconhecido";

    if ("connection" in navigator) {
        const c = navigator.connection;

        if (c.type === "wifi") tipo = "Wi-Fi";
        else if (c.type === "cellular") tipo = detectarRedeMovel(c.effectiveType);
        else if (c.type === "ethernet") tipo = "Cabo (Ethernet)";
        else if (navigator.onLine) tipo = "Online (tipo não identificado)";
    } else {
        // fallback simples para navegadores antigos
        tipo = navigator.onLine ? "Online (tipo desconhecido)" : "Offline";
    }

    tipoConexaoEl.textContent = tipo;
}

function detectarRedeMovel(tipo) {
    switch (tipo) {
        case "4g": return "4G";
        case "5g": return "5G";
        case "3g": return "3G";
        case "2g": return "2G";
        default: return "Dados Móveis";
    }
}

/* ---------------------------------------------------
   2. Detectar Se Está Online
--------------------------------------------------- */
function detectarInternetAtiva() {
    const statusEl = document.getElementById("statusInternet");
    const msgFinal = document.getElementById("mensagemFinal");

    if (navigator.onLine) {
        statusEl.textContent = "ONLINE";
        statusEl.style.color = "#007700";

        msgFinal.textContent = "Você está conectado à internet.";
        msgFinal.classList.remove("offline");
    } else {
        statusEl.textContent = "OFFLINE";
        statusEl.style.color = "#bb0000";

        msgFinal.textContent = "Sem conexão com a internet.";
        msgFinal.classList.add("offline");
    }
}
