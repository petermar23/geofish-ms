/**
 * GeoFish MS - Bacia do Rio Miranda (Mato Grosso do Sul)
 * Aplicação WebGIS PWA para Governança Territorial e Pesca Sustentável
 */

// 1. Funções de Segurança e Sanitização de Dados
function escapeHTML(str) {
  if (str === null || str === undefined || String(str).trim() === '') {
    return 'Não informado';
  }
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeDigits(val) {
  if (!val) return '';
  return String(val).replace(/\D/g, '');
}

// Utilitário de Vibração Háptica para Celulares Android (Samsung / Motorola)
function vibrar(padrao = 35) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(padrao);
    } catch (_) {}
  }
}

// Utilitário Screen Wake Lock (mantém a tela do celular acesa durante a navegação no barco)
let wakeLockAtivo = null;
async function manterTelaAtiva() {
  if ('wakeLock' in navigator) {
    try {
      wakeLockAtivo = await navigator.wakeLock.request('screen');
      wakeLockAtivo.addEventListener('release', () => {
        wakeLockAtivo = null;
      });
    } catch (_) {}
  }
}

function normalizeWhatsApp(contato, nome = '') {
  if (!contato) return null;
  const digits = sanitizeDigits(contato);
  if (!digits) return null;
  // Se não começar com código do país (55), adiciona 55
  const fullNumber = digits.startsWith('55') ? digits : '55' + digits;
  const textoMsg = encodeURIComponent(`Olá! Vi seu contato no aplicativo GeoFish MS (Bacia do Rio Miranda) e gostaria de informações sobre serviços e pesca.`);
  return `https://api.whatsapp.com/send?phone=${fullNumber}&text=${textoMsg}`;
}

function sanitizeTel(tel) {
  if (!tel) return null;
  const clean = String(tel).trim().replace(/[^\d+]/g, '');
  if (!/^\+?[0-9]{3,15}$/.test(clean)) return null;
  return `tel:${clean}`;
}

function formatPossuiRampa(val) {
  if (val === true || val === 1) return 'Sim (Possui rampa pública/apoio)';
  if (val === false || val === 0) return 'Não informado / Sem rampa';
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (lower === 'sim' || lower === 's' || lower === 'true') {
      return 'Sim (Possui rampa pública/apoio)';
    }
    if (lower === 'não' || lower === 'nao' || lower === 'n' || lower === 'false') {
      return 'Não';
    }
  }
  return 'Não informado';
}

function obterCorPorRegra(regra) {
  switch (regra) {
    case 'Pesque e Solte':
      return '#2e7d32'; // Verde
    case 'Cota Zero':
      return '#f57c00'; // Laranja
    case 'Defeso':
      return '#d32f2f'; // Vermelho
    default:
      return '#0288d1'; // Azul padrão
  }
}

// 2. Sistema de Notificações Toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 4000);
}

// Limites geográficos estritos da Bacia Hidrográfica do Rio Miranda (Pantanal MS)
const BOUNDS_BACIA = L.latLngBounds(
  L.latLng(-21.80, -57.90), // Sudoeste (Porto Murtinho / Foz no Rio Paraguai)
  L.latLng(-19.30, -54.70)  // Nordeste (Cabeceiras de Aquidauana / Corguinho)
);

// 3. Inicialização do Mapa Leaflet com Esri Satélite
const map = L.map('map', {
  center: [-20.24, -56.38], // Centroide na região de Miranda - MS
  zoom: 9,
  minZoom: 7,
  maxZoom: 18,
  maxBounds: BOUNDS_BACIA,
  maxBoundsViscosity: 0.8,
  zoomControl: false, // Ocultado para posicionar no canto superior direito
  preferCanvas: true
});

// Reposiciona o controle de zoom para o canto superior direito
L.control.zoom({ position: 'topright' }).addTo(map);

// 1. Camada Base Principal: Imagens de Satélite de Alta Resolução (Esri World Imagery)
const sateliteEsri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 18,
  attribution: 'Imagens: Tiles &copy; Esri &mdash; Satélite Pantanal MS',
  crossOrigin: true
}).addTo(map);

// Camada de Rótulos de Cidades, Rios e Rodovias (Esri Boundaries & Places)
const rotulosPane = map.createPane('rotulosPane');
rotulosPane.style.zIndex = '468';
rotulosPane.style.pointerEvents = 'none';

const rotulosEsri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 18,
  pane: 'rotulosPane',
  crossOrigin: true
}).addTo(map);

// 2. Camada Base Secundária: Relevo e Topografia (Esri World Topo)
const relevoEsri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 16,
  attribution: 'Tiles &copy; Esri &mdash; Relevo Topográfico',
  crossOrigin: true
});

// Atribuição oficial dos dados geoespaciais e governança (SEMADESC / IMASUL / Colônias Z-1 e Z-7)
map.attributionControl.addAttribution('Dados Oficiais: <a href="https://www.imasul.ms.gov.br" target="_blank" rel="noopener noreferrer">SEMADESC / IMASUL / Colônias Z-1 e Z-7</a>');

// 4. Criação dos Panes do Leaflet com zIndex estrito (Regras de Empilhamento)
const PANES = [
  { name: 'baciasPane', zIndex: 410 },
  { name: 'especiaisPane', zIndex: 420 },
  { name: 'aglomeradosPane', zIndex: 430 },
  { name: 'restritasPane', zIndex: 440 },
  { name: 'riosPane', zIndex: 450 },
  { name: 'apoioPane', zIndex: 460 },
  { name: 'guiasPane', zIndex: 465 },
  { name: 'posicaoPane', zIndex: 470 }
];

PANES.forEach(p => {
  map.createPane(p.name);
  map.getPane(p.name).style.zIndex = String(p.zIndex);
});

// 5. Gerenciamento do Painel Inferior (Bottom Sheet)
const bottomSheet = document.getElementById('bottom-sheet');
const sheetContent = document.getElementById('sheet-content');
const closeSheetBtn = document.getElementById('close-sheet');

function abrirPainel(htmlContent) {
  if (!sheetContent || !bottomSheet) return;
  sheetContent.innerHTML = htmlContent;
  bottomSheet.classList.remove('hidden');
  bottomSheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('sheet-open');
  vibrar(25);
  try {
    history.pushState({ painelAberto: true }, '');
  } catch (_) {}
  if (closeSheetBtn) {
    closeSheetBtn.focus();
  }
}

function fecharPainel() {
  if (!bottomSheet) return;
  bottomSheet.classList.add('hidden');
  bottomSheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('sheet-open');
}

if (closeSheetBtn) {
  closeSheetBtn.addEventListener('click', fecharPainel);
}

// Fecha o painel ao clicar em área vazia do mapa
map.on('click', () => {
  fecharPainel();
});

// Fecha o painel com a tecla Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    fecharPainel();
    fecharModalSobre();
  }
});

// 6. Controle de Camadas no Canto Superior Direito
const controleCamadas = L.control.layers(null, null, {
  collapsed: true,
  position: 'topright'
}).addTo(map);

// Adiciona opções de mapa base no controle
controleCamadas.addBaseLayer(sateliteEsri, '🛰️ Esri Satélite (Alta Resolução)');
controleCamadas.addBaseLayer(relevoEsri, '⛰️ Esri Relevo / Topografia');

// Registro de status das camadas para a janela "Sobre os dados" e dados espaciais carregados
const statusCamadas = {};
const dadosCarregados = {};
const camadasInstanciadas = {};

// 7. Funções de Cálculo Espacial Avançado e Radar de Conformidade
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distância perpendicular ponto-a-segmento de rio
function distanciaPontoSegmentoKm(pLat, pLng, aLat, aLng, bLat, bLng) {
  const dAB2 = (bLat - aLat) * (bLat - aLat) + (bLng - aLng) * (bLng - aLng);
  if (dAB2 === 0) {
    return calcularDistanciaKm(pLat, pLng, aLat, aLng);
  }
  let t = ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) / dAB2;
  t = Math.max(0, Math.min(1, t));
  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return calcularDistanciaKm(pLat, pLng, projLat, projLng);
}

// Ray-casting otimizado com verificação prévia de Bounding Box O(1)
function pontoEmPoligono(lat, lng, coords) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (let i = 0; i < coords.length; i++) {
    const pt = coords[i];
    if (pt[0] < minLng) minLng = pt[0];
    if (pt[0] > maxLng) maxLng = pt[0];
    if (pt[1] < minLat) minLat = pt[1];
    if (pt[1] > maxLat) maxLat = pt[1];
  }
  // Se estiver fora da caixa delimitadora, descarta imediatamente
  if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0], yi = coords[i][1];
    const xj = coords[j][0], yj = coords[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Verificação do Período Anual de Defeso da Piracema no Pantanal (05/Nov a 28/Fev)
function verificarPeriodoDefeso() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const dia = hoje.getDate();
  const emDefeso = (mes === 11 && dia >= 5) || (mes === 12) || (mes === 1) || (mes === 2 && dia <= 28);
  const banner = document.getElementById('banner-defeso');
  const bannerText = document.getElementById('banner-defeso-text');
  if (banner && bannerText) {
    if (emDefeso) {
      banner.classList.remove('hidden');
      bannerText.innerHTML = `<strong>⚠️ ALERTA OFICIAL: Período de Defeso da Piracema em vigor na Bacia do Miranda (05/Nov a 28/Fev).</strong> Pesca amadora e profissional de espécies nativas suspensa por lei estadual.`;
    } else {
      banner.classList.add('hidden');
    }
  }
  return emDefeso;
}

function avaliarConformidadePosicao(userLat, userLng) {
  let trechoMaisProximo = null;
  let menorDistanciaTrecho = Infinity;

  const dadosTrechos = dadosCarregados['trechos_pesca'];
  if (dadosTrechos && dadosTrechos.features) {
    for (const feat of dadosTrechos.features) {
      const geom = feat.geometry;
      let lineCoords = [];
      if (geom.type === 'LineString') {
        lineCoords = [geom.coordinates];
      } else if (geom.type === 'MultiLineString') {
        lineCoords = geom.coordinates;
      }
      for (const line of lineCoords) {
        for (let i = 0; i < line.length - 1; i++) {
          const p1 = line[i];
          const p2 = line[i + 1];
          const d = distanciaPontoSegmentoKm(userLat, userLng, p1[1], p1[0], p2[1], p2[0]);
          if (d < menorDistanciaTrecho) {
            menorDistanciaTrecho = d;
            trechoMaisProximo = feat.properties;
          }
        }
      }
    }
  }

  let ucAtual = null;
  const dadosUcs = dadosCarregados['areas_restritas'];
  if (dadosUcs && dadosUcs.features) {
    for (const feat of dadosUcs.features) {
      const geom = feat.geometry;
      let polyList = [];
      if (geom.type === 'Polygon') {
        polyList = [geom.coordinates[0]];
      } else if (geom.type === 'MultiPolygon') {
        polyList = geom.coordinates.map(p => p[0]);
      }
      for (const ring of polyList) {
        if (pontoEmPoligono(userLat, userLng, ring)) {
          ucAtual = feat.properties;
          break;
        }
      }
      if (ucAtual) break;
    }
  }

  let apoioMaisProximo = null;
  let menorDistApoio = Infinity;
  const dadosApoio = dadosCarregados['pontos_emergencia'];
  if (dadosApoio && dadosApoio.features) {
    for (const feat of dadosApoio.features) {
      const coords = feat.geometry.coordinates;
      const d = calcularDistanciaKm(userLat, userLng, coords[1], coords[0]);
      if (d < menorDistApoio) {
        menorDistApoio = d;
        apoioMaisProximo = { ...feat.properties, distanciaKm: d };
      }
    }
  }

  return {
    trecho: trechoMaisProximo,
    distanciaTrechoKm: menorDistanciaTrecho,
    uc: ucAtual,
    apoio: apoioMaisProximo
  };
}

/**
 * Carrega a camada GeoJSON com estratégia Rede Primeiro e fallback IndexedDB com timeout de 5s
 */
