/**
 * GeoFish MS - Bacia do Rio Miranda (Mato Grosso do Sul)
 * Aplicação WebGIS PWA para Governança Territorial e Pesca Sustentável
 * Orquestrador Principal Modularizado (ES6)
 */

import {
  escapeHTML,
  sanitizeDigits,
  sanitizeTel,
  normalizeWhatsApp,
  formatPossuiRampa,
  obterCorPorRegra,
  vibrar,
  manterTelaAtiva,
  showToast
} from './modules/utils.js';

import {
  abrirModalCartilha,
  fecharModalCartilha,
  alternarAbaCartilha
} from './modules/cartilha-modal.js';

import {
  abrirModalDeTemplate,
  fecharModalAtivo
} from './modules/modal-manager.js';

import {
  ESPECIES_MS,
  renderizarEspecies,
  verificarMedidaPescado,
  abrirModalEspecies,
  fecharModalEspecies,
  initSpeciesChecker
} from './modules/species-checker.js';

import {
  gerarTextoResgate,
  abrirModalSos,
  fecharModalSos,
  abrirConfirmacaoSos,
  fecharConfirmacaoSos,
  initSosEmergency
} from './modules/sos-emergency.js';

import {
  atualizarStatusRede,
  registrarServiceWorker,
  abrirModalInstall,
  fecharModalInstall,
  initPWAOffline
} from './modules/pwa-offline.js';

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

// Atribuição de governança cartográfica e autoria cidadã
map.attributionControl.addAttribution('Iniciativa Cidadã: Peterson Martins da Costa | Cartografia Base: Fontes Públicas (SEMADESC / IMASUL)');

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

// 8. Navegação Territorial do WebGIS & GPS sob demanda (leitura única e eficiente)
let marcadorPosicao = null;
let circuloPrecisao = null;
let ultimaPosicaoUsuario = null;

export function obterLocalizacao() {
  if (!('geolocation' in navigator)) {
    showToast('Geolocalização não suportada neste dispositivo.');
    return;
  }
  showToast('Obtendo sua posição no rio...');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy;
      ultimaPosicaoUsuario = { lat, lng, precisao: acc };

      if (map) {
        if (marcadorPosicao) {
          marcadorPosicao.setLatLng([lat, lng]);
        } else {
          marcadorPosicao = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: '#22c55e',
            color: '#ffffff',
            weight: 2,
            fillOpacity: 0.95
          }).addTo(map);
        }

        if (circuloPrecisao) {
          circuloPrecisao.setLatLng([lat, lng]).setRadius(acc);
        } else {
          circuloPrecisao = L.circle([lat, lng], {
            radius: acc,
            color: '#22c55e',
            fillColor: '#86efac',
            fillOpacity: 0.15,
            weight: 1
          }).addTo(map);
        }

        marcadorPosicao.bindPopup(`<strong>Sua posição aproximada</strong><br>Precisão: ±${acc.toFixed(0)}m`).openPopup();
        map.setView([lat, lng], Math.max(map.getZoom(), 14));
      }
      showToast(`Posição obtida com sucesso (±${acc.toFixed(0)}m)`);
    },
    (err) => {
      console.warn('[GPS] Erro ao obter posição:', err.message);
      showToast('Não foi possível obter a posição GPS. Verifique se o GPS está ativo.');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

function atualizarLocalizacaoOculta() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        ultimaPosicaoUsuario = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precisao: pos.coords.accuracy
        };
      },
      () => {},
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  }
}

// 9. Modal "Sobre os Dados" e Governança Territorial (Instanciado sob demanda via <template>)
let modalSobreInstancia = null;

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
  modalSobreInstancia = abrirModalDeTemplate('template-modal-sobre', {
    modalId: 'modal-sobre',
    onMount: (modalEl) => {
      const layerStatusList = modalEl.querySelector('#layer-status-list');
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
    },
    onDestroy: () => {
      modalSobreInstancia = null;
    }
  });
}

