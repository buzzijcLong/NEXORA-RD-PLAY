
const folders = [
  { name: 'MOVIES', path: '/MOVIE/', type: 'pelicula', section: 'movies' },
  { name: 'PELÍCULAS', path: '/peliculas/', type: 'pelicula', section: 'peliculas' },
  { name: 'SERIES', path: '/series/', type: 'serie', section: 'series' },
  { name: 'ANIMES', path: '/ANIMES/', type: 'anime', section: 'anime' }
];

const extensions = /\.(mp4|m4v|webm|ogv|mov|mkv|avi)$/i;
const catalog = [];
const search = document.getElementById('search');
const modal = document.getElementById('playerModal');
const video = document.getElementById('videoPlayer');
const playerTitle = document.getElementById('playerTitle');
const playerMessage = document.getElementById('playerMessage');

const oldCards = document.getElementById('cards');
if (oldCards) oldCards.hidden = true;

const oldEmpty = document.getElementById('emptyMessage');
if (oldEmpty) oldEmpty.hidden = true;

// Preparar las cuatro secciones
function prepareSections() {
  const main = document.querySelector('main');
  const catalogSection = document.getElementById('catalogo');

  const moviesSection = document.createElement('section');
  moviesSection.className = 'section';
  moviesSection.id = 'movies';
  moviesSection.innerHTML = `
    <div class="section-head">
      <div><p class="eyebrow">TU COLECCIÓN</p><h2>MOVIES</h2></div>
    </div>
    <div class="cards" id="grid-movies"></div>
    <p class="section-note" id="status-movies">Buscando videos...</p>
  `;
  main.insertBefore(moviesSection, document.getElementById('peliculas'));

  const sections = [
    { id: 'peliculas', title: 'PELÍCULAS', eyebrow: 'NOCHE DE CINE' },
    { id: 'series', title: 'SERIES', eyebrow: 'SIGUE CADA HISTORIA' },
    { id: 'anime', title: 'ANIMES', eyebrow: 'ANIMACIÓN Y AVENTURA' }
  ];

  sections.forEach(section => {
    const element = document.getElementById(section.id);
    element.innerHTML = `
      <div class="section-head">
        <div><p class="eyebrow">${section.eyebrow}</p><h2>${section.title}</h2></div>
      </div>
      <div class="cards" id="grid-${section.id}"></div>
      <p class="section-note" id="status-${section.id}">Buscando videos...</p>
    `;
  });

  const nav = document.querySelector('.topbar nav');
  if (nav && !nav.querySelector('a[href="#movies"]')) {
    const link = document.createElement('a');
    link.href = '#movies';
    link.textContent = 'Movies';
    nav.insertBefore(link, nav.firstChild);
  }
}

prepareSections();

// Leer recursivamente las carpetas
async function scanFolder(folder) {
  const root = new URL(folder.path, location.origin);
  const queue = [{ url: root, depth: 0 }];
  const visited = new Set();
  let found = [];

  while (queue.length && visited.size < 1200) {
    const current = queue.shift();
    if (current.depth > 12) continue;

    const currentUrl = current.url.href;
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    try {
      const response = await fetch(currentUrl);
      if (!response.ok) continue;

      const html = await response.text();
      const documentPage = new DOMParser().parseFromString(html, 'text/html');

      documentPage.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('?') || href.startsWith('#')) return;

        let target;
        try {
          target = new URL(href, currentUrl);
        } catch {
          return;
        }

        if (target.origin !== location.origin) return;
        if (!target.pathname.startsWith(root.pathname)) return;

        if (target.pathname.endsWith('/')) {
          if (!target.pathname.endsWith('/../')) {
            queue.push({ url: target, depth: current.depth + 1 });
          }
        } else if (extensions.test(target.pathname)) {
          const filename = decodeURIComponent(
            target.pathname.split('/').pop()
          );
          found.push({
            name: filename.replace(/\.[^.]+$/, '').replace(/[._]+/g, ' '),
            url: target.href,
            type: folder.type,
            section: folder.section
          });
        }
      });
    } catch (error) {
      console.error('No se pudo leer:', currentUrl, error);
    }
  }

  return found;
}

