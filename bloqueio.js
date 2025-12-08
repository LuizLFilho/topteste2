
const BREAKPOINT_DESKTOP = 1024;
const homeHubContent = document.querySelector('.lista-ferramentas');
const homeHubHeader = document.querySelector('#home-hub'); 

const alertaBloqueio = document.createElement('div');
alertaBloqueio.id = 'alerta-bloqueio';
alertaBloqueio.innerHTML = `
    <h2 style="font-size: 2.5rem; color: #0050A1; margin-bottom: 16px;">
        Acesso Exclusivo por Celular 📱
    </h2>
    <p style="font-size: 1.5rem; color: #000000; line-height: 1.4;">
        A plataforma HelpTech foi projetada para funcionar <strong>apenas em dispositivos móveis</strong> (celulares).
        <br><br>
        Por favor, acesse esta página usando o navegador do seu celular.
    </p>
`;


alertaBloqueio.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #FFFFFF;
    color: #000000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 40px;
    z-index: 1000;
    font-family: 'Inter', sans-serif;
    visibility: hidden; /* Inicialmente escondido */
    opacity: 0; /* Inicialmente invisível */
    transition: opacity 0.3s;
`;

document.body.appendChild(alertaBloqueio);



/**
 * @param {boolean} isInitialLoad
 */


function verificarBloqueio(isInitialLoad) {

    const larguraTela = window.innerWidth;

    if (larguraTela > BREAKPOINT_DESKTOP) {

        if (homeHubContent) {
            homeHubContent.style.display = 'none';
        }
        if (homeHubHeader) {
            homeHubHeader.style.display = 'none';
        }

        alertaBloqueio.style.visibility = 'visible';
        alertaBloqueio.style.opacity = '1';
        
    } else {
        

        if (homeHubContent) {
            homeHubContent.style.display = 'flex'; 
        }
        if (homeHubHeader) {
            homeHubHeader.style.display = 'block';
        }
        

        alertaBloqueio.style.opacity = '0';
        

        if (!isInitialLoad) {
             setTimeout(() => {
                alertaBloqueio.style.visibility = 'hidden';
            }, 300);
        } else {
             alertaBloqueio.style.visibility = 'hidden';
        }
    }
}



window.addEventListener('load', () => verificarBloqueio(true));


window.addEventListener('resize', () => verificarBloqueio(false));