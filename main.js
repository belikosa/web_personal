let categoriaSeleccionada = 'todos';

function normalizarTexto(texto) {
  if (!texto) return '';
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Secciones que NO se muestran en la pestaña TODOS (siguen saliendo en sus propias categorías)
const OCULTAS_EN_TODOS = ['seccion-videoclip', 'seccion-instagram'];

async function renderizarSecciones() {
  const container = document.getElementById('app-container');
  if (!container) return;
  container.innerHTML = '';

  const catSelNormalizada = normalizarTexto(categoriaSeleccionada);

  // SI SE SELECCIONA CV, CARGAMOS EL ARCHIVO HTML EXTERNO
  if (catSelNormalizada === 'cv') {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'seccion-proyecto';
    sectionEl.id = 'seccion-cv';
    sectionEl.style.paddingTop = '50px';

    const galeriaContenedor = document.createElement('div');
    galeriaContenedor.className = 'galeria-contenedor';
    galeriaContenedor.style.width = '100%';

    try {
      const respuesta = await fetch('cv.html');
      if (!respuesta.ok) throw new Error('No se pudo cargar el archivo');
      const contenidoHtml = await respuesta.text();
      
      galeriaContenedor.innerHTML = contenidoHtml;
    } catch (error) {
      galeriaContenedor.innerHTML = '<p class="description">Error al cargar el archivo de CV.</p>';
    }

    sectionEl.appendChild(galeriaContenedor);
    container.appendChild(sectionEl);
    return; 
  }

  // Resto del código para las demás categorías (basado en data.js)
  if (typeof secciones === 'undefined') return;

  const proyectosVisibles = secciones.filter(sec => {
    const catProyecto = sec.categoria || sec.categoría;
    
    let catsNormalizadas = [];
    if (Array.isArray(catProyecto)) {
      catsNormalizadas = catProyecto.map(c => normalizarTexto(c));
    } else if (catProyecto) {
      catsNormalizadas = [normalizarTexto(catProyecto)];
    }

    if (catSelNormalizada === 'todos') {
      // Excluir BIO y CV de 'todos' (el contenido para terceros SÍ se muestra)
      const esBioOCv = catsNormalizadas.some(cat => cat === 'bio' || cat === 'cv');
      if (esBioOCv) return false;

      // Ocultar las secciones indicadas en OCULTAS_EN_TODOS
      if (OCULTAS_EN_TODOS.includes(sec.id)) return false;

      return true;
    }

    return catsNormalizadas.includes(catSelNormalizada);
  });

  proyectosVisibles.forEach((seccionData, index) => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'seccion-proyecto';
    sectionEl.id = seccionData.id;

    const header = document.createElement('header');
    
    if (seccionData.subhead) {
      const subhead = document.createElement('p');
      subhead.className = 'subhead';
      subhead.innerHTML = seccionData.subhead;
      header.appendChild(subhead);
    }

    if (seccionData.descripciones) {
      seccionData.descripciones.forEach(desc => {
        const p = document.createElement('p');
        p.className = 'description';
        p.innerHTML = desc;
        header.appendChild(p);
      });
    }

    sectionEl.appendChild(header);

    const galeriaContenedor = document.createElement('div');
    galeriaContenedor.className = 'galeria-contenedor';

    if (seccionData.elementos) {
      seccionData.elementos.forEach(item => {
        let el;
        if (item.tipo === 'img') {
          el = document.createElement('img');
          el.src = item.src;
          el.className = 'draggable-image';
          // Si la imagen tiene "link" en data.js, al hacer click abre ese enlace en pestaña nueva
          if (item.link) {
            el.alt = item.alt || 'Ver vídeo';
            el.title = item.alt || 'Ver vídeo';
            el.classList.add('enlace-externo');
            el.tabIndex = 0;
            el.setAttribute('role', 'link');
            const abrir = () => window.open(item.link, '_blank', 'noopener');
            el.addEventListener('click', abrir);
            el.addEventListener('keydown', e => { if (e.key === 'Enter') abrir(); });
          }
        } else if (item.tipo === 'video') {
          el = document.createElement('video');
          el.src = item.src;
          el.autoplay = true;
          el.loop = true;
          el.muted = true;
          el.playsInline = true;
          el.className = 'draggable-image';
        } else if (item.tipo === 'youtube') {
          el = document.createElement('iframe');
          
          // Extrae el ID limpio
          let cleanId = item.idVideo || '';
          if (item.src && item.src.includes('embed/')) {
            cleanId = item.src.split('embed/')[1].split('?')[0];
          } else if (cleanId.includes('?')) {
            cleanId = cleanId.split('?')[0];
          }

          // autoplay silenciado + bucle (el loop de YouTube necesita playlist con el mismo id)
          el.src = `https://www.youtube.com/embed/${cleanId}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${cleanId}&rel=0`;
          
          el.title = "YouTube video player";
          el.style.border = "0";
          el.referrerPolicy = "strict-origin-when-cross-origin";
          el.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
          el.allowFullscreen = true;
          el.className = 'draggable-image';
          
          if (item.height) el.style.height = item.height;
        } else if (item.tipo === 'instagram') {
          // Acepta enlaces de reel, post o tv, con o sin parámetros (?igsh=...)
          const m = String(item.url || '').match(/instagram\.com\/(?:[^\/]+\/)?(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
          if (m) {
            const tipoPost = m[1] === 'reels' ? 'reel' : m[1];

            // Caja que ocupa el hueco en la galería; dentro, el iframe a su tamaño nativo
            const caja = document.createElement('div');
            caja.className = 'instagram-box';
            if (item.alto) caja.style.setProperty('--ig-alto', parseInt(item.alto, 10)); // opcional por vídeo

            const iframe = document.createElement('iframe');
            iframe.src = `https://www.instagram.com/${tipoPost}/${m[2]}/embed`;
            iframe.title = 'Instagram';
            iframe.loading = 'lazy';
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('scrolling', 'no');
            iframe.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share');
            iframe.allowFullscreen = true;
            caja.appendChild(iframe);

            // Encoge el iframe (con transform: scale) para que encaje en el ancho de su caja
            const ajustar = () => {
              const k = caja.clientWidth / iframe.offsetWidth;
              if (k && isFinite(k)) iframe.style.transform = `scale(${k})`;
            };
            if (window.ResizeObserver) {
              new ResizeObserver(ajustar).observe(caja);
            } else {
              window.addEventListener('resize', ajustar);
              setTimeout(ajustar, 0);
            }

            el = caja;
          } else {
            console.warn('Enlace de Instagram no válido:', item.url);
          }
        } else if (item.tipo === 'box' || item.tipo === 'text-elipse') {
          el = document.createElement('div');
          el.className = item.tipo === 'box' ? 'text-box' : 'text-elipse';
          el.innerHTML = item.texto;
        }

        if (el) {
          if (item.top) el.style.top = item.top;
          if (item.left) el.style.left = item.left;
          if (item.right) el.style.right = item.right;
          if (item.width) el.style.width = item.width;
          galeriaContenedor.appendChild(el);
        }
      });
    }

    sectionEl.appendChild(galeriaContenedor);

    if (index < proyectosVisibles.length - 1) {
      const separador = document.createElement('div');
      separador.className = 'separador';
      sectionEl.appendChild(separador);
    }

    container.appendChild(sectionEl);
  });
}

function filtrarCategoria(cat, elementoBoton) {
  categoriaSeleccionada = cat;
  document.querySelectorAll('.btn-filtro').forEach(btn => btn.classList.remove('active'));
  if (elementoBoton) elementoBoton.classList.add('active');
  renderizarSecciones();
}

// Función para filtrar los elementos del CV mediante botones
function filtrarCV(categoria, el) {
  document.querySelectorAll('#filtro-cv button').forEach(btn => {
      btn.classList.remove('active');
  });
  
  if (el) {
      el.classList.add('active');
  }

  const items = document.querySelectorAll('#curriculum .grid-item');
  items.forEach(item => {
      if (categoria === '*') {
          item.style.display = 'block';
      } else {
          if (item.classList.contains(categoria)) {
              item.style.display = 'block';
          } else {
              item.style.display = 'none';
          }
      }
  });
}

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  renderizarSecciones();
});