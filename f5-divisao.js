let aplicarServico = true;

// BOTÕES SIM / NÃO
const btnSim = document.getElementById("btnSim");
const btnNao = document.getElementById("btnNao");

btnSim.onclick = () => {
  aplicarServico = true;
  btnSim.classList.remove("off");
  btnNao.classList.add("off");
};

btnNao.onclick = () => {
  aplicarServico = false;
  btnNao.classList.remove("off");
  btnSim.classList.add("off");
};

document.getElementById("btnCalcular").onclick = () => {
  const valorConta = document.getElementById("valorConta").value.replace(",", ".");
  const numPessoas = parseInt(document.getElementById("numPessoas").value);
  const erro = document.getElementById("erro");

  erro.textContent = "";
  
  if (isNaN(valorConta) || valorConta <= 0 || isNaN(numPessoas) || numPessoas < 1) {
    erro.textContent = "Por favor, preencha o Valor Total da Conta e o Número de Pessoas com valores válidos. O número de pessoas deve ser no mínimo 1.";
    document.getElementById("resultCard").style.display = "none";
    return;
  }

  const valor = parseFloat(valorConta);
  const valorServico = aplicarServico ? valor * 0.10 : 0;
  const valorFinal = valor + valorServico;
  const valorPessoa = valorFinal / numPessoas;

  document.getElementById("valorServico").textContent = "R$ " + valorServico.toFixed(2).replace(".", ",");
  document.getElementById("valorFinal").textContent = "R$ " + valorFinal.toFixed(2).replace(".", ",");
  document.getElementById("valorPessoa").textContent = "R$ " + valorPessoa.toFixed(2).replace(".", ",");

  document.getElementById("resultCard").style.display = "block";
};

document.getElementById("btnCopiar").onclick = () => {
  const txt =
    "Valor do Serviço (10%): " + document.getElementById("valorServico").textContent + "\n" +
    "Valor Total Final: " + document.getElementById("valorFinal").textContent + "\n" +
    "Valor por Pessoa: " + document.getElementById("valorPessoa").textContent;

  navigator.clipboard.writeText(txt).then(() => {
    const c = document.getElementById("copiado");
    c.style.display = "block";
    c.textContent = "Copiado!";
    setTimeout(() => (c.style.display = "none"), 2000);
  });
};