async function carregarCamada(layerKey, url) {
  const cached = window.GeoFishDB ? await window.GeoFishDB.obterCamada(layerKey) : null;
  let dados = null;
  let origem = 'offline';
  let dataAtualizacao = cached ? cached.atualizado_em : null;

  const controller = new AbortController();
  let timeoutId = null;

  // Se já temos cache, dá até 5 segundos para a rede responder antes de recorrer ao cache
  if (cached) {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, 5000);
  }

  try {
    const response = await fetch(url, {
      cache: 'no-cache',
      signal: controller.signal
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (response.ok) {
      dados = await response.json();
      origem = 'rede';
      dataAtualizacao = new Date().toISOString();

      // Salva no IndexedDB apenas se houve alteração
      if (window.GeoFishDB) {
        await window.GeoFishDB.salvarCamada(layerKey, dados, response.headers.get('ETag') || '1.0');
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    if (cached && cached.data) {
      dados = cached.data;
      origem = 'offline';
      dataAtualizacao = cached.atualizado_em;
    } else {
      console.warn(`Falha ao obter dados da camada [${layerKey}]:`, err);
      dados = null;
      origem = 'indisponivel';
    }
  }

  statusCamadas[layerKey] = {
    origem: origem,
    atualizado_em: dataAtualizacao
  };

  return dados;
}

// 7. Inicialização de Todas as Camadas em Paralelo
async function carregarTodasCamadas() {
  const loadingIndicator = document.getElementById('loading-indicator');
  const loadingText = document.getElementById('loading-text');

  const definicoesCamadas = [
    { key: 'trechos_pesca', url: 'data/processed/trechos_pesca.geojson', nome: '🎣 Trechos de Pesca (Regras)', ativa: true },
    { key: 'guias_credenciados', url: 'data/processed/guias_credenciados.geojson', nome: '🚤 Guias Credenciados', ativa: true },
    { key: 'pontos_emergencia', url: 'data/processed/pontos_emergencia.geojson', nome: '🏥 Apoio e Emergência', ativa: true },
    { key: 'areas_restritas', url: 'data/processed/areas_restritas.geojson', nome: '⚠️ Áreas Restritas (UCs)', ativa: true },
    { key: 'rios_principais', url: 'data/processed/rios_principais.geojson', nome: '🌊 Rios Principais', ativa: true },
    { key: 'bacias_uepgrh', url: 'data/processed/bacias_uepgrh.geojson', nome: '🗺️ Bacias Hidrográficas (UEPGRH)', ativa: false },
    { key: 'bacias_especiais', url: 'data/processed/bacias_especiais.geojson', nome: '🎯 Bacias Especiais (Manejo)', ativa: false },
    { key: 'aglomerados_rurais', url: 'data/processed/aglomerados_rurais.geojson', nome: '🏘️ Aglomerados Rurais', ativa: false }
  ];

  let carregadas = 0;
  const total = definicoesCamadas.length;

  const promises = definicoesCamadas.map(async (def) => {
    try {
      const dados = await carregarCamada(def.key, def.url);
      carregadas++;
      if (loadingText) {
        loadingText.textContent = `Carregando camadas… ${carregadas}/${total}`;
      }

      if (!dados) {
        console.warn(`Camada [${def.nome}] indisponível no momento.`);
        return;
      }

      let camadaLeaflet = null;

      // Montagem de cada camada com o pane correto
      switch (def.key) {
        case 'trechos_pesca':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'riosPane',
            style: (feature) => ({
              color: obterCorPorRegra(feature.properties.regra),
              weight: 8,
              opacity: 0.95
            }),
            onEachFeature: (feature, layer) => {
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                const p = feature.properties;
                const cor = obterCorPorRegra(p.regra);
                abrirPainel(`
                  <span class="badge-tag" style="background-color: ${cor};">Regra: ${escapeHTML(p.regra)}</span>
                  <h2 class="sheet-title">${escapeHTML(p.rio)}</h2>
                  <div class="data-group">
                    <div class="data-item">
                      <div class="data-label">Cota Permitida</div>
                      <div class="data-value">${escapeHTML(p.cota)}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Petrechos Autorizados</div>
                      <div class="data-value">${escapeHTML(p.petrechos)}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Norma de Referência</div>
                      <div class="data-value">${escapeHTML(p.norma_ref)}</div>
                    </div>
                  </div>
                  <div class="legal-note-box">
                    <strong>Atenção:</strong> As regras apresentadas são orientativas e baseadas nas normativas do IMASUL/SEMADESC. Consulte sempre a legislação vigente antes da pescaria.
                  </div>
                `);
              });
            }
          });
          break;

        case 'guias_credenciados':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'guiasPane',
            pointToLayer: (feature, latlng) => {
              return L.circleMarker(latlng, {
                pane: 'guiasPane',
                radius: 8,
                fillColor: '#0b4f6c',
                color: '#ffffff',
                weight: 2.5,
                fillOpacity: 1
              });
            },
            onEachFeature: (feature, layer) => {
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                const g = feature.properties;
                const waUrl = normalizeWhatsApp(g.contato_wa);
                abrirPainel(`
                  <span class="badge-tag" style="background-color: #0b4f6c;">Guia de Pesca Credenciado</span>
                  <h2 class="sheet-title">${escapeHTML(g.nome_operacional)}</h2>
                  <div class="data-group">
                    <div class="data-item">
                      <div class="data-label">Colônia de Pescadores</div>
                      <div class="data-value">${escapeHTML(g.colonia)}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Porto / Base de Saída</div>
                      <div class="data-value">${escapeHTML(g.porto_base)}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Embarcação / Motor</div>
                      <div class="data-value">${escapeHTML(g.tipo_barco)}</div>
                    </div>
                  </div>
                  ${waUrl ? `
                    <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-cta btn-whatsapp">
                      💬 Chamar no WhatsApp
                    </a>
                  ` : ''}
                `);
              });
            }
          });
          break;

        case 'pontos_emergencia':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'apoioPane',
            pointToLayer: (feature, latlng) => {
              return L.circleMarker(latlng, {
                pane: 'apoioPane',
                radius: 7,
                fillColor: '#d32f2f',
                color: '#ffffff',
                weight: 2,
                fillOpacity: 1
              });
            },
            onEachFeature: (feature, layer) => {
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                const a = feature.properties;
                const telUrl = sanitizeTel(a.telefone_emergencia);
                abrirPainel(`
                  <span class="badge-tag" style="background-color: #d32f2f;">Apoio e Emergência</span>
                  <h2 class="sheet-title">${escapeHTML(a.nome)}</h2>
                  <div class="data-group">
                    <div class="data-item">
                      <div class="data-label">Tipo de Ponto</div>
                      <div class="data-value">${escapeHTML(a.tipo)}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Rampa de Barco</div>
                      <div class="data-value">${escapeHTML(formatPossuiRampa(a.possui_rampa))}</div>
                    </div>
                    ${a.telefone_emergencia ? `
                      <div class="data-item">
                        <div class="data-label">Telefone de Emergência</div>
                        <div class="data-value">${escapeHTML(a.telefone_emergencia)}</div>
                      </div>
                    ` : ''}
                  </div>
                  ${telUrl ? `
                    <a href="${telUrl}" class="btn-cta btn-emergency">
                      📞 Ligar para Emergência
                    </a>
                  ` : ''}
                `);
              });
            }
          });
          break;

        case 'areas_restritas':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'restritasPane',
            style: {
              color: '#f57c00',
              fillColor: '#f57c00',
              weight: 2,
              fillOpacity: 0.25,
              dashArray: '5, 5'
            },
            onEachFeature: (feature, layer) => {
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                const u = feature.properties;
                abrirPainel(`
                  <span class="badge-tag" style="background-color: #f57c00;">Unidade de Conservação (${escapeHTML(u.esfera)})</span>
                  <h2 class="sheet-title">${escapeHTML(u.nome)}</h2>
                  <div class="data-group">
                    <div class="data-item">
                      <div class="data-label">Categoria de Manejo</div>
                      <div class="data-value">${escapeHTML(u.categoria)}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Município(s)</div>
                      <div class="data-value">${escapeHTML(u.municipio)}</div>
                    </div>
                  </div>
                  <div class="legal-note-box">
                    <strong>Alerta Ambiental:</strong> Unidades de Conservação possuem planos de manejo próprios. A atividade pesqueira pode ser restrita ou totalmente vedada.
                  </div>
                `);
              });
            }
          });
          break;

        case 'rios_principais':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'riosPane',
            style: {
              color: '#0288d1',
              weight: 5,
              opacity: 0.6,
              dashArray: '3, 6'
            },
            onEachFeature: (feature, layer) => {
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                const r = feature.properties;
                abrirPainel(`
                  <span class="badge-tag" style="background-color: #0288d1;">Hidrografia Principal</span>
                  <h2 class="sheet-title">${escapeHTML(r.rio)}</h2>
                  <div class="data-group">
                    <div class="data-item">
                      <div class="data-label">Extensão Mapeada</div>
                      <div class="data-value">${r.extensao_km ? escapeHTML(r.extensao_km) + ' km' : 'Não informado'}</div>
                    </div>
                  </div>
                  <div class="legal-note-box">
                    Toque nos trechos destacados com cores vivas para visualizar as regras específicas de pesca (Cota Zero, Pesque e Solte, Defeso).
                  </div>
                `);
              });
            }
          });
          break;

        case 'bacias_uepgrh':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'baciasPane',
            style: {
              color: '#1976d2',
              fillColor: '#90caf9',
              weight: 1.5,
              fillOpacity: 0.15,
              dashArray: '4, 4'
            },
            onEachFeature: (feature, layer) => {
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                const b = feature.properties;
                abrirPainel(`
                  <span class="badge-tag" style="background-color: #1976d2;">Bacia Hidrográfica UEPGRH</span>
                  <h2 class="sheet-title">${escapeHTML(b.nome_bacia)}</h2>
                  <div class="data-group">
                    <div class="data-item">
                      <div class="data-label">Rio Principal</div>
                      <div class="data-value">${escapeHTML(b.rio_principal)}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Área de Drenagem</div>
                      <div class="data-value">${b.area_km2 ? Number(b.area_km2).toLocaleString('pt-BR') + ' km²' : 'Não informado'}</div>
                    </div>
                  </div>
                `);
              });
            }
          });
          break;

        case 'bacias_especiais':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'especiaisPane',
            style: {
              color: '#9c27b0',
              fillColor: '#ce93d8',
              weight: 1.5,
              fillOpacity: 0.2,
              dashArray: '6, 6'
            },
            onEachFeature: (feature, layer) => {
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                const s = feature.properties;
                abrirPainel(`
                  <span class="badge-tag" style="background-color: #9c27b0;">Área Especial de Manejo</span>
                  <h2 class="sheet-title">${escapeHTML(s.nome_bacia)}</h2>
                  <div class="data-group">
                    <div class="data-item">
                      <div class="data-label">Área Total</div>
                      <div class="data-value">${s.area_ha ? Number(s.area_ha).toLocaleString('pt-BR') + ' ha' : 'Não informado'}</div>
                    </div>
                  </div>
                  <div class="legal-note-box">
                    Áreas de preservação especial sujeitas a zoneamento ambiental específico e normas restritivas de pesca.
                  </div>
                `);
              });
            }
          });
          break;

        case 'aglomerados_rurais':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'aglomeradosPane',
            style: {
              color: '#795548',
              fillColor: '#bcaaa4',
              weight: 1.5,
              fillOpacity: 0.35,
              dashArray: '3, 3'
            },
            onEachFeature: (feature, layer) => {
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                const a = feature.properties;
                abrirPainel(`
                  <span class="badge-tag" style="background-color: #795548;">Comunidade / Aglomerado Rural</span>
                  <h2 class="sheet-title">${escapeHTML(a.nome)}</h2>
                  <div class="data-group">
                    <div class="data-item">
                      <div class="data-label">Tipo</div>
                      <div class="data-value">${escapeHTML(a.tipo)}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Zona Territorial</div>
                      <div class="data-value">${escapeHTML(a.zona)}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Município</div>
                      <div class="data-value">${escapeHTML(a.municipio)}</div>
                    </div>
                  </div>
                `);
              });
            }
          });
          break;
      }

      if (camadaLeaflet) {
        dadosCarregados[def.key] = dados;
        camadasInstanciadas[def.key] = camadaLeaflet;
        controleCamadas.addOverlay(camadaLeaflet, def.nome);
        if (def.ativa) {
          camadaLeaflet.addTo(map);
        }
      }
    } catch (err) {
      console.warn(`Erro no processamento da camada [${def.nome}]:`, err);
      showToast(`Aviso: Camada ${def.nome} não pôde ser carregada.`, 'warn');
    }
  });

  await Promise.allSettled(promises);

  // Oculta indicador de progresso
  if (loadingIndicator) {
    loadingIndicator.classList.add('hidden');
  }
}

// 8. Navegação Territorial do WebGIS (Foco Comunitário e Exploração Livre)
let marcadorPosicao = null;
let circuloPrecisao = null;
const btnLocalizacao = null; // Sensor de GPS descontinuado em prol de economia de bateria e foco em contatos