function fecharModalSobre() {
  if (modalSobreInstancia) {
    modalSobreInstancia.destroy();
    modalSobreInstancia = null;
  }
}

const btnAbrirSobre = document.getElementById('btn-sobre');
if (btnAbrirSobre) {
  btnAbrirSobre.addEventListener('click', abrirModalSobre);
}
// 10, 11, 12. Gestão PWA & Offline delegada para o submódulo js/modules/pwa-offline.js

// Suporte ao Botão Físico/Gesto de Voltar do Android (Samsung / Motorola)
window.addEventListener('popstate', () => {
  if (bottomSheet && !bottomSheet.classList.contains('hidden')) {
    bottomSheet.classList.add('hidden');
    document.body.classList.remove('sheet-open');
    return;
  }
  const searchResults = document.getElementById('local-search-results');
  if (searchResults && !searchResults.classList.contains('hidden')) {
    searchResults.classList.add('hidden');
    return;
  }
  fecharModalAtivo();
});

// Barra de Navegação Inferior de Polegar para Android
const navBtnGuias = document.getElementById('nav-btn-guias');
const navBtnEspecies = document.getElementById('nav-btn-especies');
const navBtnRampas = document.getElementById('nav-btn-rampas');
const navBtnPousadas = document.getElementById('nav-btn-pousadas');

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
  });
}

if (navBtnPousadas) {
  navBtnPousadas.addEventListener('click', () => {
    vibrar(25);
    if (typeof abrirModalParceriasTab === 'function') {
      abrirModalParceriasTab('pousadas');
    }
  });
}

