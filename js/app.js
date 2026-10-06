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
  showToast,
  estaEmDefeso,
  setPosicaoUsuario,
  getPosicaoUsuario
} from './modules/utils.js';

// Telefone oficial para recebimento das solicitações de parcerias e cadastros comunitários
// Altere para o WhatsApp da Coordenação / Colônia Z-1 Miranda (DDI 55 + DDD 67)
export const WHATSAPP_CONTATO_OFICIAL = '5567999881234';

import {
  abrirModalCartilha,
  fecharModalCartilha,
  alternarAbaCartilha
} from './modules/cartilha-modal.js';

import {
  abrirModalDeTemplate,
  fecharModalAtivo,
  fecharModalPorId,
  registrarOverlayExterno,
  desregistrarOverlayExterno
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
window.geofishMap = map;
window.focarNoPortoGuia = function(lat, lng, nome) {
  if (window.geofishMap) {
    window.geofishMap.flyTo([lat, lng], 14, { duration: 1.2 });
    fecharPainel();
    showToast('🚤 Porto Base: ' + nome);
  }
};


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
  { name: 'hidrografiaBasePane', zIndex: 445 },
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

  const prevFocus = document.activeElement;
  registrarOverlayExterno({
    id: 'bottom-sheet',
    fechar: () => {
      bottomSheet.classList.add('hidden');
      bottomSheet.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('sheet-open');
    },
    returnFocusEl: prevFocus
  });

  if (closeSheetBtn) {
    closeSheetBtn.focus();
  }
}

function fecharPainel() {
  if (!bottomSheet || bottomSheet.classList.contains('hidden')) return;
  bottomSheet.classList.add('hidden');
  bottomSheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('sheet-open');
  desregistrarOverlayExterno('bottom-sheet', true);
}

if (closeSheetBtn) {
  closeSheetBtn.addEventListener('click', fecharPainel);
}