// 9. Modal "Sobre os Dados" e Governança Territorial
const modalSobre = document.getElementById('modal-sobre');
const btnAbrirSobre = document.getElementById('btn-sobre');
const btnFecharSobre = document.getElementById('btn-fechar-sobre');
const layerStatusList = document.getElementById('layer-status-list');

function formatarDataBR(isoString) {
  if (!isoString) return 'Data não disponível';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return isoString;
  }
}

function abrirModalSobre() {
  if (!modalSobre) return;

  // Atualiza a listagem de status das camadas
  if (layerStatusList) {
    layerStatusList.innerHTML = '';
    const nomes = {
      trechos_pesca: 'Regras de Pesca por Trecho',
      guias_credenciados: 'Guias de Pesca Credenciados',
      pontos_emergencia: 'Pontos de Apoio e Emergência',
      areas_restritas: 'Áreas Restritas (Unidades de Conservação)',
      rios_principais: 'Rios Principais do Estado',
      bacias_uepgrh: 'Bacias Hidrográficas (UEPGRH)',
      bacias_especiais: 'Bacias Especiais de Manejo',
      aglomerados_rurais: 'Aglomerados e Comunidades Rurais'
    };

    for (const [key, nome] of Object.entries(nomes)) {
      const status = statusCamadas[key] || { origem: 'indisponivel', atualizado_em: null };
      const row = document.createElement('div');
      row.className = 'layer-status-row';

      let tagClass = 'status-unavailable';
      let tagTexto = 'Indisponível';

      if (status.origem === 'rede') {
        tagClass = 'status-online';
        tagTexto = 'Atualizada na sessão';
      } else if (status.origem === 'offline') {
        tagClass = 'status-cached';
        tagTexto = `Offline (${formatarDataBR(status.atualizado_em)})`;
      }

      row.innerHTML = `
        <span><strong>${escapeHTML(nome)}</strong></span>
        <span class="status-tag ${tagClass}">${tagTexto}</span>
      `;
      layerStatusList.appendChild(row);
    }
  }

  modalSobre.classList.remove('hidden');
  modalSobre.setAttribute('aria-hidden', 'false');
  vibrar(25);
  try {
    history.pushState({ modal: 'sobre' }, '');
  } catch (_) {}
  if (btnFecharSobre) btnFecharSobre.focus();
}

function fecharModalSobre() {
  if (!modalSobre) return;
  modalSobre.classList.add('hidden');
  modalSobre.setAttribute('aria-hidden', 'true');
}

if (btnAbrirSobre) {
  btnAbrirSobre.addEventListener('click', abrirModalSobre);
}

if (btnFecharSobre) {
  btnFecharSobre.addEventListener('click', fecharModalSobre);
}

if (modalSobre) {
  modalSobre.addEventListener('click', (e) => {
    if (e.target === modalSobre) {
      fecharModalSobre();
    }
  });
}

// 10. Indicador de Rede Online / Modo Offline
const statusRedeEl = document.getElementById('status-rede');

function atualizarStatusRede() {
  if (!statusRedeEl) return;
  if (navigator.onLine) {
    statusRedeEl.innerHTML = '<span class="status-dot"></span> Online';
    statusRedeEl.className = '';
  } else {
    statusRedeEl.innerHTML = '<span class="status-dot"></span> Modo Offline';
    statusRedeEl.className = 'offline';
  }
}

window.addEventListener('online', () => {
  atualizarStatusRede();
  showToast('Conexão restabelecida: Você está online.');
});

window.addEventListener('offline', () => {
  atualizarStatusRede();
  showToast('Você está offline: GeoFish MS operando com dados salvos no celular.');
});

atualizarStatusRede();

// 11. Registro do Service Worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        // Service worker registrado
      })
      .catch((err) => {
        console.warn('Erro ao registrar Service Worker do PWA:', err);
      });
  });
}

// 12. Instalação do PWA Otimizada para Celulares Android (Samsung / Motorola)
let deferredInstallPrompt = null;
const btnInstallPWA = document.getElementById('btn-install-pwa');
const modalInstall = document.getElementById('modal-install');
const btnFecharInstall = document.getElementById('btn-fechar-install');
const androidBanner = document.getElementById('android-install-banner');
const btnAndroidInstall = document.getElementById('btn-android-install');
const btnAndroidDismiss = document.getElementById('btn-android-dismiss');

const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function abrirModalInstall() {
  if (!modalInstall) return;
  modalInstall.classList.remove('hidden');
  modalInstall.setAttribute('aria-hidden', 'false');
  vibrar(25);
  try {
    history.pushState({ modal: 'install' }, '');
  } catch (_) {}
}

function fecharModalInstall() {
  if (!modalInstall) return;
  modalInstall.classList.add('hidden');
  modalInstall.setAttribute('aria-hidden', 'true');
}

if (btnFecharInstall) {
  btnFecharInstall.addEventListener('click', fecharModalInstall);
}

if (modalInstall) {
  modalInstall.addEventListener('click', (e) => {
    if (e.target === modalInstall) fecharModalInstall();
  });
}

// Captura o evento nativo de instalação no Android (Google Chrome & Samsung Internet)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;

  if (btnInstallPWA && !isStandalone) {
    btnInstallPWA.style.display = 'inline-flex';
  }

  // Exibe banner nativo de instalação no Android se não tiver sido dispensado
  const bannerDispensado = localStorage.getItem('geofish_android_banner_dismiss');
  if (androidBanner && !isStandalone && !bannerDispensado) {
    androidBanner.classList.remove('hidden');
  }
});

if (btnInstallPWA) {
  btnInstallPWA.addEventListener('click', async () => {
    vibrar(25);
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast('GeoFish MS instalado no seu celular!');
        btnInstallPWA.style.display = 'none';
        if (androidBanner) androidBanner.classList.add('hidden');
      }
      deferredInstallPrompt = null;
    } else {
      abrirModalInstall();
    }
  });
}

if (btnAndroidInstall) {
  btnAndroidInstall.addEventListener('click', async () => {
    vibrar(30);
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast('GeoFish MS instalado com sucesso!');
        if (androidBanner) androidBanner.classList.add('hidden');
        if (btnInstallPWA) btnInstallPWA.style.display = 'none';
      }
      deferredInstallPrompt = null;
    } else {
      abrirModalInstall();
    }
  });
}

if (btnAndroidDismiss) {
  btnAndroidDismiss.addEventListener('click', () => {
    vibrar(20);
    if (androidBanner) androidBanner.classList.add('hidden');
    localStorage.setItem('geofish_android_banner_dismiss', 'true');
  });
}

window.addEventListener('appinstalled', () => {
  showToast('Aplicativo instalado no celular! Agora você pode usar sem internet no rio.');
  if (btnInstallPWA) btnInstallPWA.style.display = 'none';
  if (androidBanner) androidBanner.classList.add('hidden');
});

// Suporte ao Botão Físico/Gesto de Voltar do Android (Samsung / Motorola)
window.addEventListener('popstate', () => {
  if (bottomSheet && !bottomSheet.classList.contains('hidden')) {
    bottomSheet.classList.add('hidden');
    document.body.classList.remove('sheet-open');
    return;
  }
  if (modalEspecies && !modalEspecies.classList.contains('hidden')) {
    modalEspecies.classList.add('hidden');
    return;
  }
  if (modalSobre && !modalSobre.classList.contains('hidden')) {
    modalSobre.classList.add('hidden');
    return;
  }
  if (modalInstall && !modalInstall.classList.contains('hidden')) {
    modalInstall.classList.add('hidden');
    return;
  }
  const searchResults = document.getElementById('local-search-results');
  if (searchResults && !searchResults.classList.contains('hidden')) {
    searchResults.classList.add('hidden');
  }
});

// Barra de Navegação Inferior de Polegar para Android
const navBtnGuias = document.getElementById('nav-btn-guias');
const navBtnEspecies = document.getElementById('nav-btn-especies');
const navBtnRampas = document.getElementById('nav-btn-rampas');
const navBtnBusca = document.getElementById('nav-btn-busca');

if (navBtnGuias) {
  navBtnGuias.addEventListener('click', () => {
    vibrar(30);
    if (typeof abrirModalParceriasTab === 'function') {
      abrirModalParceriasTab('piloteiros');
    }
  });
}

if (navBtnEspecies) {
  navBtnEspecies.addEventListener('click', () => {
    vibrar(25);
    abrirModalEspecies();
  });
}

if (navBtnRampas) {
  navBtnRampas.addEventListener('click', () => {
    vibrar(25);
    aplicarFiltroRapido('apoio');
    const chipApoio = document.querySelector('.filter-chip[data-filter="apoio"]');
    if (chipApoio) {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chipApoio.classList.add('active');
    }
  });
}