// Crear las tarjetas
function createCard(item) {
  const card = document.createElement('article');
  card.className = 'movie';
  card.dataset.type = item.type;
  card.dataset.title = item.name.toLocaleLowerCase('es');

  const poster = document.createElement('div');
  poster.className = 'poster';
  poster.style.background =
    'linear-gradient(145deg, #102c58, #111426 65%, #8d1728)';

  const fallback = document.createElement('span');
  fallback.className = 'poster-fallback';
  fallback.textContent = item.name;

  const tag = document.createElement('span');
  tag.className = 'type-tag';
  tag.textContent = item.type === 'anime' ? 'ANIME' :
    item.type === 'serie' ? 'SERIE' : 'PELÍCULA';

  poster.append(fallback, tag);

  const info = document.createElement('div');
  info.className = 'movie-info';

  const details = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = item.name;

  const category = document.createElement('span');
  category.textContent = item.type === 'anime' ? 'Anime' :
    item.type === 'serie' ? 'Serie' : 'Película';

  details.append(title, category);

  const button = document.createElement('button');
  button.className = 'watch-btn';
  button.textContent = 'Ver ahora';
  button.dataset.video = item.url;
  button.dataset.name = item.name;

  info.append(details, button);
  card.append(poster, info);

  return card;
}

// Mostrar los resultados
function renderCatalog() {
  folders.forEach(folder => {
    const grid = document.getElementById('grid-' + folder.section);
    if (grid) grid.replaceChildren();
  });

  catalog.forEach(item => {
    const grid = document.getElementById('grid-' + item.section);
    if (grid) grid.appendChild(createCard(item));
  });

  updateCatalog();
}

function updateCatalog() {
  const term = (search?.value || '').trim().toLocaleLowerCase('es');
  const selected = document.querySelector('.filter.active')?.dataset.filter || 'todos';

  document.querySelectorAll('.movie[data-type]').forEach(card => {
    const matchesType = selected === 'todos' || card.dataset.type === selected;
    const matchesSearch = card.dataset.title.includes(term);
    card.hidden = !(matchesType && matchesSearch);
  });

  folders.forEach(folder => {
    const grid = document.getElementById('grid-' + folder.section);
    const status = document.getElementById('status-' + folder.section);
    if (!grid || !status) return;

    const visible = [...grid.querySelectorAll('.movie')].filter(card => !card.hidden);
    status.hidden = visible.length > 0;
    if (!visible.length) {
      status.textContent = catalog.some(item => item.section === folder.section)
        ? 'No hay títulos que coincidan con tu búsqueda.'
        : 'No encontramos videos en esta carpeta.';
    }
  });
}

// Filtros y buscador
document.querySelectorAll('.filter').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    updateCatalog();
  });
});

if (search) search.addEventListener('input', updateCatalog);

// Abrir reproductor
document.addEventListener('click', event => {
  const button = event.target.closest('.watch-btn');
  if (!button || !button.dataset.video) return;

  playerTitle.textContent = button.dataset.name;
  video.pause();
  video.removeAttribute('src');
  video.load();
  video.src = button.dataset.video;

  playerMessage.textContent =
    'Si el formato no es compatible con tu navegador, puede ser necesario convertir ese video individualmente a MP4.';

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  video.onerror = () => {
    playerMessage.textContent =
      'Este formato no pudo reproducirse en el navegador. Prueba con un archivo MP4 compatible.';
  };
});

function closePlayer() {
  video.pause();
  video.removeAttribute('src');
  video.load();
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

document.getElementById('closePlayer').addEventListener('click', closePlayer);

modal.addEventListener('click', event => {
  if (event.target === modal) closePlayer();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal.classList.contains('open')) {
    closePlayer();
  }
});

// Iniciar la búsqueda automática
async function startCatalog() {
  for (const folder of folders) {
    const status = document.getElementById('status-' + folder.section);
    try {
      const files = await scanFolder(folder);
      catalog.push(...files);
      renderCatalog();

      if (status && files.length) {
        status.textContent = files.length + ' videos encontrados.';
      }
    } catch (error) {
      if (status) status.textContent = 'No se pudo leer esta carpeta.';
    }
  }
  renderCatalog();
}

startCatalog();