// Fecha o painel ao clicar em área vazia do mapa
map.on('click', () => {
  fecharPainel();
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

// Distância perpendicular ponto-a-segmento com correção de cosseno da latitude
function distanciaPontoSegmentoKm(pLat, pLng, aLat, aLng, bLat, bLng) {
  const rad = Math.PI / 180;
  const cosLat = Math.cos(((aLat + bLat) / 2) * rad);
  const dx = (bLng - aLng) * cosLat;
  const dy = bLat - aLat;
  const dAB2 = dx * dx + dy * dy;
  if (dAB2 === 0) {
    return calcularDistanciaKm(pLat, pLng, aLat, aLng);
  }
  const px = (pLng - aLng) * cosLat;
  const py = pLat - aLat;
  let t = (px * dx + py * dy) / dAB2;
  t = Math.max(0, Math.min(1, t));
  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return calcularDistanciaKm(pLat, pLng, projLat, projLng);
}

// Ray-casting para um anel simples de coordenadas
function pontoEmAnel(lat, lng, coords) {
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

// Ray-casting com suporte a anel exterior e exclusão de buracos (interior rings)
function pontoEmPoligono(lat, lng, rings) {
  if (!rings || rings.length === 0) return false;
  // Deve estar dentro do anel exterior (rings[0])
  if (!pontoEmAnel(lat, lng, rings[0])) return false;
  // E NÃO pode estar contido em nenhum buraco interno
  for (let b = 1; b < rings.length; b++) {
    if (pontoEmAnel(lat, lng, rings[b])) {
      return false;
    }
  }
  return true;
}

// Verificação do Período Anual de Defeso da Piracema no Pantanal (05/Nov a 28/29 Fev)
function verificarPeriodoDefeso() {
  const emDefeso = estaEmDefeso();
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

const LIMITE_PROXIMIDADE_TRECHO_KM = 0.5; // Limite de 500m para considerar o usuário no trecho

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

  const trechoAtivo = (menorDistanciaTrecho <= LIMITE_PROXIMIDADE_TRECHO_KM) ? trechoMaisProximo : null;

  // Detecta todas as UCs em que a posição se encontra
  const ucsPresentes = [];
  const dadosUcs = dadosCarregados['areas_restritas'];
  if (dadosUcs && dadosUcs.features) {
    for (const feat of dadosUcs.features) {
      const geom = feat.geometry;
      let polyList = [];
      if (geom.type === 'Polygon') {
        polyList = [geom.coordinates];
      } else if (geom.type === 'MultiPolygon') {
        polyList = geom.coordinates;
      }
      for (const rings of polyList) {
        if (pontoEmPoligono(userLat, userLng, rings)) {
          ucsPresentes.push(feat.properties);
          break;
        }
      }
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
    noTrecho: Boolean(trechoAtivo),
    trecho: trechoAtivo,
    trechoMaisProximo: trechoMaisProximo,
    distanciaTrechoKm: menorDistanciaTrecho,
    ucs: ucsPresentes,
    emDefeso: estaEmDefeso(),
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
    const fetchHeaders = {};
    if (cached && (cached.etag || cached.versao)) {
      fetchHeaders['If-None-Match'] = cached.etag || cached.versao;
    }

    const response = await fetch(url, {
      headers: fetchHeaders,
      cache: 'no-cache',
      signal: controller.signal
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (response.status === 304 && cached && cached.data) {
      // 304 Not Modified: reutiliza os dados em cache sem reescrever no IndexedDB
      dados = cached.data;
      origem = 'cache_validado';
      dataAtualizacao = cached.atualizado_em;
    } else if (response.ok) {
      const jsonRecebido = await response.json();
      const temFeicoesReais = Boolean(jsonRecebido?.features?.length > 0);
      const cacheTinhaFeicoes = Boolean(cached?.data?.features?.length > 0);

      // Previne substituição acidental de dados locais válidos por respostas vazias
      if (!temFeicoesReais && cacheTinhaFeicoes) {
        console.warn(`[GeoFish] Resposta vazia recebida para [${layerKey}]. Preservando dados válidos do IndexedDB.`);
        dados = cached.data;
        origem = 'offline';
        dataAtualizacao = cached.atualizado_em;
      } else {
        dados = jsonRecebido;
        origem = 'rede';
        dataAtualizacao = new Date().toISOString();
        const novoEtag = response.headers.get('ETag') || '1.0';

        // Salva no IndexedDB apenas se contiver feições reais
        if (window.GeoFishDB && temFeicoesReais) {
          await window.GeoFishDB.salvarCamada(layerKey, dados, novoEtag, novoEtag);
        }
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
                const isPesqueSolte = (p.regra || '').toLowerCase().includes('solte');

                // 1. Filtrar Piloteiros Credenciados Vinculados ao Trecho
                const dadosGuias = dadosCarregados['guias_credenciados'];
                let guiasDoTrecho = [];
                if (dadosGuias && dadosGuias.features) {
                  guiasDoTrecho = dadosGuias.features.filter(f => {
                    const gp = f.properties || {};
                    if (gp.trecho_ids && Array.isArray(gp.trecho_ids) && gp.trecho_ids.includes(p.id_trecho)) return true;
                    if (gp.rios_atendidos && Array.isArray(gp.rios_atendidos)) {
                      return gp.rios_atendidos.some(r => (p.rio || '').toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes((p.rio || '').toLowerCase()));
                    }
                    const porto = (gp.porto_base || '').toLowerCase();
                    const rio = (p.rio || '').toLowerCase();
                    if (rio.includes('miranda') && (porto.includes('miranda') || porto.includes('porto geral') || porto.includes('lontra'))) return true;
                    if (rio.includes('salobra') && (porto.includes('salobra') || porto.includes('bodoquena') || porto.includes('bonito'))) return true;
                    if (rio.includes('aquidauana') && (porto.includes('aquidauana') || porto.includes('camis') || porto.includes('piraputanga'))) return true;
                    if (rio.includes('vermelho') && (porto.includes('vermelho') || porto.includes('lontra'))) return true;
                    if (rio.includes('negro') && (porto.includes('negro') || porto.includes('lajeado'))) return true;
                    return false;
                  });
                }

                // 2. Renderizar Cards dos Piloteiros Locais
                let guiasHtml = '';
                if (guiasDoTrecho.length > 0) {
                  guiasHtml = guiasDoTrecho.map(f => {
                    const g = f.properties;
                    const coords = f.geometry ? f.geometry.coordinates : null;
                    const waNum = g.contato_wa || WHATSAPP_CONTATO_OFICIAL;
                    const waMsg = encodeURIComponent(`Olá ${g.nome_operacional || 'Piloteiro'}! Vi seu contato credenciado no GeoFish MS para o trecho do ${p.rio}. Gostaria de consultar diária de pesca e saída no porto ${g.porto_base}.`);
                    const waUrl = `https://wa.me/${waNum}?text=${waMsg}`;
                    const btnFocar = coords ? `<button type="button" class="btn-geo-focar" onclick="window.focarNoPortoGuia(${coords[1]}, ${coords[0]}, '${escapeHTML(g.porto_base)}')" style="background:#0284c7; color:#fff; border:none; padding:7px 12px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:5px; margin-top:6px;">📍 Ver Porto no Mapa</button>` : '';

                    return `
                      <div class="card-piloteiro-trecho" style="background:#0f172a; border:1px solid #1e293b; border-left:4px solid #10b981; border-radius:8px; padding:12px; margin-bottom:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                          <div>
                            <span style="font-size:11px; background:#065f46; color:#a7f3d0; padding:2px 8px; border-radius:12px; font-weight:bold;">🚤 Guia Credenciado</span>
                            <h4 style="margin:4px 0 2px; color:#f8fafc; font-size:15px; font-weight:700;">${escapeHTML(g.nome_operacional || g.nome_completo)}</h4>
                            <div style="font-size:12px; color:#94a3b8;">${escapeHTML(g.colonia || 'Colônia de Pescadores')} • <strong>Porto:</strong> ${escapeHTML(g.porto_base)}</div>
                          </div>
                        </div>
                        <div style="font-size:12px; color:#cbd5e1; margin:6px 0; background:#1e293b; padding:6px 8px; border-radius:4px;">
                          <div>🚤 <strong>Embarcação:</strong> ${escapeHTML(g.tipo_barco || 'Bote Pantaneiro')}</div>
                          ${g.especialidade ? `<div style="margin-top:2px;">🎯 <strong>Foco:</strong> ${escapeHTML(g.especialidade)}</div>` : ''}
                        </div>
                        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:8px;">
                          <a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="background:#16a34a; color:#ffffff; padding:7px 14px; border-radius:6px; font-size:12px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(22,163,74,0.4);">
                            💬 Falar no WhatsApp
                          </a>
                          ${btnFocar}
                        </div>
                      </div>
                    `;
                  }).join('');
                } else {
                  guiasHtml = `
                    <div style="background:#0f172a; border:1px dashed #334155; border-radius:8px; padding:12px; text-align:center; color:#94a3b8; font-size:12px; margin-bottom:10px;">
                      🚤 Nenhum piloteiro individual cadastrado para este trecho específico no momento.
                      <div style="margin-top:6px;">
                        <a href="https://wa.me/${WHATSAPP_CONTATO_OFICIAL}?text=Ol%C3%A1!%20Sou%20piloteiro/pescador%20e%20quero%20me%20cadastrar%20no%20GeoFish%20MS" target="_blank" style="color:#38bdf8; font-weight:600; text-decoration:underline;">
                          É piloteiro da região? Clique aqui para credenciar-se gratuitamente na plataforma
                        </a>
                      </div>
                    </div>
                  `;
                }

                // 3. Renderizar Limites Legais das Espécies (Régua Digital IMASUL)
                const especiesHtml = isPesqueSolte ? `
                  <div style="background:#78350f; border:1px solid #b45309; border-radius:8px; padding:10px 12px; margin-bottom:12px; color:#fef3c7; font-size:12px;">
                    <div style="font-weight:bold; font-size:13px; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                      🚫 100% PESQUE E SOLTE OBRIGATÓRIO (Decreto 15.166/19)
                    </div>
                    É expressamente proibido o abate, retenção e transporte de qualquer espécime nativo ou exótico neste trecho. Todos os peixes devem ser soltos imediatamente no mesmo ponto de captura com anzol sem farpa. Motores: exclusivamente 4 tempos até 15HP ou motor elétrico silencioso.
                  </div>
                ` : `
                  <div style="background:#0f172a; border:1px solid #1e293b; border-radius:8px; padding:10px; margin-bottom:12px;">
                    <div style="font-size:12px; font-weight:700; color:#38bdf8; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                      <span>⚖️ Limites Legais da Bacia (IMASUL / PMA)</span>
                      <span style="font-size:11px; background:#1e293b; color:#94a3b8; padding:2px 6px; border-radius:4px;">Cota: 1 Peixe + 5 Piranhas</span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11px;">
                      <div style="background:#1e293b; padding:6px 8px; border-radius:4px; border-left:3px solid #ef4444;">
                        <span style="font-weight:bold; color:#fca5a5;">Dourado:</span> COTA ZERO (100% Pesque-Solte)
                      </div>
                      <div style="background:#1e293b; padding:6px 8px; border-radius:4px; border-left:3px solid #10b981;">
                        <span style="font-weight:bold; color:#86efac;">Pintado / Surubim:</span> 85 a 125 cm
                      </div>
                      <div style="background:#1e293b; padding:6px 8px; border-radius:4px; border-left:3px solid #10b981;">
                        <span style="font-weight:bold; color:#86efac;">Pacu:</span> 45 a 65 cm
                      </div>
                      <div style="background:#1e293b; padding:6px 8px; border-radius:4px; border-left:3px solid #10b981;">
                        <span style="font-weight:bold; color:#86efac;">Cachara:</span> 80 a 120 cm
                      </div>
                      <div style="background:#1e293b; padding:6px 8px; border-radius:4px; border-left:3px solid #10b981;">
                        <span style="font-weight:bold; color:#86efac;">Jaú:</span> 95 a 130 cm
                      </div>
                      <div style="background:#1e293b; padding:6px 8px; border-radius:4px; border-left:3px solid #10b981;">
                        <span style="font-weight:bold; color:#86efac;">Piraputanga / Curimbatá:</span> Mín. 30 / 38 cm
                      </div>
                    </div>
                    <div style="margin-top:8px; font-size:11px; color:#cbd5e1; background:#022c22; padding:6px 8px; border-radius:4px;">
                      🧊 <strong>Regra de Transporte:</strong> 1 peixe nativo inteiro no gelo c/ cabeça e vísceras. Emita a Guia de Controle de Pescado (GCP) no posto da PMA antes da rodovia.
                    </div>
                  </div>
                `;

                abrirPainel(`
                  <div style="margin-bottom:8px;">
                    <span class="badge-tag" style="background-color: ${cor}; font-size:11px; font-weight:700; padding:3px 10px; border-radius:12px;">Regra: ${escapeHTML(p.regra)}</span>
                    <span style="font-size:11px; color:#94a3b8; margin-left:6px;">Bacia do Rio Miranda (BHRM)</span>
                  </div>
                  <h2 class="sheet-title" style="margin-bottom:10px;">${escapeHTML(p.rio)}</h2>

                  <!-- Bloco de Limites Legais das Espécies -->
                  ${especiesHtml}

                  <!-- Bloco de Piloteiros Conectados ao Trecho -->
                  <div style="margin-top:14px; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                      <h3 style="font-size:13px; font-weight:700; color:#f8fafc; margin:0; display:flex; align-items:center; gap:6px;">
                        🚤 Piloteiros Credenciados no Trecho (${guiasDoTrecho.length})
                      </h3>
                      <span style="font-size:11px; color:#10b981; font-weight:600;">Sem Intermediários</span>
                    </div>
                    ${guiasHtml}
                  </div>

                  <!-- Detalhes do Trecho e Normativa -->
                  <div class="data-group" style="margin-top:10px;">
                    <div class="data-item">
                      <div class="data-label">Cota Permitida no Trecho</div>
                      <div class="data-value">${escapeHTML(p.cota)}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Petrechos e Navegação</div>
                      <div class="data-value">${escapeHTML(p.petrechos || p.obs || 'Vara ou linha de mão. Proibido rede e espinhel.')}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Norma de Referência</div>
                      <div class="data-value">${escapeHTML(p.norma_ref || 'Decreto Estadual nº 15.166/19 e Resolução SEMADESC / IMASUL')}</div>
                    </div>
                  </div>

                  <!-- Botões de Ação Rápida -->
                  <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
                    <button type="button" onclick="window.abrirModalEspecies && window.abrirModalEspecies(); fecharPainel();" style="flex:1; min-width:140px; background:#0284c7; color:#fff; border:none; padding:9px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">
                      📏 Abrir Simulador de Régua
                    </button>
                    <a href="tel:190" style="background:#b91c1c; color:#fff; text-decoration:none; padding:9px 14px; border-radius:6px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                      🚨 PMA 190
                    </a>
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
              const iconeGuia = L.divIcon({
                className: 'custom-guia-marker',
                html: `
                  <div style="
                    background: #0284c7;
                    color: #ffffff;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.35);
                    border: 2px solid #ffffff;
                    cursor: pointer;
                  ">🚤</div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              });
              return L.marker(latlng, { icon: iconeGuia, pane: 'guiasPane' });
            },
            onEachFeature: (feature, layer) => {
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                const g = feature.properties;
                const waUrl = normalizeWhatsApp(g.contato_wa);
                const telUrl = sanitizeTel(g.contato_tel || g.contato_wa);

                if (g.demonstrativo) {
                  abrirPainel(`
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span class="badge-tag" style="background-color: #d97706; margin: 0;">Ponto Demonstrativo &bull; Vaga Aberta</span>
                      <span style="font-size: 0.72rem; color: #b45309; font-weight: 700;">Exemplo</span>
                    </div>
                    <h2 class="sheet-title" style="margin-top: 4px;">${escapeHTML(g.nome_operacional)}</h2>
                    <div class="data-group">
                      <div class="data-item">
                        <div class="data-label">Colônia de Pescadores</div>
                        <div class="data-value">${escapeHTML(g.colonia || 'Não informada')}</div>
                      </div>
                      <div class="data-item">
                        <div class="data-label">Porto / Base de Saída</div>
                        <div class="data-value">${escapeHTML(g.porto_base || 'Bacia do Miranda')}</div>
                      </div>
                      <div class="data-item">
                        <div class="data-label">Embarcação Sugerida</div>
                        <div class="data-value">${escapeHTML(g.tipo_barco || 'Barco homologado')}</div>
                      </div>
                    </div>
                    <div style="margin: 12px 0; padding: 10px 12px; background: #fffbeb; border-left: 3px solid #d97706; border-radius: 4px; font-size: 0.8rem; color: #92400e; line-height: 1.45;">
                      📢 <strong>Cadastro Comunitário Aberto:</strong> Este ponto exemplifica onde guias e piloteiros das Colônias Z-1, Z-7 e Z-11 aparecem no mapa. O cadastro é 100% gratuito para os condutores tradicionais.
                    </div>
                    <button type="button" class="btn-cta btn-cadastrar-vaga" style="width: 100%; margin: 0; background: #0284c7; color: #fff; border: none; padding: 12px; border-radius: 6px; font-size: 0.9rem; font-weight: 700; cursor: pointer;">
                      ✍️ Cadastrar Meu Barco Gratuitamente
                    </button>
                  `);
                  const btnCadVaga = document.querySelector('.btn-cadastrar-vaga');
                  if (btnCadVaga) {
                    btnCadVaga.addEventListener('click', () => {
                      fecharPainel();
                      if (typeof window.abrirModalParceriasTab === 'function') {
                        window.abrirModalParceriasTab('piloteiros');
                      }
                    });
                  }
                  return;
                }

                abrirPainel(`
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span class="badge-tag" style="background-color: #0b4f6c; margin: 0;">Piloteiro Local &bull; Cadastro Comunitário</span>
                    <span style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Declarado</span>
                  </div>
                  <h2 class="sheet-title" style="margin-top: 4px;">${escapeHTML(g.nome_operacional)}</h2>
                  <div class="data-group">
                    <div class="data-item">
                      <div class="data-label">Colônia de Pescadores</div>
                      <div class="data-value">${escapeHTML(g.colonia || 'Não informada')}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Porto / Base de Saída</div>
                      <div class="data-value">${escapeHTML(g.porto_base || 'Bacia do Miranda')}</div>
                    </div>
                    <div class="data-item">
                      <div class="data-label">Embarcação / Motor</div>
                      <div class="data-value">${escapeHTML(g.tipo_barco || 'Barco homologado')}</div>
                    </div>
                  </div>
                  <div style="margin: 12px 0; padding: 10px 12px; background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 4px; font-size: 0.8rem; color: #166534; line-height: 1.45;">
                    🤝 <strong>Contato Direto:</strong> Você combina disponibilidade, roteiro e valores diretamente com o profissional. O GeoFish MS não faz reservas nem cobra taxas.
                  </div>
                  <div style="display: flex; gap: 8px;">
                    ${waUrl ? `
                      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-cta btn-whatsapp" style="flex: 1; margin: 0; text-align: center; text-decoration: none;">
                        💬 Conversar pelo WhatsApp
                      </a>
                    ` : ''}
                    ${telUrl ? `
                      <a href="${telUrl}" class="btn-cta" style="background: #0284c7; padding: 0 16px; margin: 0; text-decoration: none; display: flex; align-items: center; justify-content: center;" title="Ligar para o telefone convencional">
                        📞 Ligar
                      </a>
                    ` : ''}
                  </div>
                `);
              });
            }
          });
          break;

        case 'pontos_emergencia':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'apoioPane',
            pointToLayer: (feature, latlng) => {
              const isRampa = feature.properties && feature.properties.tipo && feature.properties.tipo.toLowerCase().includes('rampa');
              const iconePonto = L.divIcon({
                className: isRampa ? 'custom-rampa-marker' : 'custom-sos-marker',
                html: `
                  <div style="
                    background: ${isRampa ? '#0d9488' : '#dc2626'};
                    color: #ffffff;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    border: 2px solid #ffffff;
                    cursor: pointer;
                  ">${isRampa ? '⚓' : '🚨'}</div>
                `,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
              });
              return L.marker(latlng, { icon: iconePonto, pane: 'apoioPane' });
            },
            onEachFeature: (feature, layer) => {
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                const a = feature.properties;
                const isRampa = a.tipo && a.tipo.toLowerCase().includes('rampa');
                const telUrl = (!isRampa && a.telefone_emergencia) ? sanitizeTel(a.telefone_emergencia) : '';
                abrirPainel(`
                  <span class="badge-tag" style="background-color: ${isRampa ? '#0284c7' : '#d32f2f'};">${isRampa ? 'Apoio Náutico &bull; Rampa' : 'Apoio e Emergência'}</span>
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
                    ${(!isRampa && a.telefone_emergencia) ? `
                      <div class="data-item">
                        <div class="data-label">Telefone de Emergência</div>
                        <div class="data-value">${escapeHTML(a.telefone_emergencia)}</div>
                      </div>
                    ` : ''}
                    ${a.endereco ? `
                      <div class="data-item">
                        <div class="data-label">Localização</div>
                        <div class="data-value">${escapeHTML(a.endereco)}</div>
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
            pane: 'hidrografiaBasePane',
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
      const ts = Date.now();
      ultimaPosicaoUsuario = { lat, lng, precisao: acc, timestamp: ts };
      setPosicaoUsuario(ultimaPosicaoUsuario);

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

        const radar = avaliarConformidadePosicao(lat, lng);
        let infoPopup = `<strong>📍 Sua Posição no Rio</strong><br><span style="font-size:0.75rem; color:#64748b;">Precisão: ±${acc.toFixed(0)}m</span>`;

        if (radar.emDefeso) {
          infoPopup += `<br><span style="color:#dc2626; font-weight:700;">⚠️ Defeso da Piracema em Vigor!</span>`;
        }

        if (radar.noTrecho && radar.trecho) {
          infoPopup += `<br><strong>Trecho:</strong> ${escapeHTML(radar.trecho.rio || 'Rio')}<br><strong>Regra:</strong> ${escapeHTML(radar.trecho.regra || '')}`;
        } else if (radar.distanciaTrechoKm < 10) {
          infoPopup += `<br><span style="font-size:0.8rem; color:#475569;">Aprox. ${radar.distanciaTrechoKm.toFixed(1)}km do Rio</span>`;
        }

        if (radar.ucs && radar.ucs.length > 0) {
          infoPopup += `<br><span style="color:#b45309; font-weight:700;">⚠️ Área Restrita:</span> ${escapeHTML(radar.ucs.map(u => u.nome).join(', '))}`;
        }

        if (radar.apoio) {
          infoPopup += `<br><span style="font-size:0.75rem; color:#0369a1;">Apoio próximo: ${escapeHTML(radar.apoio.nome)} (${radar.apoio.distanciaKm.toFixed(1)} km)</span>`;
        }

        marcadorPosicao.bindPopup(infoPopup).openPopup();
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
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        const ts = Date.now();
        ultimaPosicaoUsuario = { lat, lng, precisao: acc, timestamp: ts };
        setPosicaoUsuario(ultimaPosicaoUsuario);
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
          } else if (status.origem === 'cache_validado') {
            tagClass = 'status-online';
            tagTexto = `Confirmada (304 - ${formatarDataBR(status.atualizado_em)})`;
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
// Gestão de Histórico e Popstate unificada em js/modules/modal-manager.js

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
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
    showToast('Filtro: Guias Credenciados Z-1, Z-7 e Z-11.');
  } else if (tipo === 'apoio') {
    if (camadasInstanciadas['pontos_emergencia']) {
      map.addLayer(camadasInstanciadas['pontos_emergencia']);
      const bounds = camadasInstanciadas['pontos_emergencia'].getBounds();
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
    showToast('Filtro: Pontos de Apoio, Rampas e Emergência.');
  } else if (tipo === 'restritas') {
    if (camadasInstanciadas['areas_restritas']) {
      map.addLayer(camadasInstanciadas['areas_restritas']);
      const bounds = camadasInstanciadas['areas_restritas'].getBounds();
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
    showToast('Filtro: Unidades de Conservação e Áreas Restritas.');
  }
}

// Ações de Entrada Rápida e Filtros Regionais (Fase 1 do Produto)
const btnHeroVerGuias = document.getElementById('btn-hero-ver-guias');
if (btnHeroVerGuias) {
  btnHeroVerGuias.addEventListener('click', (e) => {
    e.preventDefault();
    aplicarFiltroRapido('guias');
    const secaoMapa = document.getElementById('secao-mapa');
    if (secaoMapa) secaoMapa.scrollIntoView({ behavior: 'smooth' });
  });
}

document.querySelectorAll('.btn-filter-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-filter-chip').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'rgba(15,23,42,0.45)';
      b.style.borderColor = 'rgba(255,255,255,0.25)';
    });
    btn.classList.add('active');
    btn.style.background = 'rgba(255,255,255,0.25)';
    btn.style.borderColor = 'rgba(255,255,255,0.5)';

    const regiao = btn.getAttribute('data-regiao');
    const secaoMapa = document.getElementById('secao-mapa');
    if (secaoMapa) secaoMapa.scrollIntoView({ behavior: 'smooth' });

    if (camadasInstanciadas['guias_credenciados'] && !map.hasLayer(camadasInstanciadas['guias_credenciados'])) {
      map.addLayer(camadasInstanciadas['guias_credenciados']);
    }

    if (regiao === 'z1') {
      map.flyTo([-20.35, -56.65], 11, { duration: 1.2 });
      showToast('Profissionais: Miranda & Passo do Lontra (Colônia Z-1)');
    } else if (regiao === 'z7') {
      map.flyTo([-20.48, -55.79], 12, { duration: 1.2 });
      showToast('Profissionais: Aquidauana & Anastácio (Colônia Z-7)');
    } else if (regiao === 'z11') {
      map.flyTo([-20.89, -56.12], 12, { duration: 1.2 });
      showToast('Profissionais: Bonito & Águas do Miranda (Colônia Z-11)');
    } else {
      aplicarFiltroRapido('guias');
    }
  });
});

// Controle da Barra de Filtros Rápidos do Mapa (Fase 2)
document.querySelectorAll('.quick-filters-bar button[data-camada-filtro]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.quick-filters-bar button[data-camada-filtro]').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    const tipo = btn.getAttribute('data-camada-filtro');
    aplicarFiltroRapido(tipo);
  });
});