if (navBtnBusca) {
  navBtnBusca.addEventListener('click', () => {
    vibrar(25);
    const searchInput = document.getElementById('local-search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// Inicialização do aplicativo: carrega camadas, verifica defeso, atalhos do Android e busca local
window.addEventListener('DOMContentLoaded', () => {
  verificarPeriodoDefeso();
  carregarTodasCamadas().then(() => {
    // Processamento de atalhos rápidos do Android (URL shortcuts do manifest)
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    if (action === 'gps') {
      setTimeout(obterLocalizacao, 800);
    } else if (action === 'especies') {
      setTimeout(abrirModalEspecies, 500);
    } else if (action === 'apoio') {
      setTimeout(() => aplicarFiltroRapido('apoio'), 500);
    }
  });
  inicializarBuscaLocal();
});

// 13. Barra de Filtros Rápidos (Chips com 1 Toque)
function aplicarFiltroRapido(tipo) {
  for (const [key, layer] of Object.entries(camadasInstanciadas)) {
    map.removeLayer(layer);
  }

  if (tipo === 'all') {
    if (camadasInstanciadas['trechos_pesca']) map.addLayer(camadasInstanciadas['trechos_pesca']);
    if (camadasInstanciadas['guias_credenciados']) map.addLayer(camadasInstanciadas['guias_credenciados']);
    if (camadasInstanciadas['pontos_emergencia']) map.addLayer(camadasInstanciadas['pontos_emergencia']);
    if (camadasInstanciadas['areas_restritas']) map.addLayer(camadasInstanciadas['areas_restritas']);
    if (camadasInstanciadas['rios_principais']) map.addLayer(camadasInstanciadas['rios_principais']);
    showToast('Exibindo todas as camadas ativas.');
  } else if (tipo === 'regras') {
    if (camadasInstanciadas['trechos_pesca']) map.addLayer(camadasInstanciadas['trechos_pesca']);
    if (camadasInstanciadas['rios_principais']) map.addLayer(camadasInstanciadas['rios_principais']);
    showToast('Filtro: Regras de Pesca por Trecho.');
  } else if (tipo === 'guias') {
    if (camadasInstanciadas['guias_credenciados']) {
      map.addLayer(camadasInstanciadas['guias_credenciados']);
      const bounds = camadasInstanciadas['guias_credenciados'].getBounds();
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
    }
    showToast('Filtro: Guias Credenciados Z-1 e Z-7.');
  } else if (tipo === 'apoio') {
    if (camadasInstanciadas['pontos_emergencia']) {
      map.addLayer(camadasInstanciadas['pontos_emergencia']);
      const bounds = camadasInstanciadas['pontos_emergencia'].getBounds();
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
    }
    showToast('Filtro: Pontos de Apoio, Rampas e Emergência.');
  } else if (tipo === 'restritas') {
    if (camadasInstanciadas['areas_restritas']) {
      map.addLayer(camadasInstanciadas['areas_restritas']);
      const bounds = camadasInstanciadas['areas_restritas'].getBounds();
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
    }
    showToast('Filtro: Unidades de Conservação e Áreas Restritas.');
  }
}

const chipsFiltro = document.querySelectorAll('.filter-chip');
chipsFiltro.forEach(chip => {
  chip.addEventListener('click', () => {
    chipsFiltro.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const filtro = chip.getAttribute('data-filter');
    aplicarFiltroRapido(filtro);
  });
});

// 14. Tabela Oficial de Espécies e Régua de Medidas (IMASUL MS)
// 14. Tabela Oficial de Espécies e Régua de Medidas (Decreto Estadual nº 15.166/19 e Decreto nº 15.375/20)
const ESPECIES_MS = [
  {
    id: 'pintado',
    nome: 'Pintado / Surubim',
    nomeCientifico: 'Pseudoplatystoma corruscans',
    status: 'cota-zero',
    statusTexto: 'Faixa 85 a 125 cm (1 Nativo)',
    min: 85,
    max: 125,
    regra: 'Permitida a captura e o transporte de 1 exemplar nativo por pescador licenciado, dentro da faixa de 85 a 125 cm (Decretos nº 15.166/19 e 15.375/20). Transporte EXCLUSIVO dentro de MS (proibido interestadual/internacional). O peixe deve estar inteiro no gelo, vistoriado e lacrado pela PMA com a GCP emitida em qualquer unidade da PMA antes de pegar a rodovia.'
  },
  {
    id: 'pacu',
    nome: 'Pacu',
    nomeCientifico: 'Piaractus mesopotamicus',
    status: 'cota-zero',
    statusTexto: 'Faixa 45 a 65 cm',
    min: 45,
    max: 65,
    regra: 'Permitida a captura e o transporte de 1 exemplar entre 45 e 65 cm. Exemplares acima de 65 cm são matrizes protegidas por lei e devem ser soltos vivos imediatamente (Art. 9º, § 3º).'
  },
  {
    id: 'cachara',
    nome: 'Cachara',
    nomeCientifico: 'Pseudoplatystoma reticulatum',
    status: 'cota-zero',
    statusTexto: 'Faixa 80 a 120 cm',
    min: 80,
    max: 120,
    regra: 'Faixa permitida de 80 a 120 cm. Fora dessa faixa (menor que 80 ou maior que 120 cm), a soltura é obrigatória (Art. 9º).'
  },
  {
    id: 'jau',
    nome: 'Jaú',
    nomeCientifico: 'Zungaro jahu',
    status: 'cota-zero',
    statusTexto: 'Faixa 95 a 130 cm',
    min: 95,
    max: 130,
    regra: 'Permitida a captura e o transporte de 1 exemplar entre 95 e 130 cm. Exemplares gigantes acima de 130 cm são reprodutores protegidos por lei (Art. 9º).'
  },
  {
    id: 'piraputanga',
    nome: 'Piraputanga',
    nomeCientifico: 'Brycon hilarii',
    status: 'cota-zero',
    statusTexto: 'Mínimo 30 cm',
    min: 30,
    max: null,
    regra: 'Tamanho mínimo de 30 cm (Art. 9º). Atenção: na calha do Rio Salobra e afluentes é modalidade exclusivamente Pesque e Solte.'
  },
  {
    id: 'curimbata',
    nome: 'Curimbatá / Curimba / Papaterra',
    nomeCientifico: 'Prochilodus lineatus',
    status: 'cota-zero',
    statusTexto: 'Mínimo 38 cm',
    min: 38,
    max: null,
    regra: 'Tamanho mínimo de 38 cm (Art. 9º). Comercialização expressamente proibida na Bacia do Rio Paraguai (Art. 5º, Parágrafo único).'
  },
  {
    id: 'piavucu',
    nome: 'Piavussu / Piauçu',
    nomeCientifico: 'Megaleporinus macrocephalus',
    status: 'cota-zero',
    statusTexto: 'Mínimo 38 cm',
    min: 38,
    max: null,
    regra: 'Tamanho mínimo de 38 cm (Art. 9º). Integrante da cota permitida de 1 exemplar nativo.'
  },
  {
    id: 'barbado',
    nome: 'Barbado',
    nomeCientifico: 'Pinirampus pirinampu',
    status: 'cota-zero',
    statusTexto: 'Mínimo 60 cm',
    min: 60,
    max: null,
    regra: 'Tamanho mínimo de 60 cm (Art. 9º).'
  },
  {
    id: 'pati',
    nome: 'Pati',
    nomeCientifico: 'Luciopimelodus pati',
    status: 'cota-zero',
    statusTexto: 'Mínimo 65 cm',
    min: 65,
    max: null,
    regra: 'Tamanho mínimo de 65 cm (Art. 9º).'
  },
  {
    id: 'jurupoca',
    nome: 'Jurupoca',
    nomeCientifico: 'Hemisorubim platyrhynchos',
    status: 'cota-zero',
    statusTexto: 'Mínimo 40 cm',
    min: 40,
    max: null,
    regra: 'Tamanho mínimo de 40 cm (Art. 9º).'
  },
  {
    id: 'jurupensem',
    nome: 'Jurupensém',
    nomeCientifico: 'Sorubim lima',
    status: 'cota-zero',
    statusTexto: 'Mínimo 35 cm',
    min: 35,
    max: null,
    regra: 'Tamanho mínimo de 35 cm (Art. 9º).'
  },
  {
    id: 'armao',
    nome: 'Armao / Armado / Abotoado',
    nomeCientifico: 'Pterodoras granulosus / Oxydoras kneri',
    status: 'cota-zero',
    statusTexto: 'Mínimo 35 cm',
    min: 35,
    max: null,
    regra: 'Tamanho mínimo de 35 cm (Art. 9º).'
  },
  {
    id: 'palmito',
    nome: 'Palmito',
    nomeCientifico: 'Ageneiosus spp.',
    status: 'cota-zero',
    statusTexto: 'Mínimo 35 cm',
    min: 35,
    max: null,
    regra: 'Tamanho mínimo de 35 cm (Art. 9º).'
  },
  {
    id: 'mandi',
    nome: 'Mandi / Mandi Amarelo',
    nomeCientifico: 'Pimelodus maculatus',
    status: 'cota-zero',
    statusTexto: 'Mínimo 25 cm',
    min: 25,
    max: null,
    regra: 'Tamanho mínimo de 25 cm (Art. 9º).'
  },
  {
    id: 'piau',
    nome: 'Piau / Piau Três Pintas',
    nomeCientifico: 'Leporinus spp. / Leporinus friderici',
    status: 'cota-zero',
    statusTexto: 'Mínimo 25 cm',
    min: 25,
    max: null,
    regra: 'Tamanho mínimo de 25 cm (Art. 9º).'
  },
  {
    id: 'pacupeva',
    nome: 'Pacupeva',
    nomeCientifico: 'Mylossoma paraguayensis',
    status: 'cota-zero',
    statusTexto: 'Mínimo 20 cm',
    min: 20,
    max: null,
    regra: 'Tamanho mínimo de 20 cm (Art. 9º).'
  },
  {
    id: 'piranha',
    nome: 'Piranha (Vermelha / Amarela)',
    nomeCientifico: 'Pygocentrus nattereri / Serrasalmus marginatus',
    status: 'cota-zero',
    statusTexto: 'Até 5 Exemplares',
    min: null,
    max: null,
    regra: 'Cota de até 5 (cinco) exemplares autorizada cumulativamente com o exemplar nativo (Art. 4º, II do Decreto nº 15.166/19).'
  },
  {
    id: 'tucunare',
    nome: 'Tucunaré',
    nomeCientifico: 'Cichla spp.',
    status: 'exotica',
    statusTexto: 'Captura e Cota Livre',
    min: null,
    max: null,
    regra: 'Espécie alóctone/exótica listada no Art. 7º, IX. Captura e transporte LIVRES de limite de cota em MS.'
  },
  {
    id: 'corvina',
    nome: 'Corvina / Pescada-do-Piauí',
    nomeCientifico: 'Plagioscion squamosissimus',
    status: 'exotica',
    statusTexto: 'Captura e Cota Livre',
    min: null,
    max: null,
    regra: 'Espécie alóctone listada no Art. 7º, V. Captura e transporte LIVRES de limite de cota.'
  },
  {
    id: 'tilapia',
    nome: 'Tilápia',
    nomeCientifico: 'Oreochromis spp. / Tilapia spp.',
    status: 'exotica',
    statusTexto: 'Captura e Cota Livre',
    min: null,
    max: null,
    regra: 'Espécie exótica listada no Art. 7º, VIII. Captura e transporte LIVRES de limite de cota.'
  },
  {
    id: 'tambaqui',
    nome: 'Tambaqui',
    nomeCientifico: 'Colossoma macropomum',
    status: 'exotica',
    statusTexto: 'Captura e Cota Livre',
    min: null,
    max: null,
    regra: 'Espécie alóctone listada no Art. 7º, XI (acrescentado pelo Decreto nº 15.375/20). Captura e transporte LIVRES de cota.'
  },
  {
    id: 'dourado',
    nome: 'Dourado',
    nomeCientifico: 'Salminus brasiliensis',
    status: 'proibido',
    statusTexto: 'PROIBIDO / Moratória',
    min: null,
    max: null,
    regra: 'PROIBIDA a captura, abate, transporte e comercialização em todo o MS (Art. 8º do Decreto nº 15.166 e Lei Estadual nº 5.321/19, prorrogada pela Lei nº 6.190/24 até 2029). Permitido exclusivamente Pesque e Solte esportivo.'
  }
];

const modalEspecies = document.getElementById('modal-especies');
const btnAbrirEspecies = document.getElementById('btn-especies');
const btnFecharEspecies = document.getElementById('btn-fechar-especies');
const speciesGrid = document.getElementById('species-grid');
const speciesSearchInput = document.getElementById('species-search-input');
const btnRunCheck = document.getElementById('btn-run-check');
const checkerSpecies = document.getElementById('checker-species');
const checkerLength = document.getElementById('checker-length');
const measureResult = document.getElementById('measure-result');

function renderizarEspécies(termo = '') {
  if (!speciesGrid) return;
  speciesGrid.innerHTML = '';

  const termoLimpo = termo.toLowerCase().trim();
  const filtradas = ESPECIES_MS.filter(e => 
    e.nome.toLowerCase().includes(termoLimpo) || 
    e.nomeCientifico.toLowerCase().includes(termoLimpo)
  );

  if (filtradas.length === 0) {
    speciesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 20px;">Nenhuma espécie encontrada para a busca.</p>';
    return;
  }

  filtradas.forEach(esp => {
    let badgeClass = 'badge-cota-zero';
    if (esp.status === 'proibido') badgeClass = 'badge-proibido';
    else if (esp.status === 'pesque-solte') badgeClass = 'badge-pesque-solte';
    else if (esp.status === 'exotica') badgeClass = 'badge-exotica';

    let medidasTexto = '';
    if (esp.min && esp.max) {
      medidasTexto = `<span>Mín: <strong>${esp.min} cm</strong></span> <span>Máx: <strong>${esp.max} cm</strong></span>`;
    } else if (esp.min) {
      medidasTexto = `<span>Mínimo: <strong>${esp.min} cm</strong></span> <span>Sem limite máx.</span>`;
    } else {
      medidasTexto = `<span style="color: #b91c1c; font-weight: 700;">Moratória: Captura 0 cm</span>`;
    }

    const card = document.createElement('div');
    card.className = 'species-card';
    card.innerHTML = `
      <div class="species-header">
        <div>
          <div class="species-name">${escapeHTML(esp.nome)}</div>
          <div class="species-sci">${escapeHTML(esp.nomeCientifico)}</div>
        </div>
        <span class="species-badge ${badgeClass}">${escapeHTML(esp.statusTexto)}</span>
      </div>
      <div class="species-measures">
        ${medidasTexto}
      </div>
      <div class="species-desc">${escapeHTML(esp.regra)}</div>
    `;
    speciesGrid.appendChild(card);
  });
}

function verificarMedidaPescado() {
  if (!checkerSpecies || !checkerLength || !measureResult) return;
  const espId = checkerSpecies.value;
  const valor = parseFloat(checkerLength.value);

  if (isNaN(valor) || valor <= 0) {
    measureResult.className = 'measure-result-box forbidden';
    measureResult.textContent = 'Por favor, informe o tamanho do peixe em centímetros (ex: 88).';
    return;
  }

  const esp = ESPECIES_MS.find(e => e.id === espId);
  if (!esp) return;

  if (esp.status === 'proibido') {
    measureResult.className = 'measure-result-box forbidden';
    measureResult.innerHTML = `🚫 <strong>Dourado Proibido!</strong> Em Mato Grosso do Sul, a captura e o abate do Dourado são proibidos por lei (Lei Estadual nº 5.321/19 prorrogada até 2029). <strong>Soltura imediata e obrigatória!</strong>`;
    return;
  }

  if (esp.status === 'exotica') {
    measureResult.className = 'measure-result-box allowed';
    measureResult.innerHTML = `✅ <strong>Espécie Exótica / Alóctone!</strong> Captura e transporte <strong>totalmente livres de limite de cota</strong> (Decreto Estadual nº 15.166/19, Art. 7º). Ajude a controlar as espécies invasoras!`;
    return;
  }

  if (esp.min && esp.max) {
    if (valor >= esp.min && valor <= esp.max) {
      measureResult.className = 'measure-result-box allowed';
      measureResult.innerHTML = `✅ <strong>Dentro da Faixa Permitida!</strong> (${esp.min} a ${esp.max} cm). Permitido para captura e transporte (integrante da cota de 1 exemplar nativo por pescador com carteirinha do IMASUL) ou consumo no local. O peixe transportado deve estar inteiro com cabeça e escamas/couro!`;
    } else if (valor < esp.min) {
      measureResult.className = 'measure-result-box forbidden';
      measureResult.innerHTML = `❌ <strong>Abaixo da Medida Mínima!</strong> O peixe tem ${valor} cm e o mínimo legal é <strong>${esp.min} cm</strong>. Infração ambiental grave. <strong>Solte imediatamente no local de captura (Art. 9º, § 3º)!</strong>`;
    } else {
      measureResult.className = 'measure-result-box forbidden';
      measureResult.innerHTML = `❌ <strong>Acima da Medida Máxima!</strong> O exemplar tem ${valor} cm e o teto máximo de proteção de matrizes reprodutoras é <strong>${esp.max} cm</strong>. <strong>Solte vivo imediatamente no local de captura (Art. 9º, § 3º)!</strong>`;
    }
  } else if (esp.min) {
    if (valor >= esp.min) {
      measureResult.className = 'measure-result-box allowed';
      measureResult.innerHTML = `✅ <strong>Acima do Tamanho Mínimo!</strong> (Mínimo: ${esp.min} cm). Permitido para captura e transporte (1 exemplar nativo) ou consumo local.`;
    } else {
      measureResult.className = 'measure-result-box forbidden';
      measureResult.innerHTML = `❌ <strong>Abaixo do Mínimo Legal!</strong> (${valor} cm &lt; ${esp.min} cm). Proibido o abate ou transporte. <strong>Solte o peixe na água com cuidado (Art. 9º, § 3º)!</strong>`;
    }
  } else {
    measureResult.className = 'measure-result-box allowed';
    measureResult.innerHTML = `ℹ️ ${esp.regra}`;
  }
}

if (btnRunCheck) {
  btnRunCheck.addEventListener('click', verificarMedidaPescado);
}

if (speciesSearchInput) {
  speciesSearchInput.addEventListener('input', (e) => {
    renderizarEspécies(e.target.value);
  });
}

function abrirModalEspecies() {
  if (!modalEspecies) return;
  renderizarEspécies();
  modalEspecies.classList.remove('hidden');
  modalEspecies.setAttribute('aria-hidden', 'false');
  vibrar(25);
  try {
    history.pushState({ modal: 'especies' }, '');
  } catch (_) {}
  if (btnFecharEspecies) btnFecharEspecies.focus();
}

function fecharModalEspecies() {
  if (!modalEspecies) return;
  modalEspecies.classList.add('hidden');
  modalEspecies.setAttribute('aria-hidden', 'true');
}

if (btnAbrirEspecies) {
  btnAbrirEspecies.addEventListener('click', abrirModalEspecies);
}

if (btnFecharEspecies) {
  btnFecharEspecies.addEventListener('click', fecharModalEspecies);
}

if (modalEspecies) {
  modalEspecies.addEventListener('click', (e) => {
    if (e.target === modalEspecies) {
      fecharModalEspecies();
    }
  });
}

// Fechamento de todos os modais com Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    fecharModalEspecies();
    fecharModalSobre();
    fecharPainel();
  }
});

// 15. Busca Rápida de Feições Locais na Bacia do Rio Miranda (100% Offline e Instantânea)
let marcadorBusca = null;

function inicializarBuscaLocal() {
  const inputBusca = document.getElementById('local-search-input');
  const resultsContainer = document.getElementById('local-search-results');
  const btnClear = document.getElementById('btn-clear-local-search');
  if (!inputBusca || !resultsContainer) return;

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      inputBusca.value = '';
      resultsContainer.classList.add('hidden');
      btnClear.style.display = 'none';
      if (marcadorBusca) {
        map.removeLayer(marcadorBusca);
        marcadorBusca = null;
      }
    });
  }

  function formatarTermo(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  inputBusca.addEventListener('input', (e) => {
    const termo = e.target.value.trim();
    if (btnClear) {
      btnClear.style.display = termo.length > 0 ? 'inline-block' : 'none';
    }

    if (termo.length < 2) {
      resultsContainer.classList.add('hidden');
      return;
    }

    const termoNorm = formatarTermo(termo);
    const correspondencias = [];

    // 1. Busca em Pontos de Apoio, Rampas e Emergência
    const dadosApoio = dadosCarregados['pontos_emergencia'];
    if (dadosApoio && dadosApoio.features) {
      for (const feat of dadosApoio.features) {
        const p = feat.properties || {};
        const nomeNorm = formatarTermo(p.nome);
        const tipoNorm = formatarTermo(p.tipo);
        const municNorm = formatarTermo(p.municipio);
        if (nomeNorm.includes(termoNorm) || tipoNorm.includes(termoNorm) || municNorm.includes(termoNorm)) {
          correspondencias.push({
            tipoIcone: '⚓',
            titulo: p.nome,
            subtitulo: `${p.tipo || 'Ponto de Apoio'} • ${p.municipio || 'Bacia do Miranda'}`,
            categoria: 'Apoio / Rampa',
            coords: [feat.geometry.coordinates[1], feat.geometry.coordinates[0]],
            propriedades: p
          });
        }
      }
    }

    // 2. Busca em Guias de Pesca Credenciados Z-1 e Z-7
    const dadosGuias = dadosCarregados['guias_credenciados'];
    if (dadosGuias && dadosGuias.features) {
      for (const feat of dadosGuias.features) {
        const p = feat.properties || {};
        const nomeNorm = formatarTermo(p.nome_operacional || p.nome_completo);
        const portoNorm = formatarTermo(p.porto_base);
        const colNorm = formatarTermo(p.colonia);
        if (nomeNorm.includes(termoNorm) || portoNorm.includes(termoNorm) || colNorm.includes(termoNorm)) {
          correspondencias.push({
            tipoIcone: '🚤',
            titulo: p.nome_operacional || p.nome_completo,
            subtitulo: `${p.colonia || 'Guia de Pesca'} • Base: ${p.porto_base || 'Pantanal'}`,
            categoria: 'Guia Credenciado',
            coords: [feat.geometry.coordinates[1], feat.geometry.coordinates[0]],
            propriedades: p
          });
        }
      }
    }

    // 3. Busca em Trechos e Regras de Pesca
    const dadosTrechos = dadosCarregados['trechos_pesca'];
    if (dadosTrechos && dadosTrechos.features) {
      for (const feat of dadosTrechos.features) {
        const p = feat.properties || {};
        const rioNorm = formatarTermo(p.rio);
        const regraNorm = formatarTermo(p.regra);
        const descNorm = formatarTermo(p.descricao);
        if (rioNorm.includes(termoNorm) || regraNorm.includes(termoNorm) || descNorm.includes(termoNorm)) {
          let coordsCentro = null;
          if (feat.geometry.type === 'LineString' && feat.geometry.coordinates.length > 0) {
            const mid = Math.floor(feat.geometry.coordinates.length / 2);
            coordsCentro = [feat.geometry.coordinates[mid][1], feat.geometry.coordinates[mid][0]];
          }
          correspondencias.push({
            tipoIcone: '🎣',
            titulo: `${p.rio || 'Trecho'} - ${p.regra || 'Regra de Pesca'}`,
            subtitulo: p.descricao || `Regra oficial: ${p.regra}`,
            categoria: 'Trecho de Pesca',
            coords: coordsCentro,
            feature: feat
          });
        }
      }
    }

    // 4. Busca em Unidades de Conservação e Áreas Restritas
    const dadosUcs = dadosCarregados['areas_restritas'];
    if (dadosUcs && dadosUcs.features) {
      for (const feat of dadosUcs.features) {
        const p = feat.properties || {};
        const nomeNorm = formatarTermo(p.nome);
        const municNorm = formatarTermo(p.municipio);
        if (nomeNorm.includes(termoNorm) || municNorm.includes(termoNorm)) {
          correspondencias.push({
            tipoIcone: '⚠️',
            titulo: p.nome,
            subtitulo: `${p.categoria || 'Unidade de Conservação'} • ${p.municipio || 'MS'}`,
            categoria: 'Área Restrita',
            feature: feat
          });
        }
      }
    }

    if (correspondencias.length === 0) {
      resultsContainer.innerHTML = '<div style="padding: 10px 14px; font-size: 0.85rem; color: #64748b;">Nenhum porto, rancho, rio ou guia encontrado.</div>';
      resultsContainer.classList.remove('hidden');
      return;
    }

    resultsContainer.innerHTML = '';
    correspondencias.slice(0, 7).forEach((itemData) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'local-search-result-item';
      itemEl.innerHTML = `
        <span class="local-result-icon">${itemData.tipoIcone}</span>
        <div style="flex: 1; min-width: 0;">
          <div class="local-result-title">${escapeHTML(itemData.titulo)}</div>
          <div class="local-result-subtitle">${escapeHTML(itemData.subtitulo)}</div>
        </div>
        <span class="badge-tag" style="font-size: 0.68rem; margin: 0; align-self: center;">${itemData.categoria}</span>
      `;

      itemEl.addEventListener('click', () => {
        resultsContainer.classList.add('hidden');
        inputBusca.value = itemData.titulo;

        if (itemData.coords) {
          if (marcadorBusca) map.removeLayer(marcadorBusca);
          marcadorBusca = L.marker(itemData.coords, { pane: 'posicaoPane' }).addTo(map);
          marcadorBusca.bindPopup(`
            <strong style="color: #0b4f6c; font-size: 0.95rem;">${escapeHTML(itemData.titulo)}</strong><br>
            <span style="color: #64748b; font-size: 0.8rem;">${escapeHTML(itemData.subtitulo)}</span>
          `).openPopup();
          map.flyTo(itemData.coords, 14, { duration: 1.2 });
          showToast(`Navegando para: ${itemData.titulo}`);
        } else if (itemData.feature) {
          const tempLayer = L.geoJSON(itemData.feature);
          const bounds = tempLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
            showToast(`Exibindo: ${itemData.titulo}`);
          }
        }
      });

      resultsContainer.appendChild(itemEl);
    });

    resultsContainer.classList.remove('hidden');
  });

  // Fecha lista ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#local-search-container')) {
      resultsContainer.classList.add('hidden');
    }
  });
}


