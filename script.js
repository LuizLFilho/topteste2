const TMDB_API_KEY = "c2055b5a4cd7edc96bc10e9bb2cd5765"; 
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";


const movieInputs = document.querySelectorAll('input[data-slot]');

const shareButton = document.getElementById('share-button');

const selectedMovies = {
    1: null,
    2: null,
    3: null
};

let searchTimeout;

const SEARCH_DELAY_MS = 300;

/**
 * @param {string} query
 * @returns {Promise<Array<Object>>} 
 */
async function searchMovies(query) {
    if (query.length < 3) { 
        return [];
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodedQuery}`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        const data = await response.json();

        return data.results; 
    } catch (error) {
        console.error("Falha ao buscar filmes:", error);
        return []; 
    }
}


/**
 * @param {Event} event 
 */
function handleInput(event) {
    const inputElement = event.target;
    const query = inputElement.value.trim(); 
    const slotNumber = inputElement.dataset.slot;

    clearTimeout(searchTimeout);

    if (query.length === 0) {
        clearSuggestions(slotNumber);
        return;
    }

    searchTimeout = setTimeout(async () => {
        const results = await searchMovies(query);
        renderSuggestions(results, slotNumber); 
    }, SEARCH_DELAY_MS);
}




function clearSuggestions(slotNumber) {
    const suggestionsList = document.querySelector(`.suggestions-list[data-suggestions-for="${slotNumber}"]`);
    suggestionsList.innerHTML = '';
}

movieInputs.forEach(input => {
    input.addEventListener('input', handleInput);
});

console.log("Sistema inicializado. Digite em qualquer campo para testar o Autocompletar (veja o console).");


/**
 * @param {Array<Object>} results 
 */
function renderSuggestions(results, slotNumber) {
    const suggestionsList = document.querySelector(`.suggestions-list[data-suggestions-for="${slotNumber}"]`);
    
    suggestionsList.innerHTML = '';
    
    if (results.length === 0) {
        suggestionsList.innerHTML = '<li>Nenhum filme encontrado.</li>';
        suggestionsList.style.display = 'none'; 
        return;
    }
    
    suggestionsList.style.display = 'block';

    results.forEach(movie => {
        const listItem = document.createElement('li');
        
        listItem.dataset.movieData = JSON.stringify(movie);
        
        const year = movie.release_date ? ` (${movie.release_date.substring(0, 4)})` : '';
        listItem.textContent = movie.title + year;
        
        listItem.addEventListener('click', handleSuggestionClick);
        
        suggestionsList.appendChild(listItem);
    });
}


/**
 * @param {Event} event
 */
function handleSuggestionClick(event) {
    const listItem = event.currentTarget; // 
    
    const movieData = JSON.parse(listItem.dataset.movieData);
    
    const slotList = listItem.closest('.suggestions-list');
    const slotNumber = slotList.dataset.suggestionsFor;
    
    const inputElement = document.getElementById(`input-${slotNumber}`);
    inputElement.value = movieData.title;
    
    updateMovieSlot(movieData, slotNumber);
    
    selectedMovies[slotNumber] = movieData;
    
    clearSuggestions(slotNumber);
    

    checkShareButtonStatus();
}


/**
 * @param {Object} movie 
 * @param {string} slotNumber 
 */
function updateMovieSlot(movie, slotNumber) {
    const movieSlotContainer = document.getElementById(`movie${slotNumber}`); 
    
    const imgElement = movieSlotContainer.querySelector('.movie-slot img');
    
    if (movie.poster_path) {
        imgElement.src = `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`;
        imgElement.alt = `Pôster do filme ${movie.title}`;
    } else {
        imgElement.src = `imagens/${slotNumber}.webp`; 
        imgElement.alt = "Pôster não disponível.";
    }
}

function clearSuggestions(slotNumber) {
    const suggestionsList = document.querySelector(`.suggestions-list[data-suggestions-for="${slotNumber}"]`);
    suggestionsList.innerHTML = '';
    suggestionsList.style.display = 'none';
}


document.addEventListener('click', (event) => {
    const allLists = document.querySelectorAll('.suggestions-list');

    allLists.forEach(list => {
        const slot = list.dataset.suggestionsFor;
        const input = document.querySelector(`input[data-slot="${slot}"]`);

        if (!list.contains(event.target) && !input.contains(event.target)) {
            list.innerHTML = '';
            list.style.display = 'none';
        }
    });
});


function checkShareButtonStatus() {
    const allSlotsFilled = selectedMovies[1] !== null && selectedMovies[2] !== null && selectedMovies[3] !== null;
    
    if (allSlotsFilled) {
        shareButton.disabled = false;
        console.log("✅ TODOS OS SLOTS PREENCHIDOS! O botão COMPARTILHAR foi habilitado!");
    } else {
        shareButton.disabled = true;
    }
}



async function handleShare() {
    const movie1Title = selectedMovies[1].title;
    const movie2Title = selectedMovies[2].title;
    const movie3Title = selectedMovies[3].title;
    
    const shareText = `🎬 Meu Top 3 Filmes que Você Precisa Ver:\n\n1º: ${movie1Title}\n2º: ${movie2Title}\n3º: ${movie3Title}\n\nMonte o seu! [LINK DO SEU FUTURO SITE AQUI]`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: '3 Filmes Que Você Precisa Ver',
                text: shareText,
                url: window.location.href 
            });
            console.log('Conteúdo compartilhado com sucesso!');
        } catch (error) {
            console.warn('Falha ou cancelamento do compartilhamento:', error);
            
            fallbackCopyTextToClipboard(shareText);
        }
    } else {
        console.warn('Web Share API não suportada. Usando fallback de cópia.');
        fallbackCopyTextToClipboard(shareText);
    }
}


/**
 * @param {string} text 
 */
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy'); 
        const msg = successful ? 'Texto copiado com sucesso (fallback)!' : 'Falha ao copiar (fallback).';
        console.log(msg);
        alert('Conteúdo copiado para a área de transferência! Cole onde quiser:\n\n' + text);
    } catch (err) {
        console.error('Falha ao tentar copiar texto: ', err);
        alert('Seu navegador não suporta a cópia automática. Copie o texto abaixo manualmente:\n\n' + text);
    }

    document.body.removeChild(textArea);
}

shareButton.addEventListener('click', handleShare);

console.log("Funcionalidade de Compartilhamento configurada!");