// Inicialização do aplicativo: carrega camadas, módulos auxiliares, defeso e busca
window.addEventListener('DOMContentLoaded', () => {
  initSpeciesChecker();
  initSosEmergency();
  initPWAOffline();
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

// 14. Gestão de Espécies & Medidas regulatórias delegada para js/modules/species-checker.js


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


// 16. Central de Emergência & S.O.S Fluvial delegada para js/modules/sos-emergency.js


// ========================================================
// 17. DIÁRIO DE PESCA E DENÚNCIAS OFFLINE (Instanciados sob demanda via <template>)
let currentBase64Diario = null;
let currentBase64Denuncia = null;
let trofeusLayerGroup = L.layerGroup().addTo(map);

let modalDiarioInstancia = null;
let modalDenunciaInstancia = null;

function setupPhotoInput(previewBox, inputElement, imgElement, callbackBase64) {
  if (!previewBox || !inputElement || !imgElement) return;
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

function obterChaveGemini() {
  return localStorage.getItem('geofish_gemini_api_key') || 
         (typeof window.GEMINI_API_KEY === 'string' ? window.GEMINI_API_KEY : '') ||
         (window.__ENV__ && window.__ENV__.GEMINI_API_KEY ? window.__ENV__.GEMINI_API_KEY : '');
}

async function consultarGeminiVision(base64Image, apiKey) {
  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
  const mimeTypeMatch = base64Image.match(/^data:(image\/[a-z]+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

  const prompt = `Você é um ictiólogo e biólogo sênior especialista na ictiofauna da Bacia do Rio Miranda (Pantanal de Mato Grosso do Sul).
Analise a foto deste peixe e forneça a identificação rigorosa conforme a legislação ambiental do Estado de MS (Decreto Estadual nº 15.166/2019 e Lei nº 5.321/19).
Responda EXCLUSIVAMENTE em formato JSON puro, sem markdown, no seguinte formato:
{
  "especie": "Nome Comum Principal",
  "nomeCientifico": "Gênero e espécie em latim",
  "idSugerido": "pintado | pacu | cachara | jau | dourado | piraputanga | curimbata | piavucu | barbado | outro",
  "conformidade": "Permitido com Cota (Faixa X a Y cm) | Cota Zero / Proibido Abate (Dourado) | Cota Livre (Exótica)",
  "observacoes": "Resumo biológico de 1 frase para o pescador pantaneiro."
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: cleanBase64 } }
        ]
      }],
      generationConfig: { response_mime_type: "application/json" }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erro HTTP ${response.status}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(textResponse);
}

function abrirModalDiario() {
  modalDiarioInstancia = abrirModalDeTemplate('template-modal-diario', {
    modalId: 'modal-diario',
    onMount: (modalEl, destroy) => {
      const previewBoxDiario = modalEl.querySelector('#preview-box-diario');
      const inputFotoDiario = modalEl.querySelector('#input-foto-diario');
      const imgDiario = modalEl.querySelector('#img-diario');
      const btnSalvarDiario = modalEl.querySelector('#btn-salvar-diario');
      const selectEspecieDiario = modalEl.querySelector('#select-especie-diario');
      const inputTamanhoDiario = modalEl.querySelector('#input-tamanho-diario');
      const cbLgpdDiario = modalEl.querySelector('#cb-lgpd-diario');

      const btnIaIdentificar = modalEl.querySelector('#btn-ia-identificar');
      const btnConfigGemini = modalEl.querySelector('#btn-config-gemini');
      const aiKeyBox = modalEl.querySelector('#ai-key-box');
      const btnFecharKeyBox = modalEl.querySelector('#btn-fechar-key-box');
      const inputGeminiKey = modalEl.querySelector('#input-gemini-key');
      const btnSalvarGeminiKey = modalEl.querySelector('#btn-salvar-gemini-key');
      const aiLoadingBox = modalEl.querySelector('#ai-loading-box');
      const aiResultadoBox = modalEl.querySelector('#ai-resultado-box');

      setupPhotoInput(previewBoxDiario, inputFotoDiario, imgDiario, (b64) => { currentBase64Diario = b64; });

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
        btnFecharKeyBox.addEventListener('click', () => aiKeyBox.classList.add('hidden'));
      }

      if (btnSalvarGeminiKey && inputGeminiKey && aiKeyBox) {
        btnSalvarGeminiKey.addEventListener('click', () => {
          const key = inputGeminiKey.value.trim();
          if (key) {
            localStorage.setItem('geofish_gemini_api_key', key);
            showToast('Chave Google Gemini salva com sucesso!');
            aiKeyBox.classList.add('hidden');
          } else {
            localStorage.removeItem('geofish_gemini_api_key');
            showToast('Chave removida.');
          }
        });
      }

      if (btnIaIdentificar) {
        btnIaIdentificar.addEventListener('click', async () => {
          vibrar(25);
          if (!currentBase64Diario) {
            return showToast('Tire ou escolha uma foto do peixe primeiro!');
          }
          const apiKey = obterChaveGemini();
          if (!apiKey) {
            if (aiKeyBox) aiKeyBox.classList.remove('hidden');
            return showToast('Configure sua chave gratuita do Google Gemini.');
          }
          if (aiLoadingBox) aiLoadingBox.classList.remove('hidden');
          if (aiResultadoBox) aiResultadoBox.classList.add('hidden');

          try {
            const analise = await consultarGeminiVision(currentBase64Diario, apiKey);
            if (aiLoadingBox) aiLoadingBox.classList.add('hidden');
            if (aiResultadoBox) {
              aiResultadoBox.classList.remove('hidden');
              aiResultadoBox.innerHTML = `
                <div class="ai-result-title">✨ Parecer do Ictiólogo Virtual (Gemini)</div>
                <div class="ai-result-body">
                  <strong>Espécie Sugerida:</strong> ${escapeHTML(analise.especie || 'Não identificada')}<br>
                  <strong>Nome Científico:</strong> <em>${escapeHTML(analise.nomeCientifico || '')}</em><br>
                  <strong>Situação Legal em MS:</strong> ${escapeHTML(analise.conformidade || 'Consulte o regulamento')}<br>
                  <p style="margin-top: 6px; font-size: 0.82rem; color: #334155;">${escapeHTML(analise.observacoes || '')}</p>
                </div>
              `;
            }
            if (selectEspecieDiario && analise.idSugerido) {
              selectEspecieDiario.value = analise.idSugerido;
            }
          } catch (err) {
            if (aiLoadingBox) aiLoadingBox.classList.add('hidden');
            showToast('Falha ao consultar IA: ' + (err.message || 'Verifique a chave'));
          }
        });
      }

      if (btnSalvarDiario) {
        btnSalvarDiario.addEventListener('click', async () => {
          if (!currentBase64Diario) return showToast('Você precisa fotografar o peixe.');
          if (!inputTamanhoDiario.value) return showToast('Informe o comprimento aproximado em cm.');
          if (cbLgpdDiario && !cbLgpdDiario.checked) return showToast('Você precisa aceitar o Termo de Consentimento.');

          btnSalvarDiario.disabled = true;
          btnSalvarDiario.innerText = 'Salvando...';

          const optSelected = selectEspecieDiario && selectEspecieDiario.selectedIndex >= 0
            ? selectEspecieDiario.options[selectEspecieDiario.selectedIndex]
            : null;
          const nomeEspecie = optSelected ? optSelected.text : 'Espécie não informada';

          const trofeu = {
            id: new Date().toISOString(),
            lat: (ultimaPosicaoUsuario && typeof ultimaPosicaoUsuario.lat === 'number') ? ultimaPosicaoUsuario.lat : null,
            lng: (ultimaPosicaoUsuario && typeof ultimaPosicaoUsuario.lng === 'number') ? ultimaPosicaoUsuario.lng : null,
            precisao: (ultimaPosicaoUsuario && typeof ultimaPosicaoUsuario.precisao === 'number') ? ultimaPosicaoUsuario.precisao : null,
            especie: nomeEspecie,
            tamanho: parseFloat(inputTamanhoDiario.value),
            foto: currentBase64Diario,
            local: true
          };

          const sucesso = await GeoFishDB.salvarTrofeu(trofeu);
          btnSalvarDiario.disabled = false;
          btnSalvarDiario.innerHTML = '💾 Salvar Troféu (Offline)';

          if (sucesso) {
            showToast(trofeu.lat ? 'Troféu salvo com localização GPS no seu diário de bordo!' : 'Troféu salvo no seu diário de bordo!');
            destroy();
            currentBase64Diario = null;
            renderizarTrofeusNoMapa();
          }
        });
      }

      atualizarLocalizacaoOculta();
    },
    onDestroy: () => {
      modalDiarioInstancia = null;
    }
  });
}

function fecharModalDiario() {
  if (modalDiarioInstancia) {
    modalDiarioInstancia.destroy();
    modalDiarioInstancia = null;
  }
}

function abrirModalDenuncia() {
  modalDenunciaInstancia = abrirModalDeTemplate('template-modal-denuncia', {
    modalId: 'modal-denuncia',
    onMount: (modalEl, destroy) => {
      const previewBoxDenuncia = modalEl.querySelector('#preview-box-denuncia');
      const inputFotoDenuncia = modalEl.querySelector('#input-foto-denuncia');
      const imgDenuncia = modalEl.querySelector('#img-denuncia');
      const btnSalvarDenuncia = modalEl.querySelector('#btn-salvar-denuncia');
      const selectCrimeDenuncia = modalEl.querySelector('#select-crime-denuncia');
      const cbLgpdDenuncia = modalEl.querySelector('#cb-lgpd-denuncia');

      setupPhotoInput(previewBoxDenuncia, inputFotoDenuncia, imgDenuncia, (b64) => { currentBase64Denuncia = b64; });

      if (btnSalvarDenuncia) {
        btnSalvarDenuncia.addEventListener('click', async () => {
          if (!currentBase64Denuncia) return showToast('Você precisa fotografar a evidência.');
          if (cbLgpdDenuncia && !cbLgpdDenuncia.checked) return showToast('Você precisa marcar a confirmação da evidência.');

          btnSalvarDenuncia.disabled = true;
          btnSalvarDenuncia.innerText = 'Salvando evidência no dispositivo...';

          const optCrime = selectCrimeDenuncia && selectCrimeDenuncia.selectedIndex >= 0
            ? selectCrimeDenuncia.options[selectCrimeDenuncia.selectedIndex]
            : null;
          const tipoCrime = optCrime ? optCrime.text : 'Crime não especificado';

          const denuncia = {
            id: new Date().toISOString(),
            lat: (ultimaPosicaoUsuario && typeof ultimaPosicaoUsuario.lat === 'number') ? ultimaPosicaoUsuario.lat : null,
            lng: (ultimaPosicaoUsuario && typeof ultimaPosicaoUsuario.lng === 'number') ? ultimaPosicaoUsuario.lng : null,
            precisao: (ultimaPosicaoUsuario && typeof ultimaPosicaoUsuario.precisao === 'number') ? ultimaPosicaoUsuario.precisao : null,
            tipo: tipoCrime,
            foto: currentBase64Denuncia,
            local: true
          };

          const sucesso = await GeoFishDB.salvarDenuncia(denuncia);
          btnSalvarDenuncia.disabled = false;
          btnSalvarDenuncia.innerHTML = '💾 Salvar Evidência no Dispositivo';

          if (sucesso) {
            showToast('Evidência salva com segurança na memória do seu dispositivo. Para denunciar oficialmente, ligue 190 ou Plantão PMA.');
            destroy();
            currentBase64Denuncia = null;
          }
        });
      }
    },
    onDestroy: () => {
      modalDenunciaInstancia = null;
    }
  });
}

function fecharModalDenuncia() {
  if (modalDenunciaInstancia) {
    modalDenunciaInstancia.destroy();
    modalDenunciaInstancia = null;
  }
}

const btnAbrirDiario = document.getElementById('btn-abrir-diario');
if (btnAbrirDiario) btnAbrirDiario.addEventListener('click', abrirModalDiario);

const btnAbrirDenuncia = document.getElementById('btn-abrir-denuncia');
if (btnAbrirDenuncia) btnAbrirDenuncia.addEventListener('click', abrirModalDenuncia);

// Renderiza troféus pessoais no mapa
async function renderizarTrofeusNoMapa() {
  trofeusLayerGroup.clearLayers();
  const trofeus = await GeoFishDB.obterTodosTrofeus();
  
  trofeus.forEach(t => {
    if (typeof t.lat !== 'number' || typeof t.lng !== 'number' || isNaN(t.lat) || isNaN(t.lng)) {
      return;
    }
    const iconeTrofeu = L.divIcon({
      html: '<div style="font-size: 24px; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">📸</div>',
      className: 'custom-trofeu-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });
    
    const fotoSrc = typeof t.foto === 'string' && (t.foto.startsWith('data:image/') || t.foto.startsWith('blob:') || t.foto.startsWith('https://')) ? t.foto : '';
    const imgTag = fotoSrc ? `<br><img src="${fotoSrc}" alt="Troféu" style="width:100px; height:100px; object-fit:cover; margin-top:5px; border-radius:4px;">` : '';

    L.marker([t.lat, t.lng], { icon: iconeTrofeu })
     .bindPopup(`<strong style="color:#0b4f6c;">${escapeHTML(t.especie || 'Peixe')}</strong><br>${escapeHTML(String(t.tamanho || ''))} cm${imgTag}`)
     .addTo(trofeusLayerGroup);
  });
}

// Carga inicial dos troféus locais
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

// Modal Central de Parcerias & Cadastros Comunitários (Instanciado sob demanda via <template>)
let modalParceirosInstancia = null;
let modalPixInstancia = null;

function alternarAbaParcerias(aba = 'pousadas', container = document) {
  vibrar(20);
  const tabBtnPiloteiros = container.querySelector('#tab-btn-piloteiros');
  const tabBtnPousadas = container.querySelector('#tab-btn-pousadas');
  const tabPanePiloteiros = container.querySelector('#tab-pane-piloteiros');
  const tabPanePousadas = container.querySelector('#tab-pane-pousadas');

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

function abrirModalParcerias(aba = 'pousadas') {
  modalParceirosInstancia = abrirModalDeTemplate('template-modal-parceiros', {
    modalId: 'modal-parceiros',
    onMount: (modalEl, destroy) => {
      const tabBtnPousadas = modalEl.querySelector('#tab-btn-pousadas');
      const tabBtnPiloteiros = modalEl.querySelector('#tab-btn-piloteiros');

      if (tabBtnPousadas) tabBtnPousadas.addEventListener('click', () => alternarAbaParcerias('pousadas', modalEl));
      if (tabBtnPiloteiros) tabBtnPiloteiros.addEventListener('click', () => alternarAbaParcerias('piloteiros', modalEl));

      alternarAbaParcerias(aba, modalEl);

      const btnEnviarPropostaPousada = modalEl.querySelector('#btn-enviar-proposta-pousada');
      if (btnEnviarPropostaPousada) {
        btnEnviarPropostaPousada.addEventListener('click', async () => {
          const nome = modalEl.querySelector('#pousada-nome')?.value.trim();
          const rio = modalEl.querySelector('#pousada-rio')?.value;
          const wpp = modalEl.querySelector('#pousada-wpp')?.value.trim();
          const rampa = modalEl.querySelector('#pousada-rampa')?.value.trim();

          if (!nome) { vibrar(30); return showToast('Informe o nome da pousada ou rancho.'); }
          if (!wpp) { vibrar(30); return showToast('Informe o WhatsApp para contato de reservas.'); }

          const comodidades = [];
          modalEl.querySelectorAll('input[name="pousada-amenity"]:checked').forEach(cb => comodidades.push(cb.value));

          const texto = `*SOLICITAÇÃO DE ANÚNCIO - GEOFISH MS (Pousadas & Ranchos)*\n\n` +
            `🏨 *Estabelecimento:* ${nome}\n` +
            `📍 *Localização:* ${rio}\n` +
            `💬 *WhatsApp Reservas:* ${wpp}\n` +
            `⚓ *Rampa/Estrutura:* ${rampa || 'A informar'}\n` +
            `✨ *Comodidades:* ${comodidades.length > 0 ? comodidades.join(', ') : 'Padrão'}\n\n` +
            `Olá Peterson! Tenho interesse em cadastrar meu estabelecimento no WebGIS da Bacia do Rio Miranda!`;

          if (navigator.clipboard && navigator.clipboard.writeText) {
            try { await navigator.clipboard.writeText(texto); } catch (_) {}
          }

          const urlWpp = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
          window.open(urlWpp, '_blank');
          vibrar(30);
          showToast('Proposta gerada! Compartilhe com o mantenedor Peterson Martins da Costa via WhatsApp.');
          destroy();
        });
      }

      const btnEnviarCadastroGuia = modalEl.querySelector('#btn-enviar-cadastro-guia');
      if (btnEnviarCadastroGuia) {
        btnEnviarCadastroGuia.addEventListener('click', async () => {
          const nome = modalEl.querySelector('#guia-nome')?.value.trim();
          const apelido = modalEl.querySelector('#guia-apelido')?.value.trim();
          const colonia = modalEl.querySelector('#guia-colonia')?.value;
          const porto = modalEl.querySelector('#guia-porto')?.value.trim();
          const wpp = modalEl.querySelector('#guia-wpp')?.value.trim();

          if (!nome) { vibrar(30); return showToast('Informe o seu nome completo.'); }
          if (!porto) { vibrar(30); return showToast('Informe seu porto de saída habitual.'); }
          if (!wpp) { vibrar(30); return showToast('Informe o WhatsApp para os pescadores te contatarem.'); }

          const diferenciais = [];
          modalEl.querySelectorAll('input[name="guia-diferencial"]:checked').forEach(cb => diferenciais.push(cb.value));

          const texto = `*CADASTRO COMUNITÁRIO DE PILOTEIRO - GEOFISH MS*\n\n` +
            `🚤 *Nome:* ${nome} ${apelido ? `("${apelido}")` : ''}\n` +
            `📜 *Colônia de Filiação:* ${colonia}\n` +
            `📍 *Porto de Saída:* ${porto}\n` +
            `💬 *WhatsApp Turistas:* ${wpp}\n` +
            `🦺 *Diferenciais:* ${diferenciais.length > 0 ? diferenciais.join(', ') : 'Navegação nativa'}\n\n` +
            `Olá! Sou piloteiro da Bacia do Miranda e gostaria de incluir meu ponto e contato comunitário no WebGIS!`;

          if (navigator.clipboard && navigator.clipboard.writeText) {
            try { await navigator.clipboard.writeText(texto); } catch (_) {}
          }

          const urlWpp = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
          window.open(urlWpp, '_blank');
          vibrar(30);
          showToast('Dados formatados! Encaminhe a mensagem ao mantenedor ou diretoria da Colônia Z-1/Z-7.');
          destroy();
        });
      }
    },
    onDestroy: () => {
      modalParceirosInstancia = null;
    }
  });
}

function fecharModalParceiros() {
  if (modalParceirosInstancia) {
    modalParceirosInstancia.destroy();
    modalParceirosInstancia = null;
  }
}

window.abrirModalParceriasTab = (aba) => abrirModalParcerias(aba);
window.abrirModalParceiros = () => abrirModalParcerias('pousadas');

const btnParceirosTopo = document.getElementById('btn-parceiros-topo');
const footerBtnParceiros = document.getElementById('footer-btn-parceiros');
const footerBtnPiloteiros = document.getElementById('footer-btn-piloteiros');

if (btnParceirosTopo) btnParceirosTopo.addEventListener('click', () => abrirModalParcerias('pousadas'));
if (footerBtnParceiros) footerBtnParceiros.addEventListener('click', () => abrirModalParcerias('pousadas'));
if (footerBtnPiloteiros) footerBtnPiloteiros.addEventListener('click', () => abrirModalParcerias('piloteiros'));

function abrirModalPix() {
  modalPixInstancia = abrirModalDeTemplate('template-modal-apoie-pix', {
    modalId: 'modal-apoie-pix',
    onMount: (modalEl) => {
      const btnCopiarChavePix = modalEl.querySelector('#btn-copiar-chave-pix');
      const pixChaveTexto = modalEl.querySelector('#pix-chave-texto');
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
    },
    onDestroy: () => {
      modalPixInstancia = null;
    }
  });
}

function fecharModalPix() {
  if (modalPixInstancia) {
    modalPixInstancia.destroy();
    modalPixInstancia = null;
  }
}

const btnApoiePixTopo = document.getElementById('btn-apoie-pix-topo');
const footerBtnPix = document.getElementById('footer-btn-pix');

if (btnApoiePixTopo) btnApoiePixTopo.addEventListener('click', abrirModalPix);
if (footerBtnPix) footerBtnPix.addEventListener('click', abrirModalPix);

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
window.obterLocalizacao = obterLocalizacao;
window.mostrarToast = showToast;
window.abrirModalSos = abrirModalSos;
window.abrirModalEspecies = abrirModalEspecies;
window.abrirModalSobre = abrirModalSobre;
window.abrirConfirmacaoSos = abrirConfirmacaoSos;
window.abrirModalParceiros = abrirModalParceiros;
window.abrirModalPix = abrirModalPix;
window.abrirModalCartilha = abrirModalCartilha;
window.fecharModalAtivo = fecharModalAtivo;

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

// 20, 21. Cartilha PMA sob demanda e Prep Offline delegados para módulos ES6.