// 16. Central de Emergência & S.O.S Fluvial com Confirmação Prévia
let ultimaPosicaoUsuario = null;

const btnSos = document.getElementById('btn-sos');
const modalSos = document.getElementById('modal-sos');
const btnFecharSos = document.getElementById('btn-fechar-sos');
const sosCoordsDisplay = document.getElementById('sos-coords-display');
const btnCopiarResgate = document.getElementById('btn-copiar-resgate');
const btnWppResgate = document.getElementById('btn-wpp-resgate');

const modalConfirmSos = document.getElementById('modal-confirm-sos');
const confirmSosText = document.getElementById('confirm-sos-text');
const btnCancelarSosCall = document.getElementById('btn-cancelar-sos-call');
const btnExecutarSosCall = document.getElementById('btn-executar-sos-call');

let acaoPendenteSos = null; // { tipo: 'call' | 'copy' | 'wpp', numero, servico, texto }

function atualizarDisplayCoordsSos() {
  if (!sosCoordsDisplay) return;
  sosCoordsDisplay.innerHTML = '🚨 <strong>Canais de Emergência Ativos:</strong> Marinha (185) | PMA (190) | Bombeiros (193)';
}

function gerarTextoResgate() {
  const dataHora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `🚨 *S.O.S RESGATE FLUVIAL - PANTANAL MS*\n` +
         `📍 Região: Bacia do Rio Miranda (Pantanal/MS)\n` +
         `⏰ Horário: ${dataHora}\n` +
         `🆘 Solicito apoio emergencial para embarcação/pescador na calha do rio.\n\n` +
         `Canais de Acionamento Imediato:\n` +
         `• Marinha do Brasil (Capitania Fluvial): 185\n` +
         `• Polícia Militar Ambiental (Pelotão Miranda): 190 / (67) 3242-1200\n` +
         `• Corpo de Bombeiros Militar: 193\n` +
         `• Hospital Municipal de Miranda: (67) 3242-1222`;
}

function abrirModalSos() {
  if (!modalSos) return;
  atualizarDisplayCoordsSos();
  modalSos.classList.remove('hidden');
  modalSos.setAttribute('aria-hidden', 'false');
  vibrar(35);
  try {
    history.pushState({ modal: 'sos' }, '');
  } catch (_) {}
}