// Modal Alternativo em Lista para Guias e Piloteiros (Fase 2 - Acessibilidade Mobile)
let modalListaGuiasInstancia = null;

function abrirModalListaGuias() {
  modalListaGuiasInstancia = abrirModalDeTemplate('template-modal-lista-guias', {
    modalId: 'modal-lista-guias',
    onMount: (modalEl, destroy) => {
      const btnFechar = modalEl.querySelector('#btn-fechar-lista-guias');
      if (btnFechar) btnFechar.addEventListener('click', destroy);

      const container = modalEl.querySelector('#container-lista-guias-itens');
      if (!container) return;

      const dados = dadosCarregados['guias_credenciados'];
      if (!dados || !dados.features || dados.features.length === 0) {
        container.innerHTML = '<div style="color: #64748b; padding: 12px;">Nenhum guia carregado no momento.</div>';
        return;
      }

      container.innerHTML = dados.features.map(feat => {
        const p = feat.properties || {};
        const coords = feat.geometry ? feat.geometry.coordinates : null;
        const waUrl = normalizeWhatsApp(p.contato_wa);
        const telUrl = sanitizeTel(p.contato_tel || p.contato_wa);
        const lat = coords ? coords[1] : null;
        const lng = coords ? coords[0] : null;

        if (p.demonstrativo) {
          return `
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div>
                  <strong style="color: #92400e; font-size: 1.05rem;">${escapeHTML(p.nome_operacional || 'Guia de Pesca')}</strong>
                  <div style="font-size: 0.82rem; color: #78350f; margin-top: 2px;">
                    📍 <strong>Colônia:</strong> ${escapeHTML(p.colonia || '')} &bull; <strong>Base:</strong> ${escapeHTML(p.porto_base || '')}
                  </div>
                  <div style="font-size: 0.8rem; color: #a16207; margin-top: 2px;">
                    ⛵ <strong>Barco Sugerido:</strong> ${escapeHTML(p.tipo_barco || 'Voadeira pantaneira')}
                  </div>
                </div>
                <span class="badge-tag" style="background: #d97706; font-size: 0.7rem; margin: 0; white-space: nowrap;">Demonstrativo &bull; Vaga Aberta</span>
              </div>
              <div style="font-size: 0.78rem; color: #92400e; line-height: 1.4;">
                📢 Vaga comunitária demonstrativa. O cadastro é 100% gratuito para condutores e piloteiros tradicionais.
              </div>
              <div style="display: flex; gap: 8px; margin-top: 4px;">
                <button type="button" class="btn-cadastrar-vaga-lista" style="flex: 1; background: #0284c7; border: none; color: #ffffff; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 700; cursor: pointer;">
                  ✍️ Cadastrar Nesta Vaga
                </button>
                ${(lat && lng) ? `
                  <button type="button" class="btn-ver-guia-mapa" data-lat="${lat}" data-lng="${lng}" data-nome="${escapeHTML(p.nome_operacional || '')}" style="background: #ffffff; border: 1px solid #cbd5e1; color: #0f172a; border-radius: 6px; padding: 8px 12px; font-size: 0.85rem; cursor: pointer; white-space: nowrap;">
                    🗺️ Ver no Mapa
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }

        return `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <div>
                <strong style="color: #0b4f6c; font-size: 1.05rem;">${escapeHTML(p.nome_operacional || 'Guia de Pesca')}</strong>
                <div style="font-size: 0.82rem; color: #475569; margin-top: 2px;">
                  📍 <strong>Colônia:</strong> ${escapeHTML(p.colonia || '')} &bull; <strong>Base:</strong> ${escapeHTML(p.porto_base || '')}
                </div>
                <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
                  ⛵ <strong>Barco:</strong> ${escapeHTML(p.tipo_barco || 'Voadeira pantaneira')}
                </div>
              </div>
              <span class="badge-tag" style="background: #0b4f6c; font-size: 0.7rem; margin: 0; white-space: nowrap;">Comunitário &bull; Declarado</span>
            </div>
            <div style="font-size: 0.78rem; color: #15803d; background: #f0fdf4; padding: 6px 10px; border-radius: 4px; border-left: 3px solid #16a34a; line-height: 1.4;">
              🤝 <strong>Contato Direto:</strong> Você combina disponibilidade, valores e roteiro diretamente com o profissional. Sem taxas nem comissões.
            </div>
            <div style="display: flex; gap: 8px; margin-top: 4px;">
              ${waUrl ? `
                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-cta btn-whatsapp" style="flex: 1; margin: 0; text-align: center; text-decoration: none; padding: 8px 12px; font-size: 0.85rem;">
                  💬 Conversar no WhatsApp
                </a>
              ` : ''}
              ${telUrl ? `
                <a href="${telUrl}" class="btn-cta" style="background: #0284c7; padding: 0 12px; margin: 0; text-decoration: none; display: flex; align-items: center; justify-content: center;" title="Ligar para o telefone">
                  📞 Ligar
                </a>
              ` : ''}
              ${(lat && lng) ? `
                <button type="button" class="btn-ver-guia-mapa" data-lat="${lat}" data-lng="${lng}" data-nome="${escapeHTML(p.nome_operacional || '')}" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #0f172a; border-radius: 6px; padding: 8px 12px; font-size: 0.85rem; cursor: pointer; white-space: nowrap;">
                  🗺️ Ver no Mapa
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.btn-cadastrar-vaga-lista').forEach(btn => {
        btn.addEventListener('click', () => {
          destroy();
          if (typeof window.abrirModalParceriasTab === 'function') {
            window.abrirModalParceriasTab('piloteiros');
          }
        });
      });

      container.querySelectorAll('.btn-ver-guia-mapa').forEach(btn => {
        btn.addEventListener('click', () => {
          const lat = parseFloat(btn.getAttribute('data-lat'));
          const lng = parseFloat(btn.getAttribute('data-lng'));
          const nome = btn.getAttribute('data-nome');
          destroy();

          const secaoMapa = document.getElementById('secao-mapa');
          if (secaoMapa) secaoMapa.scrollIntoView({ behavior: 'smooth' });

          if (camadasInstanciadas['guias_credenciados'] && !map.hasLayer(camadasInstanciadas['guias_credenciados'])) {
            map.addLayer(camadasInstanciadas['guias_credenciados']);
          }

          map.flyTo([lat, lng], 14, { duration: 1.2 });
          showToast(`Navegando para: ${nome}`);
        });
      });
    },
    onDestroy: () => {
      modalListaGuiasInstancia = null;
    }
  });
}

