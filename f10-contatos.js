const errorBox = document.getElementById('error');

function showError(msg){
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}
function clearError(){
  errorBox.classList.add('hidden');
  errorBox.textContent = "";
}

document.querySelectorAll('.call-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    clearError();
    const number = btn.dataset.tel;

    try {
      window.location.href = `tel:${number}`;
    } catch (err) {
      showError(
        "Seu celular não conseguiu iniciar a ligação. Verifique se o modo avião está ligado ou se há problemas na sua linha. Tente ligar manualmente para 190."
      );
    }
  });
});