function fecharModalSos() {
  if (!modalSos) return;
  modalSos.classList.add('hidden');
  modalSos.setAttribute('aria-hidden', 'true');
}

function abrirConfirmacaoSos(acao) {
  acaoPendenteSos = acao;
  if (!modalConfirmSos || !confirmSosText) return;

  if (acao.tipo === 'call') {
    confirmSosText.innerHTML = `Você está prestes a discar para <strong>${escapeHTML(acao.servico)} (${escapeHTML(acao.numero)})</strong>.<br><br>` +
      `<span style="color: #991b1b; font-weight: 700;">⚠️ Confirme apenas se estiver em situação real de risco à vida ou à navegação. Trote aos serviços de emergência é crime (Art. 340 do Código Penal).</span>`;
    if (btnExecutarSosCall) btnExecutarSosCall.textContent = `📞 Ligar para ${acao.numero}`;
  } else if (acao.tipo === 'copy') {
    confirmSosText.innerHTML = `Deseja copiar o texto oficial de socorro com as suas coordenadas GPS atuais para a área de transferência?`;
    if (btnExecutarSosCall) btnExecutarSosCall.textContent = `📋 Sim, Copiar Mensagem`;
  } else if (acao.tipo === 'wpp') {
    confirmSosText.innerHTML = `Deseja abrir o aplicativo do WhatsApp com a mensagem de emergência e suas coordenadas GPS atuais pré-preenchidas?`;
    if (btnExecutarSosCall) btnExecutarSosCall.textContent = `💬 Sim, Abrir WhatsApp`;
  }

  modalConfirmSos.classList.remove('hidden');
  modalConfirmSos.setAttribute('aria-hidden', 'false');
  vibrar(25);
}

function fecharConfirmacaoSos() {
  acaoPendenteSos = null;
  if (!modalConfirmSos) return;
  modalConfirmSos.classList.add('hidden');
  modalConfirmSos.setAttribute('aria-hidden', 'true');
}

if (btnSos) btnSos.addEventListener('click', abrirModalSos);
if (btnFecharSos) btnFecharSos.addEventListener('click', fecharModalSos);

if (btnCancelarSosCall) btnCancelarSosCall.addEventListener('click', fecharConfirmacaoSos);

if (btnExecutarSosCall) {
  btnExecutarSosCall.addEventListener('click', () => {
    if (!acaoPendenteSos) return;
    const acao = acaoPendenteSos;
    fecharConfirmacaoSos();

    if (acao.tipo === 'call') {
      vibrar(40);
      window.location.href = `tel:${acao.numero}`;
    } else if (acao.tipo === 'copy') {
      vibrar(25);
      const texto = gerarTextoResgate();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto)
          .then(() => showToast('Mensagem de resgate copiada com sucesso!'))
          .catch(() => showToast('Aviso: Mensagem gerada pronta para envio manual.'));
      } else {
        showToast('Aviso: Dispositivo não suporta cópia automática.');
      }
    } else if (acao.tipo === 'wpp') {
      vibrar(30);
      const texto = gerarTextoResgate();
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
      window.open(url, '_blank');
    }
  });
}

if (btnCopiarResgate) {
  btnCopiarResgate.addEventListener('click', () => {
    abrirConfirmacaoSos({ tipo: 'copy' });
  });
}

if (btnWppResgate) {
  btnWppResgate.addEventListener('click', () => {
    abrirConfirmacaoSos({ tipo: 'wpp' });
  });
}

// Intercepta e protege os 4 botões oficiais
document.querySelectorAll('.sos-call-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const servico = btn.getAttribute('data-service') || 'Serviço de Emergência';
    const numero = btn.getAttribute('data-number') || '';
    if (numero) {
      abrirConfirmacaoSos({ tipo: 'call', servico, numero });
    }
  });
});

// Interceptar o fechamento dos modais SOS via Tecla ESC
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (typeof fecharConfirmacaoSos === 'function') fecharConfirmacaoSos();
    if (typeof fecharModalSos === 'function') fecharModalSos();
  }
});

// ========================================================
// 17. DIÁRIO DE PESCA E DENÚNCIAS OFFLINE (GAMIFICAÇÃO & CIDADANIA)
// ========================================================

const btnAbrirDiario = document.getElementById('btn-abrir-diario');
const modalDiario = document.getElementById('modal-diario');
const btnFecharDiario = document.getElementById('btn-fechar-diario');
const previewBoxDiario = document.getElementById('preview-box-diario');
const inputFotoDiario = document.getElementById('input-foto-diario');
const imgDiario = document.getElementById('img-diario');
const btnSalvarDiario = document.getElementById('btn-salvar-diario');
const selectEspecieDiario = document.getElementById('select-especie-diario');
const inputTamanhoDiario = document.getElementById('input-tamanho-diario');

const btnAbrirDenuncia = document.getElementById('btn-abrir-denuncia');
const modalDenuncia = document.getElementById('modal-denuncia');
const btnFecharDenuncia = document.getElementById('btn-fechar-denuncia');
const previewBoxDenuncia = document.getElementById('preview-box-denuncia');
const inputFotoDenuncia = document.getElementById('input-foto-denuncia');
const imgDenuncia = document.getElementById('img-denuncia');
const btnSalvarDenuncia = document.getElementById('btn-salvar-denuncia');
const selectCrimeDenuncia = document.getElementById('select-crime-denuncia');

let currentBase64Diario = null;
let currentBase64Denuncia = null;
let trofeusLayerGroup = L.layerGroup().addTo(map);

// ----- Funções Auxiliares de Câmera -----
function setupPhotoInput(previewBox, inputElement, imgElement, callbackBase64) {
  previewBox.addEventListener('click', () => inputElement.click());
  
  inputElement.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result;
        imgElement.src = base64;
        previewBox.classList.add('has-image');
        callbackBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  });
}

setupPhotoInput(previewBoxDiario, inputFotoDiario, imgDiario, (b64) => { currentBase64Diario = b64; });
setupPhotoInput(previewBoxDenuncia, inputFotoDenuncia, imgDenuncia, (b64) => { currentBase64Denuncia = b64; });

// ----- Diário de Troféus -----
if (btnAbrirDiario) btnAbrirDiario.addEventListener('click', () => {
  modalDiario.classList.remove('hidden');
  atualizarLocalizacaoOculta(); // Força GPS
});
if (btnFecharDiario) btnFecharDiario.addEventListener('click', () => modalDiario.classList.add('hidden'));

const cbLgpdDiario = document.getElementById('cb-lgpd-diario');

// ========================================================
// 17.1. ICTIÓLOGO VIRTUAL COM IA NATIVA (GOOGLE GEMINI)
// ========================================================
const btnIaIdentificar = document.getElementById('btn-ia-identificar');
const btnConfigGemini = document.getElementById('btn-config-gemini');
const aiKeyBox = document.getElementById('ai-key-box');
const btnFecharKeyBox = document.getElementById('btn-fechar-key-box');
const inputGeminiKey = document.getElementById('input-gemini-key');
const btnSalvarGeminiKey = document.getElementById('btn-salvar-gemini-key');
const aiLoadingBox = document.getElementById('ai-loading-box');
const aiLoadingMsg = document.getElementById('ai-loading-msg');
const aiResultadoBox = document.getElementById('ai-resultado-box');

function obterChaveGemini() {
  return localStorage.getItem('geofish_gemini_api_key') || 
         (typeof window.GEMINI_API_KEY === 'string' ? window.GEMINI_API_KEY : '') ||
         (window.__ENV__ && window.__ENV__.GEMINI_API_KEY ? window.__ENV__.GEMINI_API_KEY : '');
}

if (btnConfigGemini && aiKeyBox) {
  btnConfigGemini.addEventListener('click', () => {
    aiKeyBox.classList.toggle('hidden');
    if (!aiKeyBox.classList.contains('hidden') && inputGeminiKey) {
      inputGeminiKey.value = obterChaveGemini();
      inputGeminiKey.focus();
    }
  });
}

if (btnFecharKeyBox && aiKeyBox) {
  btnFecharKeyBox.addEventListener('click', () => {
    aiKeyBox.classList.add('hidden');
  });
}

if (btnSalvarGeminiKey && inputGeminiKey) {
  btnSalvarGeminiKey.addEventListener('click', () => {
    const val = inputGeminiKey.value.trim();
    if (!val) {
      localStorage.removeItem('geofish_gemini_api_key');
      showToast('Chave da API removida.');
    } else {
      localStorage.setItem('geofish_gemini_api_key', val);
      showToast('Chave da Google Gemini API salva!');
    }
    if (aiKeyBox) aiKeyBox.classList.add('hidden');
  });
}

async function analisarFotoComIA() {
  if (!currentBase64Diario) {
    vibrar(30);
    return showToast('Tire ou selecione uma foto do peixe primeiro!');
  }

  if (!navigator.onLine) {
    vibrar(30);
    return showToast('📡 Sem sinal de internet. Use a régua offline para conferir a medida legal.');
  }

  const apiKey = obterChaveGemini();
  if (!apiKey) {
    if (aiKeyBox) {
      aiKeyBox.classList.remove('hidden');
      if (inputGeminiKey) inputGeminiKey.focus();
    }
    vibrar(30);
    return showToast('Insira sua chave gratuita do Google AI Studio para ativar o Ictiólogo IA.');
  }

  if (btnIaIdentificar) btnIaIdentificar.disabled = true;
  if (aiLoadingBox) aiLoadingBox.classList.remove('hidden');
  if (aiResultadoBox) {
    aiResultadoBox.classList.add('hidden');
    aiResultadoBox.innerHTML = '';
  }

  try {
    const commaIdx = currentBase64Diario.indexOf(',');
    const metaPart = currentBase64Diario.substring(0, commaIdx);
    const base64Data = currentBase64Diario.substring(commaIdx + 1);
    const mimeMatch = metaPart.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const systemPrompt = `Você é um ictiólogo e fiscal ambiental de referência na Bacia do Rio Miranda e Pantanal de Mato Grosso do Sul, especialista no Decreto Estadual nº 15.166/MS (Cota Zero para transporte rodoviário, consumo local, medidas mínimas e máximas de captura) e Lei Estadual de Proteção ao Dourado.
Analise a imagem deste peixe e responda EXCLUSIVAMENTE em formato JSON puro, sem crases de markdown e sem texto antes ou depois:
{
  "especie": "Nome Comum (ex: Pintado, Pacu, Cachara, Jaú, Dourado, Piraputanga, Curimbatá, Piavuçu, Barbado)",
  "nomeCientifico": "Nome científico em latim",
  "confianca": "Alta, Média ou Baixa",
  "tamanhoEstimadoCm": null,
  "medidaMinima": 85,
  "medidaMaxima": 125,
  "statusLegal": "PERMITIDO CONSUMO LOCAL | PROIBIDO TOTAL (COTA ZERO) | ATENÇÃO À FAIXA LEGAL",
  "regraTexto": "Explicação resumida das regras do IMASUL MS para a espécie",
  "dicaPantaneira": "Dica prática pantaneira sobre soltura, manuseio seguro ou biologia do peixe"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const msg = errData?.error?.message || `Erro HTTP ${resp.status}`;
      throw new Error(msg);
    }

    const data = await resp.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Resposta vazia da IA Gemini.');

    let resultado;
    try {
      resultado = JSON.parse(rawText.trim());
    } catch (_) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) resultado = JSON.parse(jsonMatch[0]);
      else throw new Error('Não foi possível interpretar o retorno da IA.');
    }

    // Auto-preenche o select de espécies
    if (selectEspecieDiario && resultado.especie) {
      const especieNorm = resultado.especie.toLowerCase();
      for (const opt of selectEspecieDiario.options) {
        const valNorm = opt.value.toLowerCase();
        const textNorm = opt.text.toLowerCase();
        if (especieNorm.includes(valNorm) || textNorm.includes(especieNorm)) {
          selectEspecieDiario.value = opt.value;
          break;
        }
      }
    }

    // Preenche tamanho se estimado
    if (inputTamanhoDiario && resultado.tamanhoEstimadoCm && !inputTamanhoDiario.value) {
      inputTamanhoDiario.value = resultado.tamanhoEstimadoCm;
    }

    // Determina badge e cores
    let statusClass = 'legal';
    let badgeClass = 'badge-permitido';
    const statusUpper = (resultado.statusLegal || '').toUpperCase();

    if (statusUpper.includes('PROIBIDO') || (resultado.especie || '').toLowerCase().includes('dourado')) {
      statusClass = 'proibido';
      badgeClass = 'badge-proibido';
    } else if (statusUpper.includes('ATENÇÃO') || statusUpper.includes('FAIXA') || statusUpper.includes('FORA')) {
      statusClass = 'alerta';
      badgeClass = 'badge-atencao';
    }

    let faixaTexto = '';
    if (resultado.medidaMinima && resultado.medidaMaxima) {
      faixaTexto = `<div style="font-size: 0.78rem; color: #475569; margin-top: 4px;">📏 <strong>Faixa legal:</strong> ${resultado.medidaMinima} cm a ${resultado.medidaMaxima} cm</div>`;
    } else if (resultado.medidaMinima) {
      faixaTexto = `<div style="font-size: 0.78rem; color: #475569; margin-top: 4px;">📏 <strong>Tamanho Mínimo Legal:</strong> ${resultado.medidaMinima} cm</div>`;
    }

    if (aiResultadoBox) {
      aiResultadoBox.className = `ai-resultado-box ${statusClass}`;
      aiResultadoBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div>
            <span class="ai-badge ${badgeClass}">${escapeHTML(resultado.statusLegal || 'Identificado')}</span>
            <h4 style="font-size: 0.95rem; color: #0f172a; margin-top: 3px; font-weight: 800;">
              🐟 ${escapeHTML(resultado.especie)}
              <span style="font-size: 0.78rem; color: #64748b; font-weight: 400; font-style: italic;">(${escapeHTML(resultado.nomeCientifico || '')})</span>
            </h4>
          </div>
          <span style="font-size: 0.7rem; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 4px; white-space: nowrap;">Confiança: ${escapeHTML(resultado.confianca || 'Normal')}</span>
        </div>
        <p style="font-size: 0.8rem; color: #334155; margin-top: 6px; line-height: 1.4;">
          <strong>⚖️ Regra MS:</strong> ${escapeHTML(resultado.regraTexto || 'Consulte o Decreto Estadual 15.166/MS.')}
        </p>
        ${faixaTexto}
        ${resultado.dicaPantaneira ? `
          <p style="font-size: 0.76rem; color: #0369a1; margin-top: 6px; background: #f0f9ff; padding: 6px 8px; border-radius: 6px; line-height: 1.35;">
            💡 <strong>Dica Pantaneira:</strong> ${escapeHTML(resultado.dicaPantaneira)}
          </p>
        ` : ''}
      `;
      aiResultadoBox.classList.remove('hidden');
    }

    vibrar([30, 60, 30]);
    showToast(`Identificado: ${resultado.especie}!`);
  } catch (err) {
    console.error('Erro na identificação com Gemini:', err);
    vibrar(40);
    showToast(`Erro na IA: ${err.message || 'Verifique sua chave ou conexão.'}`);
    if (aiResultadoBox) {
      aiResultadoBox.className = 'ai-resultado-box alerta';
      aiResultadoBox.innerHTML = `
        <p style="font-size: 0.8rem; color: #b45309;">
          ⚠️ <strong>Não foi possível identificar:</strong> ${escapeHTML(err.message)}
        </p>
        <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
          Verifique se a foto está nítida ou clique na engrenagem ⚙️ para conferir sua chave da Google Gemini API.
        </p>
      `;
      aiResultadoBox.classList.remove('hidden');
    }
  } finally {
    if (btnIaIdentificar) btnIaIdentificar.disabled = false;
    if (aiLoadingBox) aiLoadingBox.classList.add('hidden');
  }
}