const btnAbrirListaGuias = document.getElementById('btn-abrir-lista-guias');
if (btnAbrirListaGuias) {
  btnAbrirListaGuias.addEventListener('click', abrirModalListaGuias);
}

// 14. Gestão de Espécies & Medidas regulatórias delegada para js/modules/species-checker.js




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
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const rawBase64 = ev.target.result;
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          // Exporta JPEG comprimido limpando metadados EXIF e dados sensíveis da câmera
          const cleanBase64 = canvas.toDataURL('image/jpeg', 0.82);
          imgElement.src = cleanBase64;
          previewBox.classList.add('has-image');
          callbackBase64(cleanBase64);
        };
        img.onerror = () => {
          showToast('Não foi possível processar a imagem.');
        };
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    }
  });
}

function dataURLtoFile(dataurl, filename = 'peixe-pantanal.jpg') {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

function abrirGoogleLensWeb() {
  vibrar(25);
  window.open('https://lens.google.com/', '_blank', 'noopener,noreferrer');
  showToast('Google Lens aberto! No celular, você também pode usar a câmera do Google ou o Google Fotos.');
}

async function compartilharFotoGoogleLens(base64Image) {
  vibrar(25);
  if (!base64Image) {
    showToast('Tire ou escolha uma foto do peixe primeiro!');
    return;
  }

  try {
    const file = dataURLtoFile(base64Image, 'peixe-pantanal-geofish.jpg');
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Identificar Peixe - GeoFish MS',
        text: 'Identificar espécie de peixe do Pantanal com Google Lens / Google Fotos'
      });
      showToast('Compartilhando com o app de imagens/Lens!');
      return;
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
  }

  // Fallback para dispositivos que não suportam navigator.share com arquivos
  try {
    const a = document.createElement('a');
    a.href = base64Image;
    a.download = 'peixe-geofish-miranda.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Foto salva! Carregue-a no Google Lens para identificar a espécie.');
    setTimeout(() => {
      window.open('https://lens.google.com/', '_blank', 'noopener,noreferrer');
    }, 600);
  } catch (_) {
    abrirGoogleLensWeb();
  }
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

      if (selectEspecieDiario) {
        selectEspecieDiario.innerHTML = ESPECIES_MS.map(esp => {
          return `<option value="${esp.id}">${escapeHTML(esp.nome)}</option>`;
        }).join('') + '<option value="outro">Outro peixe...</option>';
      }

      const btnAbrirLens = modalEl.querySelector('#btn-abrir-lens');
      const btnCompartilharLens = modalEl.querySelector('#btn-compartilhar-lens');

      setupPhotoInput(previewBoxDiario, inputFotoDiario, imgDiario, (b64) => { currentBase64Diario = b64; });

      if (btnAbrirLens) {
        btnAbrirLens.addEventListener('click', () => {
          abrirGoogleLensWeb();
        });
      }

      if (btnCompartilharLens) {
        btnCompartilharLens.addEventListener('click', () => {
          compartilharFotoGoogleLens(currentBase64Diario);
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

      const btnLimparDiario = modalEl.querySelector('#btn-limpar-diario');
      if (btnLimparDiario) {
        btnLimparDiario.addEventListener('click', async () => {
          const trofeus = await GeoFishDB.obterTodosTrofeus();
          if (!trofeus || trofeus.length === 0) {
            return showToast('Não há troféus salvos para apagar.');
          }
          const confirma = confirm(`Deseja apagar todos os ${trofeus.length} troféus salvos na memória deste aparelho? Esta ação é irreversível.`);
          if (!confirma) return;

          const ok = await GeoFishDB.limparTodosTrofeus();
          if (ok) {
            showToast('Todos os troféus foram apagados da memória local.');
            renderizarTrofeusNoMapa();
            destroy();
          } else {
            showToast('Erro ao tentar apagar os troféus.');
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

      const btnLimparDenuncias = modalEl.querySelector('#btn-limpar-denuncias');
      if (btnLimparDenuncias) {
        btnLimparDenuncias.addEventListener('click', async () => {
          const denuncias = await GeoFishDB.obterTodasDenuncias();
          if (!denuncias || denuncias.length === 0) {
            return showToast('Não há evidências salvas para apagar.');
          }
          const confirma = confirm(`Deseja apagar todas as ${denuncias.length} evidências salvas na memória deste aparelho? Esta ação é irreversível.`);
          if (!confirma) return;

          const ok = await GeoFishDB.limparTodasDenuncias();
          if (ok) {
            showToast('Todas as evidências locais foram apagadas com sucesso.');
            destroy();
          } else {
            showToast('Erro ao apagar evidências locais.');
          }
        });
      }

      atualizarLocalizacaoOculta();
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

// Exclusão individual de troféu do mapa e IndexedDB
window.excluirTrofeuLocal = async function(id) {
  if (!confirm('Deseja excluir este registro de troféu do mapa e da memória local?')) return;
  const ok = await GeoFishDB.excluirTrofeu(id);
  if (ok) {
    showToast('Troféu excluído com sucesso.');
    map.closePopup();
    renderizarTrofeusNoMapa();
  } else {
    showToast('Erro ao excluir troféu.');
  }
};

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

    const popupHtml = `
      <div style="font-family: sans-serif; font-size: 0.85rem; min-width: 130px;">
        <strong style="color:#0b4f6c; font-size: 0.95rem;">${escapeHTML(t.especie || 'Peixe')}</strong><br>
        <span>${escapeHTML(String(t.tamanho || ''))} cm</span>
        ${imgTag}
        <div style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px; text-align: right;">
          <button type="button" class="btn-excluir-trofeu" data-trofeu-id="${escapeHTML(String(t.id))}" style="background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 4px; padding: 3px 8px; font-size: 0.75rem; cursor: pointer;">
            🗑️ Excluir
          </button>
        </div>
      </div>
    `;

    L.marker([t.lat, t.lng], { icon: iconeTrofeu })
     .bindPopup(popupHtml)
     .addTo(trofeusLayerGroup);
  });
}

// Delegação de evento para exclusão de troféus sem inline handlers (CSP estrito)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-excluir-trofeu');
  if (btn) {
    const id = btn.getAttribute('data-trofeu-id');
    if (id && typeof window.excluirTrofeuLocal === 'function') {
      window.excluirTrofeuLocal(id);
    }
  }
});

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

          const foneDestino = WHATSAPP_CONTATO_OFICIAL ? `&phone=${WHATSAPP_CONTATO_OFICIAL}` : '';
          const urlWpp = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}${foneDestino}`;
          window.open(urlWpp, '_blank');
          vibrar(30);
          showToast('Proposta gerada! Encaminhando diretamente à coordenação do GeoFish MS via WhatsApp.');
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
          const barco = modalEl.querySelector('#guia-barco')?.value.trim();

          if (!nome) { vibrar(30); return showToast('Informe o seu nome completo.'); }
          if (!porto) { vibrar(30); return showToast('Informe seu porto de saída habitual.'); }
          if (!wpp) { vibrar(30); return showToast('Informe o WhatsApp para os pescadores te contatarem.'); }

          const diferenciais = [];
          modalEl.querySelectorAll('input[name="guia-diferencial"]:checked').forEach(cb => diferenciais.push(cb.value));

          const texto = `*CADASTRO COMUNITÁRIO DE PILOTEIRO - GEOFISH MS*\n\n` +
            `🚤 *Nome:* ${nome} ${apelido ? `("${apelido}")` : ''}\n` +
            `📜 *Colônia de Filiação:* ${colonia}\n` +
            `📍 *Porto de Saída:* ${porto}\n` +
            `⛵ *Embarcação / Motor:* ${barco || 'Barco pantaneiro homologado'}\n` +
            `💬 *WhatsApp Turistas:* ${wpp}\n` +
            `🦺 *Diferenciais:* ${diferenciais.length > 0 ? diferenciais.join(', ') : 'Navegação nativa'}\n\n` +
            `Olá! Sou piloteiro da Bacia do Miranda e gostaria de incluir meu ponto e contato comunitário no WebGIS!`;

          if (navigator.clipboard && navigator.clipboard.writeText) {
            try { await navigator.clipboard.writeText(texto); } catch (_) {}
          }

          const foneDestino = WHATSAPP_CONTATO_OFICIAL ? `&phone=${WHATSAPP_CONTATO_OFICIAL}` : '';
          const urlWpp = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}${foneDestino}`;
          window.open(urlWpp, '_blank');
          vibrar(30);
          showToast('Dados formatados! Encaminhando diretamente à coordenação do GeoFish MS via WhatsApp.');
          destroy();
        });
      }

      const btnCadastroAssistido = modalEl.querySelector('#btn-cadastro-assistido');
      if (btnCadastroAssistido) {
        btnCadastroAssistido.addEventListener('click', () => {
          const textoAssistido = `Olá Peterson! Sou piloteiro da Bacia do Miranda e gostaria de ajuda para cadastrar meu barco e contato no GeoFish MS.`;
          const foneDestino = WHATSAPP_CONTATO_OFICIAL ? `&phone=${WHATSAPP_CONTATO_OFICIAL}` : '';
          const urlWpp = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoAssistido)}${foneDestino}`;
          window.open(urlWpp, '_blank');
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

// Botão Flutuante de GPS no Mapa ("Onde estou")
const btnGpsMapa = document.getElementById('btn-gps');
if (btnGpsMapa) {
  btnGpsMapa.addEventListener('click', () => {
    vibrar(30);
    obterLocalizacao();
  });
}

// Delegador Global de Cliques para data-action (Zero inline handlers para conformidade estrita de CSP)
document.addEventListener('click', (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.getAttribute('data-action');
  switch (action) {
    case 'abrir-cartilha':
      e.preventDefault();
      vibrar(25);
      abrirModalCartilha();
      break;
    case 'abrir-especies':
      e.preventDefault();
      vibrar(25);
      abrirModalEspecies();
      break;
    case 'abrir-parcerias-pousadas':
      e.preventDefault();
      vibrar(25);
      abrirModalParcerias('pousadas');
      break;
    case 'abrir-parcerias-piloteiros':
      e.preventDefault();
      vibrar(25);
      abrirModalParcerias('piloteiros');
      break;
    case 'abrir-sobre':
      e.preventDefault();
      vibrar(25);
      abrirModalSobre();
      break;
    case 'abrir-sos':
      e.preventDefault();
      vibrar(35);
      abrirModalSos();
      break;
    case 'scroll-top':
      e.preventDefault();
      vibrar(20);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'sos-call-marinha':
      e.preventDefault();
      vibrar(35);
      abrirConfirmacaoSos({ tipo: 'call', numero: '185', servico: 'Marinha do Brasil (Capitania Fluvial)' });
      break;
    default:
      break;
  }
});

// 20, 21. Cartilha PMA sob demanda e Prep Offline delegados para módulos ES6.