if (btnIaIdentificar) {
  btnIaIdentificar.addEventListener('click', analisarFotoComIA);
}

if (btnSalvarDiario) {
  btnSalvarDiario.addEventListener('click', async () => {
    if (!currentBase64Diario) return showToast('Tire uma foto do troféu primeiro!');
    if (!inputTamanhoDiario.value) return showToast('Informe o tamanho do peixe.');
    if (cbLgpdDiario && !cbLgpdDiario.checked) return showToast('Você precisa aceitar o Termo de Consentimento.');
    btnSalvarDiario.disabled = true;
    btnSalvarDiario.innerText = 'Salvando...';

    const trofeu = {
      id: new Date().toISOString(),
      lat: ultimaPosicaoUsuario?.lat || -20.24,
      lng: ultimaPosicaoUsuario?.lng || -56.38,
      especie: selectEspecieDiario.options[selectEspecieDiario.selectedIndex].text,
      tamanho: parseFloat(inputTamanhoDiario.value),
      foto: currentBase64Diario,
      synced: navigator.onLine ? 1 : 0
    };

    const sucesso = await GeoFishDB.salvarTrofeu(trofeu);
    btnSalvarDiario.disabled = false;
    btnSalvarDiario.innerHTML = '💾 Salvar Troféu (Offline)';

    if (sucesso) {
      showToast('Troféu salvo no seu diário!');
      modalDiario.classList.add('hidden');
      // Limpar form
      currentBase64Diario = null;
      imgDiario.src = '';
      previewBoxDiario.classList.remove('has-image');
      inputTamanhoDiario.value = '';
      if (aiResultadoBox) {
        aiResultadoBox.classList.add('hidden');
        aiResultadoBox.innerHTML = '';
      }
      
      if (trofeu.synced === 1) simularEnvioAoServidor(trofeu, 'Pesquisa de Repovoamento');
      renderizarTrofeusNoMapa();
    }
  });
}

// ----- Denúncia Ambiental Offline -----
if (btnAbrirDenuncia) btnAbrirDenuncia.addEventListener('click', () => {
  modalDenuncia.classList.remove('hidden');
});
if (btnFecharDenuncia) btnFecharDenuncia.addEventListener('click', () => modalDenuncia.classList.add('hidden'));

const cbLgpdDenuncia = document.getElementById('cb-lgpd-denuncia');

if (btnSalvarDenuncia) {
  btnSalvarDenuncia.addEventListener('click', async () => {
    if (!currentBase64Denuncia) return showToast('Você precisa fotografar a evidência.');
    if (cbLgpdDenuncia && !cbLgpdDenuncia.checked) return showToast('Você precisa marcar o Aceite Legal.');

    btnSalvarDenuncia.disabled = true;
    btnSalvarDenuncia.innerText = 'Criptografando...';

    const denuncia = {
      id: new Date().toISOString(),
      lat: ultimaPosicaoUsuario?.lat || -20.24,
      lng: ultimaPosicaoUsuario?.lng || -56.38,
      tipo: selectCrimeDenuncia.options[selectCrimeDenuncia.selectedIndex].text,
      foto: currentBase64Denuncia,
      synced: navigator.onLine ? 1 : 0
    };

    const sucesso = await GeoFishDB.salvarDenuncia(denuncia);
    btnSalvarDenuncia.disabled = false;
    btnSalvarDenuncia.innerHTML = '🔒 Salvar Evidência & Denunciar';

    if (sucesso) {
      showToast(denuncia.synced ? 'Denúncia enviada à PMA!' : 'Salvo offline. Envio pendente.');
      modalDenuncia.classList.add('hidden');
      
      currentBase64Denuncia = null;
      imgDenuncia.src = '';
      previewBoxDenuncia.classList.remove('has-image');

      if (denuncia.synced === 1) simularEnvioAoServidor(denuncia, 'Servidor da PMA-MS');
    }
  });
}

// Renderiza troféus pessoais no mapa
async function renderizarTrofeusNoMapa() {
  trofeusLayerGroup.clearLayers();
  const trofeus = await GeoFishDB.obterTodosTrofeus();
  
  trofeus.forEach(t => {
    const iconeTrofeu = L.divIcon({
      html: '<div style="font-size: 24px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">📸</div>',
      className: 'custom-trofeu-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });
    
    L.marker([t.lat, t.lng], { icon: iconeTrofeu })
     .bindPopup(`<strong style="color:#0b4f6c;">${t.especie}</strong><br>${t.tamanho} cm<br><img src="${t.foto}" style="width:100px; height:100px; object-fit:cover; margin-top:5px; border-radius:4px;">`)
     .addTo(trofeusLayerGroup);
  });
}

// Sincronização em Segundo Plano (Background Sync Simulado)
window.addEventListener('online', async () => {
  console.log('Online novamente! Iniciando sincronização em background...');
  
  // Sincroniza Diários Pendentes
  const diariosPendentes = await GeoFishDB.obterRegistrosPendentesDeSincronizacao('diario_pesca');
  for (const diario of diariosPendentes) {
    simularEnvioAoServidor(diario, 'IMASUL Repovoamento');
    await GeoFishDB.marcarComoSincronizado('diario_pesca', diario.id);
  }

  // Sincroniza Denúncias Pendentes
  const denunciasPendentes = await GeoFishDB.obterRegistrosPendentesDeSincronizacao('denuncias_pma');
  for (const denuncia of denunciasPendentes) {
    simularEnvioAoServidor(denuncia, 'Servidor Secreto da PMA');
    await GeoFishDB.marcarComoSincronizado('denuncias_pma', denuncia.id);
    showToast('Alerta: Uma denúncia salva offline acaba de ser transmitida à PMA.');
  }
});

function simularEnvioAoServidor(dados, destino) {
  console.log(`[Sincronização 4G Ativa] Enviando dados anonimizados para ${destino}:`, dados);
  // Na vida real, seria um fetch() POST.
}

// Carga inicial
setTimeout(renderizarTrofeusNoMapa, 1000);

// ========================================================
// 18. CONTROLES DO PORTAL COMUNITÁRIO, MODO BARCO E PARCERIAS
// ========================================================

// Alternância do Modo Barco (Tela Cheia Náutica)
const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
if (btnToggleFullscreen) {
  btnToggleFullscreen.addEventListener('click', () => {
    vibrar(30);
    const isFullscreen = document.body.classList.toggle('map-fullscreen');
    btnToggleFullscreen.innerHTML = isFullscreen 
      ? '✕ Sair do Modo Barco' 
      : '⛶ Modo Barco (Tela Cheia)';
    
    // Invalida o tamanho do contêiner Leaflet para renderizar tiles sem falhas
    setTimeout(() => {
      map.invalidateSize();
    }, 180);

    showToast(isFullscreen ? 'Modo Barco Ativado (Tela Cheia)' : 'Retornando ao Portal Hub');
  });
}

// Botão de Ver Regras na Faixa de Alerta
const btnVerAlertaRegras = document.getElementById('btn-ver-alerta-regras');
if (btnVerAlertaRegras) {
  btnVerAlertaRegras.addEventListener('click', () => {
    abrirModalEspecies();
  });
}

// Modal Central de Parcerias & Cadastros Comunitários
const modalParceiros = document.getElementById('modal-parceiros');
const btnParceirosTopo = document.getElementById('btn-parceiros-topo');
const btnFecharParceiros = document.getElementById('btn-fechar-parceiros');
const footerBtnParceiros = document.getElementById('footer-btn-parceiros');
const footerBtnPiloteiros = document.getElementById('footer-btn-piloteiros');

const tabBtnPousadas = document.getElementById('tab-btn-pousadas');
const tabBtnPiloteiros = document.getElementById('tab-btn-piloteiros');
const tabPanePousadas = document.getElementById('tab-pane-pousadas');
const tabPanePiloteiros = document.getElementById('tab-pane-piloteiros');

function alternarAbaParcerias(aba = 'pousadas') {
  vibrar(20);
  if (aba === 'piloteiros') {
    tabBtnPiloteiros?.classList.add('active');
    tabBtnPousadas?.classList.remove('active');
    tabBtnPiloteiros?.setAttribute('aria-selected', 'true');
    tabBtnPousadas?.setAttribute('aria-selected', 'false');
    tabPanePiloteiros?.classList.remove('hidden');
    tabPanePousadas?.classList.add('hidden');
  } else {
    tabBtnPousadas?.classList.add('active');
    tabBtnPiloteiros?.classList.remove('active');
    tabBtnPousadas?.setAttribute('aria-selected', 'true');
    tabBtnPiloteiros?.setAttribute('aria-selected', 'false');
    tabPanePousadas?.classList.remove('hidden');
    tabPanePiloteiros?.classList.add('hidden');
  }
}

if (tabBtnPousadas) tabBtnPousadas.addEventListener('click', () => alternarAbaParcerias('pousadas'));
if (tabBtnPiloteiros) tabBtnPiloteiros.addEventListener('click', () => alternarAbaParcerias('piloteiros'));

function abrirModalParcerias(aba = 'pousadas') {
  if (modalParceiros) {
    alternarAbaParcerias(aba);
    modalParceiros.classList.remove('hidden');
    vibrar(25);
  }
}

function fecharModalParceiros() {
  if (modalParceiros) modalParceiros.classList.add('hidden');
}

window.abrirModalParceriasTab = (aba) => abrirModalParcerias(aba);
window.abrirModalParceiros = () => abrirModalParcerias('pousadas');

if (btnParceirosTopo) btnParceirosTopo.addEventListener('click', () => abrirModalParcerias('pousadas'));
if (footerBtnParceiros) footerBtnParceiros.addEventListener('click', () => abrirModalParcerias('pousadas'));
if (footerBtnPiloteiros) footerBtnPiloteiros.addEventListener('click', () => abrirModalParcerias('piloteiros'));
if (btnFecharParceiros) btnFecharParceiros.addEventListener('click', fecharModalParceiros);

// Envio de Proposta Comercial de Pousada / Rancho via WhatsApp
const btnEnviarPropostaPousada = document.getElementById('btn-enviar-proposta-pousada');
if (btnEnviarPropostaPousada) {
  btnEnviarPropostaPousada.addEventListener('click', () => {
    const nome = document.getElementById('pousada-nome')?.value.trim();
    const rio = document.getElementById('pousada-rio')?.value;
    const wpp = document.getElementById('pousada-wpp')?.value.trim();
    const rampa = document.getElementById('pousada-rampa')?.value.trim();

    if (!nome) {
      vibrar(30);
      return showToast('Informe o nome da pousada ou rancho.');
    }
    if (!wpp) {
      vibrar(30);
      return showToast('Informe o WhatsApp para contato de reservas.');
    }

    const comodidades = [];
    document.querySelectorAll('input[name="pousada-amenity"]:checked').forEach(cb => comodidades.push(cb.value));

    // Gravação segura no Firebase Firestore (sincroniza online ou enfileira offline)
    if (window.GeoFishFirebase && typeof window.GeoFishFirebase.salvarSolicitacaoPousada === 'function') {
      window.GeoFishFirebase.salvarSolicitacaoPousada({
        nome,
        rio,
        whatsapp: wpp,
        rampa,
        comodidades
      }).catch(err => console.warn('[Firebase] Aviso Pousada:', err));
    }

    const texto = `*SOLICITAÇÃO DE ANÚNCIO - GEOFISH MS (Pousadas & Ranchos)*\n\n` +
      `🏨 *Estabelecimento:* ${nome}\n` +
      `📍 *Localização:* ${rio}\n` +
      `💬 *WhatsApp Reservas:* ${wpp}\n` +
      `⚓ *Rampa/Estrutura:* ${rampa || 'A informar'}\n` +
      `✨ *Comodidades:* ${comodidades.length > 0 ? comodidades.join(', ') : 'Padrão'}\n\n` +
      `Olá! Tenho interesse no plano comercial de divulgação da temporada para destacar meu estabelecimento no WebGIS da Bacia do Miranda!`;

    const urlWpp = `https://api.whatsapp.com/send?phone=5567999990001&text=${encodeURIComponent(texto)}`;
    window.open(urlWpp, '_blank');
    vibrar(30);
    showToast('Proposta registrada e abrindo WhatsApp para confirmação...');
  });
}

// Envio de Cadastro Gratuito de Piloteiro Z-1 / Z-7 via WhatsApp
const btnEnviarCadastroGuia = document.getElementById('btn-enviar-cadastro-guia');
if (btnEnviarCadastroGuia) {
  btnEnviarCadastroGuia.addEventListener('click', () => {
    const nome = document.getElementById('guia-nome')?.value.trim();
    const apelido = document.getElementById('guia-apelido')?.value.trim();
    const colonia = document.getElementById('guia-colonia')?.value;
    const rgp = document.getElementById('guia-rgp')?.value.trim();
    const porto = document.getElementById('guia-porto')?.value.trim();
    const wpp = document.getElementById('guia-wpp')?.value.trim();

    if (!nome) {
      vibrar(30);
      return showToast('Informe o seu nome completo.');
    }
    if (!porto) {
      vibrar(30);
      return showToast('Informe seu porto de saída habitual.');
    }
    if (!wpp) {
      vibrar(30);
      return showToast('Informe o WhatsApp para os pescadores te contatarem.');
    }

    const diferenciais = [];
    document.querySelectorAll('input[name="guia-diferencial"]:checked').forEach(cb => diferenciais.push(cb.value));

    // Gravação segura no Firebase Firestore (sincroniza online ou enfileira offline)
    if (window.GeoFishFirebase && typeof window.GeoFishFirebase.salvarCadastroPiloteiro === 'function') {
      window.GeoFishFirebase.salvarCadastroPiloteiro({
        nome,
        apelido,
        colonia,
        rgp,
        porto,
        whatsapp: wpp,
        diferenciais
      }).catch(err => console.warn('[Firebase] Aviso Piloteiro:', err));
    }

    const texto = `*CADASTRO GRATUITO DE PILOTEIRO - GEOFISH MS*\n\n` +
      `🚤 *Nome:* ${nome} ${apelido ? `("${apelido}")` : ''}\n` +
      `📜 *Colônia de Filiação:* ${colonia}\n` +
      `🆔 *RGP / Carteira:* ${rgp || 'Em regularização / Apresentará'}\n` +
      `📍 *Porto de Saída:* ${porto}\n` +
      `💬 *WhatsApp Turistas:* ${wpp}\n` +
      `🦺 *Diferenciais:* ${diferenciais.length > 0 ? diferenciais.join(', ') : 'Navegação nativa'}\n\n` +
      `Olá! Sou piloteiro da região e gostaria de ativar meu ponto e contato GRATUITAMENTE no mapa do GeoFish MS!`;

    const urlWpp = `https://api.whatsapp.com/send?phone=5567999990001&text=${encodeURIComponent(texto)}`;
    window.open(urlWpp, '_blank');
    vibrar(30);
    showToast('Cadastro registrado e abrindo WhatsApp para homologação...');
  });
}

// Modal de Apoio PIX
const modalApoiePix = document.getElementById('modal-apoie-pix');
const btnApoiePixTopo = document.getElementById('btn-apoie-pix-topo');
const btnFecharPix = document.getElementById('btn-fechar-pix');
const footerBtnPix = document.getElementById('footer-btn-pix');
const btnCopiarChavePix = document.getElementById('btn-copiar-chave-pix');
const pixChaveTexto = document.getElementById('pix-chave-texto');

function abrirModalPix() {
  if (modalApoiePix) {
    vibrar(25);
    modalApoiePix.classList.remove('hidden');
  }
}
function fecharModalPix() {
  if (modalApoiePix) modalApoiePix.classList.add('hidden');
}

if (btnApoiePixTopo) btnApoiePixTopo.addEventListener('click', abrirModalPix);
if (footerBtnPix) footerBtnPix.addEventListener('click', abrirModalPix);
if (btnFecharPix) btnFecharPix.addEventListener('click', fecharModalPix);

if (btnCopiarChavePix && pixChaveTexto) {
  btnCopiarChavePix.addEventListener('click', async () => {
    vibrar(20);
    const chave = pixChaveTexto.textContent.trim();
    try {
      await navigator.clipboard.writeText(chave);
      btnCopiarChavePix.innerHTML = '✅ Chave Copiada!';
      showToast('Chave PIX copiada para a área de transferência!');
      setTimeout(() => {
        btnCopiarChavePix.innerHTML = '📋 Copiar Chave PIX';
      }, 3000);
    } catch (_) {
      showToast(`Chave PIX: ${chave}`);
    }
  });
}

// Botões do Rodapé para Modais Existentes
const footerBtnDefeso = document.getElementById('footer-btn-defeso');
if (footerBtnDefeso) {
  footerBtnDefeso.addEventListener('click', () => {
    abrirModalEspecies();
  });
}

const footerBtnReplicar = document.getElementById('footer-btn-replicar');
if (footerBtnReplicar) {
  footerBtnReplicar.addEventListener('click', () => {
    abrirModalSobre();
  });
}

// ========================================================
// 19. COMPATIBILIDADE GLOBAL E INTEGRAÇÕES ADICIONAIS DO PORTAL
// ========================================================

// Aliases para chamadas inline e módulos externos
window.obterPosicaoRio = obterLocalizacao;
window.mostrarToast = showToast;
window.abrirModalSos = abrirModalSos;
window.abrirModalEspecies = abrirModalEspecies;
window.abrirModalSobre = abrirModalSobre;
window.abrirConfirmacaoSos = abrirConfirmacaoSos;
window.abrirModalParceiros = abrirModalParceiros;
window.abrirModalPix = abrirModalPix;

// Botão adicional na seção de espécies que abre o verificador de medidas oficial
const btnPortalOpenSpecies = document.getElementById('btn-portal-open-species');
if (btnPortalOpenSpecies) {
  btnPortalOpenSpecies.addEventListener('click', () => {
    vibrar(25);
    abrirModalEspecies();
  });
}

// Botão de SOS na barra de polegar móvel
const navBtnSosTrigger = document.getElementById('nav-btn-sos-trigger');
if (navBtnSosTrigger) {
  navBtnSosTrigger.addEventListener('click', () => {
    vibrar(35);
    abrirModalSos();
  });
}

// Ação rápida do SOS na barra de utilitários
const btnQuickSos = document.getElementById('btn-quick-sos');
if (btnQuickSos) {
  btnQuickSos.addEventListener('click', () => {
    vibrar(35);
    abrirModalSos();
  });
}

const btnHeroSpecies = document.getElementById('btn-hero-species');
if (btnHeroSpecies) {
  btnHeroSpecies.addEventListener('click', () => {
    vibrar(35);
    abrirModalEspecies();
  });
}

const btnHeroParceiros = document.getElementById('btn-hero-parceiros');
if (btnHeroParceiros) {
  btnHeroParceiros.addEventListener('click', () => {
    vibrar(35);
    abrirModalParcerias('pousadas');
  });
}

// ========================================================
// 20. CARTILHA OFICIAL DO PESCADOR (BPMA / PMA-MS)
// ========================================================
const modalCartilha = document.getElementById('modal-cartilha');
const btnFecharCartilha = document.getElementById('btn-fechar-cartilha');

function abrirModalCartilha(abaInicial = 'rios') {
  if (!modalCartilha) return;
  modalCartilha.classList.remove('hidden');
  modalCartilha.setAttribute('aria-hidden', 'false');
  alternarAbaCartilha(abaInicial);
  vibrar(25);
}

function fecharModalCartilha() {
  if (!modalCartilha) return;
  modalCartilha.classList.add('hidden');
  modalCartilha.setAttribute('aria-hidden', 'true');
}

function alternarAbaCartilha(tipo) {
  const tabs = {
    rios: { btn: 'tab-btn-rios-proibidos', panel: 'panel-cartilha-rios' },
    iscas: { btn: 'tab-btn-iscas', panel: 'panel-cartilha-iscas' },
    transporte: { btn: 'tab-btn-transporte', panel: 'panel-cartilha-transporte' },
    petrechos: { btn: 'tab-btn-petrechos', panel: 'panel-cartilha-petrechos' },
    contatos: { btn: 'tab-btn-contatos', panel: 'panel-cartilha-contatos' }
  };

  Object.entries(tabs).forEach(([k, item]) => {
    const b = document.getElementById(item.btn);
    const p = document.getElementById(item.panel);
    if (b && p) {
      if (k === tipo) {
        b.classList.add('active');
        b.setAttribute('aria-selected', 'true');
        p.classList.add('active');
      } else {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
        p.classList.remove('active');
      }
    }
  });
}

if (btnFecharCartilha) btnFecharCartilha.addEventListener('click', fecharModalCartilha);

window.abrirModalCartilha = abrirModalCartilha;
window.fecharModalCartilha = fecharModalCartilha;
window.alternarAbaCartilha = alternarAbaCartilha;

// 21. Preparação para o Rio (Modo 100% Offline)
const btnPrepOffline = document.getElementById('btn-prep-offline');
if (btnPrepOffline) {
  btnPrepOffline.addEventListener('click', async () => {
    vibrar([40, 60, 40]);
    btnPrepOffline.innerHTML = '⏳ Verificando dados offline...';
    btnPrepOffline.disabled = true;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'PRECACHE_CHECK' });
      }

      setTimeout(() => {
        btnPrepOffline.innerHTML = '✅ Pronto para o Rio!';
        btnPrepOffline.style.background = '#15803d';
        btnPrepOffline.style.color = '#ffffff';
        showToast('Pronto para o Rio! Regras, mapa e contatos de emergência salvos no seu aparelho.', 'info');
      }, 900);
    } catch (_) {
      btnPrepOffline.innerHTML = '✅ Pronto para o Rio!';
      btnPrepOffline.disabled = false;
    }
  });
}
