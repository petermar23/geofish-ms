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

import GeoFishDB from './db.js';

// Canal de suporte comunitário do projeto
export const WHATSAPP_CONTATO_SUPORTE = null;

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
  abrirModalTelefones,
  fecharModalTelefones
} from './modules/telefones-apoio.js';

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
  preferCanvas: true,
  renderer: L.canvas({ tolerance: 14 })
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

let usandoSatelite = true;
export function alternarMapaBase() {
  if (usandoSatelite) {
    if (map.hasLayer(sateliteEsri)) map.removeLayer(sateliteEsri);
    if (!map.hasLayer(relevoEsri)) relevoEsri.addTo(map);
    usandoSatelite = false;
    showToast('🗺️ Mapa Base: Relevo Topográfico (Esri Topo)');
  } else {
    if (map.hasLayer(relevoEsri)) map.removeLayer(relevoEsri);
    if (!map.hasLayer(sateliteEsri)) sateliteEsri.addTo(map);
    usandoSatelite = true;
    showToast('🛰️ Mapa Base: Imagens de Satélite (Esri Imagery)');
  }
}

// Atribuição de governança cartográfica e autoria cidadã
map.attributionControl.addAttribution('Iniciativa Cidadã: Peterson Martins da Costa | Cartografia Base: Fontes Públicas (SEMADESC / IMASUL)');

// 4. Criação dos Panes do Leaflet com zIndex estrito (Regras de Empilhamento)
const PANES = [
  { name: 'baciasPane', zIndex: 410 },
  { name: 'especiaisPane', zIndex: 420 },
  { name: 'restritasPane', zIndex: 430 },
  { name: 'hidrografiaBasePane', zIndex: 440 },
  { name: 'riosPane', zIndex: 450 },
  { name: 'aglomeradosPane', zIndex: 455 },
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

let ultimoCliqueFeicaoTimestamp = 0;
function registrarCliqueFeicao() {
  ultimoCliqueFeicaoTimestamp = Date.now();
}

function abrirPainel(htmlContent) {
  if (!sheetContent || !bottomSheet) return;
  registrarCliqueFeicao();
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

// Fecha o painel ao clicar em área vazia do mapa (ignora se houver clique recente em feição/popup)
map.on('click', () => {
  if (Date.now() - ultimoCliqueFeicaoTimestamp < 450) {
    return;
  }
  fecharPainel();
});

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
  const bannerIcon = document.getElementById('banner-defeso-icon');
  const btnFechar = document.getElementById('btn-fechar-banner-defeso');

  const badgeTop = document.getElementById('badge-defeso-top');
  const badgeTopIcon = document.getElementById('badge-defeso-icon');
  const badgeTopText = document.getElementById('badge-defeso-text');

  if (badgeTop) {
    if (emDefeso) {
      badgeTop.classList.remove('temporada-aberta');
      badgeTop.classList.add('defeso-ativo');
      if (badgeTopIcon) badgeTopIcon.textContent = '⚠️';
      if (badgeTopText) badgeTopText.textContent = 'Piracema em Vigor (Nov a Fev)';
    } else {
      badgeTop.classList.remove('defeso-ativo');
      badgeTop.classList.add('temporada-aberta');
      if (badgeTopIcon) badgeTopIcon.textContent = '🎣';
      if (badgeTopText) badgeTopText.textContent = 'Temporada Aberta (Cota 1+5)';
    }
  }

  if (banner && bannerText) {
    if (btnFechar && !btnFechar.dataset.listenerAttached) {
      btnFechar.dataset.listenerAttached = 'true';
      btnFechar.addEventListener('click', () => {
        banner.classList.add('hidden');
      });
    }

    if (emDefeso) {
      banner.classList.remove('hidden', 'temporada-aberta');
      banner.classList.add('defeso-ativo');
      if (bannerIcon) bannerIcon.textContent = '⚠️';
      bannerText.innerHTML = `<strong>ALERTA OFICIAL: Período de Defeso da Piracema em vigor no MS (05/Nov a 28/Fev).</strong> Pesca de espécies nativas suspensa para reprodução. Permitidos apenas ecoturismo/contemplação e pesca de subsistência ribeirinha comprovada.`;
    } else {
      banner.classList.remove('hidden', 'defeso-ativo');
      banner.classList.add('temporada-aberta');
      if (bannerIcon) bannerIcon.textContent = '🎣';
      bannerText.innerHTML = `<strong>Temporada de Pesca Esportiva Aberta:</strong> Cota de 1 exemplar nativo regulamentar + 5 piranhas (Dourado 100% Pesque e Solte — Lei nº 6.190/24). Lacre e GCP obrigatórios nos postos da PMA antes da rodovia.`;
    }
  }
  return emDefeso;
}

const LIMITE_PROXIMIDADE_TRECHO_KM = 0.5; // Limite de 500m para considerar o usuário no trecho

function avaliarConformidadePosicao(userLat, userLng) {
  let trechoMaisProximo = null;
  let menorDistanciaTrecho = Infinity;

  const dadosTrechos = dadosCarregados['hidrografia'] || dadosCarregados['rios_principais'];
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

// Helpers para Associação Territorial de Trechos Hidrográficos
function encontrarGuiasDoTrecho(featureTrecho) {
  const dadosGuias = dadosCarregados['guias_credenciados'];
  if (!dadosGuias || !dadosGuias.features || dadosGuias.features.length === 0) return [];
  const p = featureTrecho.properties || {};
  const idTrecho = p.id_trecho;
  const rioNome = (p.titulo || p.rio || '').toLowerCase();
  const colSugerida = (p.colonia_sugerida || '').toLowerCase();

  const filtrados = dadosGuias.features.filter((f) => {
    const gp = f.properties || {};
    if (idTrecho && Array.isArray(gp.trecho_ids) && gp.trecho_ids.includes(idTrecho)) return true;
    if (Array.isArray(gp.rios_atendidos)) {
      if (gp.rios_atendidos.some(r => rioNome.includes(r.toLowerCase()) || r.toLowerCase().includes(rioNome.split(' ')[0]))) return true;
    }
    const gCol = (gp.colonia || '').toLowerCase();
    const gRio = (gp.rio_atuacao || '').toLowerCase();
    const gBase = (gp.porto_base || '').toLowerCase();

    if (colSugerida && gCol.includes(colSugerida.split(' ')[0].toLowerCase())) return true;
    if (rioNome.includes('aquidauana') && (gCol.includes('z-7') || gBase.includes('aquidauana') || gBase.includes('anastácio') || gBase.includes('camisão') || gRio.includes('aquidauana'))) return true;
    if (rioNome.includes('salobra') && (gCol.includes('z-11') || gCol.includes('z-1') || gBase.includes('salobra') || gBase.includes('miranda') || gRio.includes('salobra'))) return true;
    if (rioNome.includes('vermelho') && (gBase.includes('lontra') || gCol.includes('z-1') || gRio.includes('vermelho'))) return true;
    if (rioNome.includes('miranda') && (gCol.includes('z-1') || gBase.includes('miranda') || gRio.includes('miranda'))) return true;
    if (rioNome.includes('negro') && (gCol.includes('z-1') || gCol.includes('z-7') || gBase.includes('negro') || gBase.includes('lajeado'))) return true;
    if (rioNome.includes('paraguai') && (gCol.includes('z-1') || gBase.includes('murtinho') || gBase.includes('corumbá') || gRio.includes('paraguai'))) return true;
    return false;
  });

  return filtrados.length > 0 ? filtrados : dadosGuias.features;
}

function encontrarApoioProximoTrecho(featureTrecho) {
  const dadosApoio = dadosCarregados['pontos_emergencia'];
  if (!dadosApoio || !dadosApoio.features || !featureTrecho.geometry) return null;
  let coordsTrecho = [];
  if (featureTrecho.geometry.type === 'LineString') {
    coordsTrecho = featureTrecho.geometry.coordinates;
  } else if (featureTrecho.geometry.type === 'MultiLineString') {
    coordsTrecho = featureTrecho.geometry.coordinates.flat();
  }
  if (!coordsTrecho || coordsTrecho.length < 2) return null;

  let melhorPonto = null;
  let menorDistancia = Infinity;

  for (const feat of dadosApoio.features) {
    if (!feat.geometry || !feat.geometry.coordinates) continue;
    const ptLng = feat.geometry.coordinates[0];
    const ptLat = feat.geometry.coordinates[1];

    let menorDistPonto = Infinity;
    for (let i = 0; i < coordsTrecho.length - 1; i++) {
      const segA = coordsTrecho[i];
      const segB = coordsTrecho[i + 1];
      if (!segA || !segB) continue;
      const d = distanciaPontoSegmentoKm(ptLat, ptLng, segA[1], segA[0], segB[1], segB[0]);
      if (d < menorDistPonto) menorDistPonto = d;
    }

    const isRampa = Boolean(feat.properties?.possui_rampa === 1 || (feat.properties?.tipo && feat.properties.tipo.toLowerCase().includes('rampa')));
    const pesoDist = isRampa ? menorDistPonto * 0.75 : menorDistPonto;

    if (pesoDist < menorDistancia) {
      menorDistancia = pesoDist;
      melhorPonto = {
        feature: feat,
        distanciaKm: menorDistPonto,
        isRampa
      };
    }
  }

  return melhorPonto;
}

// 6. Painel Detalhado Territorial Unificado para Cursos Fluviais e Rios Principais
function renderizarPainelRio(featureRio) {
  if (!featureRio) return;
  const p = featureRio.properties || {};
  const nomeRio = p.titulo || p.rio || 'Curso Fluvial';
  const status = p.status_pesca || (p.regra ? p.regra : 'Permitida com Cota');
  const cor = obterCorPorStatusPesca(status);
  const isProibido = status === 'Proibida' || (p.regra && p.regra.toLowerCase().includes('proibid'));
  const isPesqueSolte = status === 'Pesque e Solte' || (p.regra && p.regra.toLowerCase().includes('solte'));
  const iconeRegra = isProibido ? '🚫' : (isPesqueSolte ? '🌿' : '🎣');
  const statusTexto = isProibido ? 'Pesca Proibida (Ano Todo)' : (isPesqueSolte ? 'Pesque e Solte Exclusivo' : 'Permitida com Cota (Safra)');
  const cotaTexto = p.cota_abate || p.cota || (isProibido ? 'Zero (Pesca terminantemente proibida)' : (isPesqueSolte ? 'Captura Zero (Devolução imediata obrigatória)' : '1 exemplar nativo + 5 piranhas'));
  const comprimento = p.comprimento_km ? `${p.comprimento_km} km` : (p.extensao_km ? `${p.extensao_km} km` : 'Calha contínua mapeada');
  const baseLegal = p.base_legal || p.norma_ref || (isProibido ? 'Leis nº 1.871/98 e 5.234/18 (Rios Cênicos de MS)' : 'Cartilha do Pescador SEMADESC / IMASUL / PMA');
  const regrasTexto = p.regras_pesca || p.descricao || (isProibido ? 'Pesca terminantemente proibida em qualquer modalidade (embarcada, desembarcada, subaquática ou amadora). Preservação integral da bacia cênica.' : (isPesqueSolte ? 'Pesca amadora e esportiva permitida exclusivamente na modalidade Pesque e Solte, com anzóis sem farpa e devolução imediata.' : 'Permitida na safra oficial para pescador devidamente licenciado junto ao IMASUL/SEMADESC. Respeite as medidas mínimas e máximas.'));

  // Espécies associadas ao trecho
  const especies = [
    { id: 'pintado', nome: 'Pintado / Surubim', faixa: '85 a 125 cm', tipo: 'faixa' },
    { id: 'pacu', nome: 'Pacu', faixa: '45 a 65 cm', tipo: 'faixa' },
    { id: 'cachara', nome: 'Cachara', faixa: '80 a 120 cm', tipo: 'faixa' },
    { id: 'jau', nome: 'Jaú', faixa: '95 a 130 cm', tipo: 'faixa' },
    { id: 'dourado', nome: 'Dourado', faixa: '🚫 Proibido até 2029 (Lei 6.190)', tipo: 'proibido' },
    { id: 'piranha', nome: 'Piranha', faixa: 'Até 5 exemplares cumulativos', tipo: 'cota_extra' }
  ];

  const especiesHtml = especies.map((esp) => {
    const isEspProibido = esp.tipo === 'proibido' || isProibido;
    const isPs = esp.tipo === 'pesque_solte' || isPesqueSolte;
    const classeItem = isEspProibido ? 'proibido' : (isPs ? 'pesque-solte' : '');
    const textoBotao = isEspProibido ? '⚖️ Regra' : '📏 Medir';
    const classeBotao = isEspProibido ? 'btn-trecho-medir btn-medir-proibido' : 'btn-trecho-medir';

    return `
      <div class="trecho-species-item ${classeItem}">
        <div class="trecho-species-info">
          <span class="trecho-species-name">🐟 ${escapeHTML(esp.nome)}</span>
          <span class="trecho-species-badge">${escapeHTML(esp.faixa)}</span>
        </div>
        <button type="button" class="${classeBotao}" data-especie-id="${escapeHTML(esp.id)}" aria-label="Verificar medida de ${escapeHTML(esp.nome)}">
          ${textoBotao}
        </button>
      </div>
    `;
  }).join('');

  // Guias locais correspondentes
  const guiasTrecho = encontrarGuiasDoTrecho(featureRio);
  let guiaHtml = '';
  if (guiasTrecho.length > 0) {
    guiaHtml = guiasTrecho.slice(0, 3).map((guia) => {
      const gp = guia.properties || {};
      const coordsGuia = guia.geometry?.coordinates || null;
      const waNum = gp.contato_wa || WHATSAPP_CONTATO_SUPORTE;
      const waMsg = encodeURIComponent(`Olá ${gp.nome_operacional || 'Piloteiro'}! Vi seu contato no GeoFish MS para o ${nomeRio}. Gostaria de consultar diária de pesca e saída no porto ${gp.porto_base || 'Pantanal'}.`);
      const waUrl = waNum ? `https://wa.me/${waNum}?text=${waMsg}` : null;

      return `
        <div class="trecho-guide-card">
          <div class="trecho-guide-head">
            <div class="trecho-guide-name">${escapeHTML(gp.nome_operacional || gp.nome_completo || 'Piloteiro Credenciado')}</div>
            <span class="trecho-guide-colonia">${escapeHTML(gp.colonia || 'Colônia Tradicional Pantaneira')}</span>
          </div>
          <div class="trecho-guide-meta">
            <strong>Porto Base:</strong> ${escapeHTML(gp.porto_base || 'Bacia do Miranda')}<br>
            <strong>Embarcação:</strong> ${escapeHTML(gp.tipo_barco || 'Bote Pantaneiro')}
          </div>
          <div class="trecho-guide-actions">
            ${waUrl ? `
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-trecho-action whatsapp">
                💬 WhatsApp Direto
              </a>
            ` : ''}
            ${coordsGuia ? `
              <button type="button" class="btn-trecho-action secondary btn-ver-guia-mapa" data-lat="${coordsGuia[1]}" data-lng="${coordsGuia[0]}">
                📍 Ponto no Mapa
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Apoio náutico / Rampa mais próxima
  const apoioMaisProximo = encontrarApoioProximoTrecho(featureRio);
  let rampaHtml = '';
  if (apoioMaisProximo && apoioMaisProximo.feature) {
    const ap = apoioMaisProximo.feature.properties || {};
    const apCoords = apoioMaisProximo.feature.geometry?.coordinates || null;
    const distFormatada = apoioMaisProximo.distanciaKm < 1
      ? `${Math.round(apoioMaisProximo.distanciaKm * 1000)} m`
      : `${apoioMaisProximo.distanciaKm.toFixed(1)} km`;

    rampaHtml = `
      <div class="trecho-ramp-card">
        <div class="trecho-ramp-info">
          <div class="trecho-ramp-title">
            ${apoioMaisProximo.isRampa ? '⚓ Rampa Pública de Embarque' : '🚨 Posto de Fiscalização e Apoio (PMA)'}
          </div>
          <div class="trecho-ramp-name">${escapeHTML(ap.nome || 'Ponto de Apoio')} &bull; a ~${distFormatada}</div>
        </div>
        ${apCoords ? `
          <button type="button" class="btn-trecho-action secondary btn-ver-rampa-mapa" data-lat="${apCoords[1]}" data-lng="${apCoords[0]}" style="flex: 0 0 auto; min-width: auto; padding: 6px 10px;">
            🎯 Ver Rampa
          </button>
        ` : ''}
      </div>
    `;
  }

  const html = `
    <div class="trecho-governance-sheet">
      <!-- 1. Segmento e Regra Territorial -->
      <div class="trecho-header">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
          <span class="badge-tag" style="background-color: ${cor}; font-size: 0.78rem; font-weight: 800; padding: 4px 10px;">
            ${iconeRegra} ${escapeHTML(statusTexto)}
          </span>
          <span style="font-size: 0.72rem; color: #475569; font-weight: 700; background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">
            ${escapeHTML(comprimento)}
          </span>
        </div>
        <h2 class="sheet-title" style="margin: 4px 0 6px 0; font-size: 1.35rem; color: #0b4f6c;">
          ${escapeHTML(nomeRio)}
        </h2>
      </div>

      <!-- 2. Alerta Especial ou Regra Geral -->
      ${isProibido ? `
        <div class="trecho-rule-card proibido" style="background: #fef2f2; border: 1.5px solid #dc2626; border-radius: 12px; padding: 12px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 1.3rem;">🚨</span>
            <div>
              <div style="color: #991b1b; font-weight: 800; font-size: 0.95rem;">CRIME AMBIENTAL INAFIANÇÁVEL</div>
              <div style="color: #b91c1c; font-size: 0.78rem; font-weight: 600;">Preservação Permanente · Tolerância Zero</div>
            </div>
          </div>
          <p style="font-size: 0.83rem; color: #7f1d1d; line-height: 1.45; margin: 4px 0 8px 0;">
            A prática de pesca neste trecho constitui infração gravíssima sujeita a <strong>detenção de 1 a 3 anos</strong>, apreensão de embarcação e equipamentos, além de <strong>multas a partir de R$ 700 + R$ 20/kg</strong> (Lei de Crimes Ambientais 9.605/98 e Leis Estaduais 1.871/98 e 5.234/18).
          </p>
          <div class="trecho-rule-detail" style="border-top: 1px solid #fecaca; padding-top: 6px; margin-top: 6px;">
            <strong>📜 Base Legal:</strong> ${escapeHTML(baseLegal)}
          </div>
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <a href="tel:190" style="flex: 1; text-align: center; text-decoration: none; padding: 8px 12px; font-size: 0.8rem; font-weight: 700; border-radius: 8px; background: #dc2626; color: #fff;">
              🚨 Emergência 190 (PMA)
            </a>
          </div>
        </div>
      ` : `
        <div class="trecho-rule-card ${isPesqueSolte ? 'pesque-solte' : 'cota-padrao'}">
          <div class="trecho-rule-header">
            <span class="trecho-rule-icon">${isPesqueSolte ? '🌿' : '⚖️'}</span>
            <div>
              <div class="trecho-rule-title">
                ${isPesqueSolte ? 'Pesque e Solte Exclusivo' : 'Cota Oficial de Captura e Transporte'}
              </div>
              <div class="trecho-rule-text">${escapeHTML(cotaTexto)}</div>
            </div>
          </div>
          <div class="trecho-rule-detail">
            <strong>📋 Regra de Pesca:</strong> ${escapeHTML(regrasTexto)}
          </div>
          <div class="trecho-rule-detail">
            <strong>📜 Legislação:</strong> ${escapeHTML(baseLegal)}
          </div>
        </div>
      `}

      <!-- 3. Vitrine de Espécies & Régua de Limites Legais -->
      <div class="trecho-section-box">
        <div class="trecho-section-header">
          <div>
            <h3 class="trecho-section-title">🐟 Espécies & Limites Legais</h3>
            <span class="trecho-section-sub">Decretos 15.166/19 e 15.375/20</span>
          </div>
          <button type="button" class="btn-trecho-medir btn-abrir-verificador-geral" style="padding: 6px 12px; font-size: 0.78rem;">
            📏 Abrir Régua Completa
          </button>
        </div>

        <div class="trecho-species-grid">
          ${especiesHtml}
        </div>

        <div class="trecho-dourado-alert">
          <strong>🚫 Dourado (Lei nº 6.190/24):</strong> Abate e transporte 100% PROIBIDOS em todo o MS até 2029. Devolução obrigatória e imediata à água.
        </div>
      </div>

      <!-- 4. Card do Piloteiro Local (se houver) -->
      ${guiaHtml ? `
        <div class="trecho-section-box">
          <div class="trecho-section-header">
            <div>
              <h3 class="trecho-section-title">🚤 Piloteiro / Condutor Regional</h3>
              <span class="trecho-section-sub">Contato Direto</span>
            </div>
          </div>
          ${guiaHtml}
        </div>
      ` : ''}

      <!-- 5. Apoio Náutico / Rampa Pública -->
      ${rampaHtml ? `
        <div>
          ${rampaHtml}
        </div>
      ` : ''}

      <!-- 6. Conformidade e Segurança -->
      <div class="legal-note-box" style="margin-top: 4px;">
        <strong>Conformidade Territorial:</strong> Dados cartográficos integrados pelo GeoFish MS para garantir conformidade legal do pescador e conservação dos rios pantaneiros.
      </div>
    </div>
  `;

  abrirPainel(html);

  // Vincula eventos dos botões interativos
  const painelEl = document.getElementById('sheet-content');
  if (painelEl) {
    painelEl.querySelectorAll('.btn-trecho-medir[data-especie-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idEsp = btn.getAttribute('data-especie-id');
        fecharPainel();
        if (typeof abrirModalEspecies === 'function') {
          abrirModalEspecies(idEsp);
        }
      });
    });

    painelEl.querySelectorAll('.btn-abrir-verificador-geral').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        fecharPainel();
        if (typeof abrirModalEspecies === 'function') {
          abrirModalEspecies();
        }
      });
    });

    painelEl.querySelectorAll('.btn-ver-guia-mapa').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const lat = parseFloat(btn.getAttribute('data-lat'));
        const lng = parseFloat(btn.getAttribute('data-lng'));
        if (!isNaN(lat) && !isNaN(lng)) {
          fecharPainel();
          map.flyTo([lat, lng], 14, { animate: true, duration: 1 });
        }
      });
    });

    painelEl.querySelectorAll('.btn-ver-rampa-mapa').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const lat = parseFloat(btn.getAttribute('data-lat'));
        const lng = parseFloat(btn.getAttribute('data-lng'));
        if (!isNaN(lat) && !isNaN(lng)) {
          fecharPainel();
          map.flyTo([lat, lng], 14, { animate: true, duration: 1 });
        }
      });
    });
  }
}

// Aliases para manter compatibilidade total
function renderizarPainelHidrografia(feature) {
  renderizarPainelRio(feature);
}
function renderizarPainelTrechoPesca(feature) {
  renderizarPainelRio(feature);
}

// 7. Funções Utilitárias de Cores e Estilização da Hidrografia
function obterCorPorStatusPesca(status) {
  switch (status) {
    case 'Proibida':
      return '#dc2626'; // Vermelho vivo para rios cênicos e preservação permanente
    case 'Pesque e Solte':
      return '#f59e0b'; // Laranja / Âmbar para pesca esportiva sem abate
    case 'Permitida com Cota':
    default:
      return '#0284c7'; // Azul ciano hidrográfico para calhas na safra
  }
}

function obterPesoPorStatusPesca(status) {
  switch (status) {
    case 'Proibida':
      return 3.5;
    case 'Pesque e Solte':
      return 3.0;
    case 'Permitida com Cota':
    default:
      return 2.0;
  }
}

// Registro global de feições para interação direta com botões de Popups Leaflet com chave estável
const featuresRegistradas = {};
function obterIdEstavelFeature(feature, prefix = 'feat') {
  if (!feature) return `${prefix}_${Math.random().toString(36).substr(2, 6)}`;
  const p = feature.properties || {};
  const ident = p.id || p.id_trecho || p.id_guia || p.titulo || p.nome || p.rio || '';
  if (ident) {
    const slug = String(ident).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substr(0, 30);
    return `${prefix}_${slug}`;
  }
  return `${prefix}_${Math.random().toString(36).substr(2, 6)}`;
}

// Gerador de Popup Especializado para a Hidrografia Contínua (561 cursos d'água da bacia)
function gerarPopupHidrografia(feature) {
  const p = feature.properties || {};
  const nomeRio = p.titulo || p.rio || 'Curso Fluvial';
  const status = p.status_pesca || 'Permitida com Cota';
  const cor = obterCorPorStatusPesca(status);
  const regras = p.regras_pesca || 'Permitida na safra para pescador devidamente licenciado.';
  const cota = p.cota_abate || '1 exemplar nativo + 5 piranhas';
  const comprimento = p.comprimento_km ? `${p.comprimento_km} km` : 'Calha contínua mapeada';
  const baseLegal = p.base_legal || 'Cartilha do Pescador SEMADESC / IMASUL / PMA';

  const featureId = obterIdEstavelFeature(feature, 'hidro');
  featuresRegistradas[featureId] = feature;

  if (status === 'Proibida') {
    return `
      <div class="geofish-map-popup hidrografia-popup popup-proibida">
        <div class="geofish-map-popup-header">
          <span class="geofish-map-popup-badge" style="background-color: #dc2626;">
            🚫 PESCA 100% PROIBIDA (ANO TODO)
          </span>
        </div>
        <h3 class="geofish-map-popup-title" style="color: #991b1b;">🚫 ${escapeHTML(nomeRio)}</h3>
        <div class="geofish-map-popup-body" style="background: #fef2f2; border: 1.5px solid #f87171;">
          <div style="color: #991b1b; font-weight: 800; font-size: 0.8rem; margin-bottom: 4px;">
            🚨 CRIME AMBIENTAL INAFIANÇÁVEL
          </div>
          <div class="geofish-popup-item">
            <span class="geofish-popup-label">Cota de Abate:</span>
            <span class="geofish-popup-val" style="color: #dc2626; font-weight: 800;">ZERO (Captura proibida)</span>
          </div>
          <div class="geofish-popup-item">
            <span class="geofish-popup-label">Extensão no MS:</span>
            <span class="geofish-popup-val">${escapeHTML(comprimento)}</span>
          </div>
          <div class="geofish-popup-item">
            <span class="geofish-popup-label">Base Legal:</span>
            <span class="geofish-popup-val" style="font-size: 0.72rem; color: #7f1d1d;">${escapeHTML(baseLegal)}</span>
          </div>
          <div style="font-size: 0.72rem; color: #b91c1c; margin-top: 3px; line-height: 1.35;">
            Sanções: Prisão de 1 a 3 anos, apreensão imediata de barco/tralha e multa a partir de R$ 700 + R$ 20/kg.
          </div>
        </div>
        <div class="geofish-map-popup-actions">
          <button type="button" class="btn-popup-ver-painel" data-feature-id="${escapeHTML(featureId)}" style="background: #dc2626;">
            📋 Ver Legislação e Penalidades
          </button>
          <button type="button" class="btn-popup-medir">
            📏 Medidas das Espécies
          </button>
        </div>
      </div>
    `;
  }

  if (status === 'Pesque e Solte') {
    return `
      <div class="geofish-map-popup hidrografia-popup popup-pesque-solte">
        <div class="geofish-map-popup-header">
          <span class="geofish-map-popup-badge" style="background-color: #d97706;">
            🌿 PESQUE E SOLTE EXCLUSIVO
          </span>
        </div>
        <h3 class="geofish-map-popup-title" style="color: #92400e;">🌿 ${escapeHTML(nomeRio)}</h3>
        <div class="geofish-map-popup-body" style="background: #fffbeb; border: 1.5px solid #fcd34d;">
          <div class="geofish-popup-item">
            <span class="geofish-popup-label">Modalidade:</span>
            <span class="geofish-popup-val" style="color: #b45309; font-weight: 700;">Pesca Esportiva sem Abate</span>
          </div>
          <div class="geofish-popup-item">
            <span class="geofish-popup-label">Cota de Abate:</span>
            <span class="geofish-popup-val" style="color: #b45309; font-weight: 800;">Captura Zero (Devolução obrigatória)</span>
          </div>
          <div class="geofish-popup-item">
            <span class="geofish-popup-label">Exigência:</span>
            <span class="geofish-popup-val">Anzol sem farpa obrigatório</span>
          </div>
          <div class="geofish-popup-item">
            <span class="geofish-popup-label">Extensão:</span>
            <span class="geofish-popup-val">${escapeHTML(comprimento)}</span>
          </div>
        </div>
        <div class="geofish-map-popup-actions">
          <button type="button" class="btn-popup-ver-painel" data-feature-id="${escapeHTML(featureId)}" style="background: #d97706;">
            📋 Ver Regras Completas
          </button>
          <button type="button" class="btn-popup-medir">
            📏 Medidas Legais das Espécies
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="geofish-map-popup hidrografia-popup">
      <div class="geofish-map-popup-header">
        <span class="geofish-map-popup-badge" style="background-color: #0284c7;">
          🎣 PESCA PERMITIDA NA SAFRA
        </span>
      </div>
      <h3 class="geofish-map-popup-title">${escapeHTML(nomeRio)}</h3>
      <div class="geofish-map-popup-body">
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Cota de Abate:</span>
          <span class="geofish-popup-val" style="color: #0284c7; font-weight: 700;">${escapeHTML(cota)}</span>
        </div>
        <div class="geofish-popup-item" style="background: #fef2f2; border-left: 3px solid #dc2626; padding: 3px 6px; border-radius: 4px;">
          <span class="geofish-popup-label" style="color: #991b1b; font-weight: 700;">Dourado:</span>
          <span class="geofish-popup-val" style="color: #dc2626; font-weight: 700;">🚫 Proibido até 2029 (Lei 6.190)</span>
        </div>
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Extensão:</span>
          <span class="geofish-popup-val">${escapeHTML(comprimento)}</span>
        </div>
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Base Legal:</span>
          <span class="geofish-popup-val" style="font-size: 0.72rem; color: #64748b;">${escapeHTML(baseLegal)}</span>
        </div>
      </div>
      <div class="geofish-map-popup-actions">
        <button type="button" class="btn-popup-ver-painel" data-feature-id="${escapeHTML(featureId)}">
          📋 Ver Ficha Completa do Rio
        </button>
        <button type="button" class="btn-popup-medir">
          📏 Medidas Legais das Espécies
        </button>
      </div>
    </div>
  `;
}

// Gerador de Popup para Guias e Piloteiros
function gerarPopupGuia(feature) {
  const g = feature.properties || {};
  const isDemonstrativo = Boolean(g.demonstrativo === true || g.homologado === false || !g.credenciado);
  const waUrl = normalizeWhatsApp(g.contato_wa);
  const telUrl = sanitizeTel(g.contato_tel || g.contato_wa);
  const featureId = obterIdEstavelFeature(feature, 'guia');
  featuresRegistradas[featureId] = feature;

  if (isDemonstrativo) {
    return `
      <div class="geofish-map-popup guia-popup">
        <div class="geofish-map-popup-header">
          <span class="geofish-map-popup-badge" style="background-color: #d97706;">
            🚤 Vaga Aberta &bull; Piloteiro
          </span>
        </div>
        <h3 class="geofish-map-popup-title">${escapeHTML(g.nome_operacional || 'Piloteiro Credenciado')}</h3>
        <div class="geofish-map-popup-body">
          <div class="geofish-popup-item">
            <span class="geofish-popup-label">Porto / Base:</span>
            <span class="geofish-popup-val">${escapeHTML(g.porto_base || 'Bacia do Miranda')}</span>
          </div>
          <div class="geofish-popup-item">
            <span class="geofish-popup-label">Colônia:</span>
            <span class="geofish-popup-val">${escapeHTML(g.colonia || 'Z-1 / Z-7 / Z-11')}</span>
          </div>
        </div>
        <div class="geofish-map-popup-actions">
          <button type="button" class="btn-popup-cadastrar-guia">
            ✍️ Cadastrar Barco Gratuitamente
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="geofish-map-popup guia-popup">
      <div class="geofish-map-popup-header">
        <span class="geofish-map-popup-badge" style="background-color: #0284c7;">
          🚤 Piloteiro Comunitário
        </span>
      </div>
      <h3 class="geofish-map-popup-title">${escapeHTML(g.nome_operacional || g.nome_completo || 'Piloteiro Local')}</h3>
      <div class="geofish-map-popup-body">
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Porto Base:</span>
          <span class="geofish-popup-val">${escapeHTML(g.porto_base || 'Pantanal')}</span>
        </div>
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Colônia:</span>
          <span class="geofish-popup-val">${escapeHTML(g.colonia || 'Tradicional')}</span>
        </div>
        ${g.tipo_barco ? `
          <div class="geofish-popup-item">
            <span class="geofish-popup-label">Barco:</span>
            <span class="geofish-popup-val">${escapeHTML(g.tipo_barco)}</span>
          </div>
        ` : ''}
      </div>
      <div class="geofish-map-popup-actions">
        ${waUrl ? `
          <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-popup-action-wa">
            💬 WhatsApp
          </a>
        ` : ''}
        ${telUrl ? `
          <a href="${telUrl}" class="btn-popup-action-tel">
            📞 Ligar
          </a>
        ` : ''}
        <button type="button" class="btn-popup-ver-guia-painel" data-feature-id="${escapeHTML(featureId)}">
          📋 Ficha Completa
        </button>
      </div>
    </div>
  `;
}

// Gerador de Popup para Apoio Náutico e Rampas
function gerarPopupPontoApoio(feature) {
  const a = feature.properties || {};
  const isRampa = Boolean(a.tipo && a.tipo.toLowerCase().includes('rampa'));
  const telUrl = (!isRampa && a.telefone_emergencia) ? sanitizeTel(a.telefone_emergencia) : '';
  const featureId = obterIdEstavelFeature(feature, 'apoio');
  featuresRegistradas[featureId] = feature;

  return `
    <div class="geofish-map-popup apoio-popup">
      <div class="geofish-map-popup-header">
        <span class="geofish-map-popup-badge" style="background-color: ${isRampa ? '#0d9488' : '#ef4444'};">
          ${isRampa ? '⚓ Rampa e Apoio Náutico' : '🚨 Apoio e Emergência'}
        </span>
      </div>
      <h3 class="geofish-map-popup-title">${escapeHTML(a.nome || 'Ponto de Apoio')}</h3>
      <div class="geofish-map-popup-body">
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Tipo:</span>
          <span class="geofish-popup-val">${escapeHTML(a.tipo || 'Apoio')}</span>
        </div>
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Rampa de Barco:</span>
          <span class="geofish-popup-val">${escapeHTML(formatPossuiRampa(a.possui_rampa))}</span>
        </div>
        ${a.endereco ? `
          <div class="geofish-popup-item">
            <span class="geofish-popup-label">Localização:</span>
            <span class="geofish-popup-val">${escapeHTML(a.endereco)}</span>
          </div>
        ` : ''}
      </div>
      <div class="geofish-map-popup-actions">
        ${telUrl ? `
          <a href="${telUrl}" class="btn-popup-action-tel" style="background: #ef4444;">
            📞 Ligar Emergência
          </a>
        ` : ''}
        <button type="button" class="btn-popup-ver-apoio-painel" data-feature-id="${escapeHTML(featureId)}">
          📋 Ver Detalhes
        </button>
      </div>
    </div>
  `;
}

// Gerador de Popup para Unidades de Conservação (uc_ms.geojson)
function gerarPopupAreaRestrita(feature) {
  const u = feature.properties || {};
  const uNome = u.titulo || u.nome || 'Unidade de Conservação';
  const uCat = u.subtitulo || u.categoria || u.grupo || 'Área Protegida';
  const uRegras = u.regras_pesca || 'Unidade de conservação com zoneamento ambiental específico e normas restritivas de pesca.';
  const featureId = obterIdEstavelFeature(feature, 'uc');
  featuresRegistradas[featureId] = feature;

  return `
    <div class="geofish-map-popup restrita-popup">
      <div class="geofish-map-popup-header">
        <span class="geofish-map-popup-badge" style="background-color: #f59e0b;">
          ⚠️ Área Restrita &bull; UC
        </span>
      </div>
      <h3 class="geofish-map-popup-title">${escapeHTML(uNome)}</h3>
      <div class="geofish-map-popup-body">
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Classificação:</span>
          <span class="geofish-popup-val">${escapeHTML(uCat)}</span>
        </div>
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Município:</span>
          <span class="geofish-popup-val">${escapeHTML(u.municipio || 'Mato Grosso do Sul')}</span>
        </div>
        <div class="geofish-popup-item text-alerta-uc">
          <span>⚠️ ${escapeHTML(uRegras)}</span>
        </div>
      </div>
      <div class="geofish-map-popup-actions">
        <button type="button" class="btn-popup-ver-restrita-painel" data-feature-id="${escapeHTML(featureId)}">
          📋 Ler Regulamento da UC
        </button>
      </div>
    </div>
  `;
}

// Gerador de Popup para Rios Principais (Calhas Troncais do MS)
function gerarPopupRioPrincipal(feature) {
  const r = feature.properties || {};
  const nomeRio = r.titulo || r.rio || 'Rio Principal do MS';
  const ext = r.comprimento_km ? `${r.comprimento_km} km` : (r.extensao_km ? `${r.extensao_km} km` : 'Calha Principal');
  const featureId = obterIdEstavelFeature(feature, 'rio');
  featuresRegistradas[featureId] = feature;

  return `
    <div class="geofish-map-popup rio-popup">
      <div class="geofish-map-popup-header">
        <span class="geofish-map-popup-badge" style="background-color: #0284c7;">
          🌊 EIXO FLUVIAL PRINCIPAL DO MS
        </span>
      </div>
      <h3 class="geofish-map-popup-title">🌊 ${escapeHTML(nomeRio)}</h3>
      <div class="geofish-map-popup-body">
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Extensão no MS:</span>
          <span class="geofish-popup-val"><strong>${escapeHTML(ext)}</strong></span>
        </div>
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Cota Oficial:</span>
          <span class="geofish-popup-val" style="color: #0284c7; font-weight: 700;">1 exemplar nativo + 5 piranhas</span>
        </div>
        <div class="geofish-popup-item" style="background: #fef2f2; border-left: 3px solid #dc2626; padding: 4px 6px; border-radius: 4px; margin-top: 4px;">
          <span class="geofish-popup-label" style="color: #991b1b; font-weight: 700;">Alerta Dourado:</span>
          <span class="geofish-popup-val" style="color: #dc2626; font-weight: 700;">🚫 Captura Proibida até 2029 (Lei 6.190)</span>
        </div>
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Licença:</span>
          <span class="geofish-popup-val" style="font-size: 0.72rem; color: #64748b;">Obrigatória Amadora/Desportiva</span>
        </div>
      </div>
      <div class="geofish-map-popup-actions">
        <button type="button" class="btn-popup-ver-painel btn-popup-ver-rio-painel" data-feature-id="${escapeHTML(featureId)}">
          📋 Ficha Completa do Rio
        </button>
        <button type="button" class="btn-popup-medir">
          📏 Régua das Espécies
        </button>
      </div>
    </div>
  `;
}

// Gerador de Popup para Bacia do Miranda
function gerarPopupBacia(feature) {
  const b = feature.properties || {};
  const bNome = b.titulo || b.nome_bacia || 'Bacia do Rio Miranda';
  return `
    <div class="geofish-map-popup bacia-popup">
      <div class="geofish-map-popup-header">
        <span class="geofish-map-popup-badge" style="background-color: #0284c7;">
          🗺️ Delimitação Hidrográfica
        </span>
      </div>
      <h3 class="geofish-map-popup-title">${escapeHTML(bNome)}</h3>
      <div class="geofish-map-popup-body">
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Região:</span>
          <span class="geofish-popup-val">${escapeHTML(b.subtitulo || 'Região Hidrográfica do Paraguai')}</span>
        </div>
        <div class="geofish-popup-item">
          <span class="geofish-popup-label">Área da Bacia:</span>
          <span class="geofish-popup-val">${b.area_km2 ? Number(b.area_km2).toLocaleString('pt-BR') + ' km²' : '43.008 km²'}</span>
        </div>
      </div>
    </div>
  `;
}

// Delegador de Eventos para os Popups Leaflet no Mapa
map.on('popupopen', (e) => {
  const popupEl = e.popup.getElement();
  if (!popupEl) return;

  L.DomEvent.disableClickPropagation(popupEl);
  L.DomEvent.disableScrollPropagation(popupEl);

  popupEl.addEventListener('click', () => {
    registrarCliqueFeicao();
  });

  // Botão Ver Painel (Hidrografia, Rios Principais, ou qualquer feição registrada)
  popupEl.querySelectorAll('.btn-popup-ver-painel, .btn-popup-ver-rio-painel').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      registrarCliqueFeicao();
      const fid = btn.getAttribute('data-feature-id');
      const feat = featuresRegistradas[fid];
      if (feat) {
        renderizarPainelRio(feat);
      }
    });
  });

  // Botão Régua de Medidas
  popupEl.querySelectorAll('.btn-popup-medir').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      registrarCliqueFeicao();
      if (typeof abrirModalEspecies === 'function') {
        abrirModalEspecies();
      }
    });
  });

  // Botão Cadastrar Guia
  popupEl.querySelectorAll('.btn-popup-cadastrar-guia').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      registrarCliqueFeicao();
      if (typeof window.abrirModalParceriasTab === 'function') {
        window.abrirModalParceriasTab('piloteiros');
      }
    });
  });

  // Botão Ficha do Guia
  popupEl.querySelectorAll('.btn-popup-ver-guia-painel').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      registrarCliqueFeicao();
      const fid = btn.getAttribute('data-feature-id');
      const feat = featuresRegistradas[fid];
      if (feat && feat.properties) {
        const g = feat.properties;
        const waUrl = normalizeWhatsApp(g.contato_wa);
        const telUrl = sanitizeTel(g.contato_tel || g.contato_wa);
        abrirPainel(`
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="badge-tag" style="background-color: #0b4f6c; margin: 0;">Piloteiro Local &bull; Cadastro Comunitário</span>
            <span style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Declarado</span>
          </div>
          <h2 class="sheet-title" style="margin-top: 4px;">${escapeHTML(g.nome_operacional || g.nome_completo || 'Piloteiro')}</h2>
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
            🤝 <strong>Contato Direto:</strong> Combine disponibilidade, roteiro e valores diretamente com o profissional.
          </div>
          <div style="display: flex; gap: 8px;">
            ${waUrl ? `
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-cta btn-whatsapp" style="flex: 1; margin: 0; text-align: center; text-decoration: none;">
                💬 WhatsApp
              </a>
            ` : ''}
            ${telUrl ? `
              <a href="${telUrl}" class="btn-cta" style="background: #0284c7; padding: 0 16px; margin: 0; text-decoration: none; display: flex; align-items: center; justify-content: center;">
                📞 Ligar
              </a>
            ` : ''}
          </div>
        `);
      }
    });
  });

  // Botão Ficha de Apoio / Rampa
  popupEl.querySelectorAll('.btn-popup-ver-apoio-painel').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      registrarCliqueFeicao();
      const fid = btn.getAttribute('data-feature-id');
      const feat = featuresRegistradas[fid];
      if (feat && feat.properties) {
        const a = feat.properties;
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
      }
    });
  });

  // Botão Ler Regulamento da UC
  popupEl.querySelectorAll('.btn-popup-ver-restrita-painel').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      registrarCliqueFeicao();
      const fid = btn.getAttribute('data-feature-id');
      const feat = featuresRegistradas[fid];
      if (feat && feat.properties) {
        const u = feat.properties;
        const uNome = u.titulo || u.nome || 'Unidade de Conservação';
        const uCat = u.subtitulo || u.categoria || u.grupo || 'Área Protegida';
        const uRegras = u.regras_pesca || 'Unidade de Conservação com regras ambientais específicas.';
        abrirPainel(`
          <span class="badge-tag" style="background-color: #f57c00;">Unidade de Conservação (${escapeHTML(u.esfera || 'Estadual/Federal')})</span>
          <h2 class="sheet-title">${escapeHTML(uNome)}</h2>
          <div class="data-group">
            <div class="data-item">
              <div class="data-label">Categoria de Manejo</div>
              <div class="data-value">${escapeHTML(uCat)}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Município(s)</div>
              <div class="data-value">${escapeHTML(u.municipio || 'Mato Grosso do Sul')}</div>
            </div>
          </div>
          <div class="legal-note-box">
            <strong>Alerta Ambiental:</strong> ${escapeHTML(uRegras)}
          </div>
        `);
      }
    });
  });

  // Botão Informações do Rio Principal
  popupEl.querySelectorAll('.btn-popup-ver-rio-painel').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      registrarCliqueFeicao();
      const fid = btn.getAttribute('data-feature-id');
      const feat = featuresRegistradas[fid];
      if (feat) {
        const r = feat.properties || {};
        const nomeRio = r.titulo || r.rio || 'Rio Principal';
        abrirPainel(`
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="badge-tag" style="background-color: #0288d1; margin: 0;">Eixo Hidrográfico Principal</span>
            <span style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Troncal Fluvial</span>
          </div>
          <h2 class="sheet-title" style="margin-top: 4px;">${escapeHTML(nomeRio)}</h2>
          <div class="data-group">
            <div class="data-item">
              <div class="data-label">Extensão Mapeada</div>
              <div class="data-value">${r.comprimento_km ? escapeHTML(r.comprimento_km) + ' km' : (r.extensao_km ? escapeHTML(r.extensao_km) + ' km' : 'Hidrografia Base')}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Regra Geral de Pesca (MS)</div>
              <div class="data-value">Cota de 1 nativo na medida regulamentar + 5 piranhas (Dourado Proibido - Pesque e Solte)</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;">
            <button type="button" class="btn-cta btn-abrir-especies-rio" style="flex: 1; min-width: 140px; margin: 0; background: #0284c7; color: #fff; border: none; padding: 12px; border-radius: 6px; font-size: 0.88rem; font-weight: 700; cursor: pointer;">
              📏 Consultar Medidas Legais
            </button>
          </div>
        `);
        const btnEsp = document.querySelector('.btn-abrir-especies-rio');
        if (btnEsp) {
          btnEsp.addEventListener('click', () => {
            fecharPainel();
            if (typeof abrirModalEspecies === 'function') abrirModalEspecies();
          });
        }
      }
    });
  });
});

// 8. Inicialização de Todas as Camadas Vetoriais Otimizadas
async function carregarTodasCamadas() {
  const loadingIndicator = document.getElementById('loading-indicator');
  const loadingText = document.getElementById('loading-text');

  const definicoesCamadas = [
    { key: 'hidrografia', url: 'data/processed/hidrografia.geojson', nome: '💧 Rede Hidrográfica e Regras de Pesca', ativa: true },
    { key: 'rios_principais', url: 'data/processed/rios_principais.geojson', nome: '🌊 Rios Principais', ativa: true },
    { key: 'guias_credenciados', url: 'data/processed/guias_credenciados.geojson', nome: '🚤 Guias Credenciados', ativa: true },
    { key: 'pontos_emergencia', url: 'data/processed/pontos_emergencia.geojson', nome: '⚓ Rampas e Apoio Náutico', ativa: true },
    { key: 'areas_restritas', url: 'data/processed/uc_ms.geojson', nome: '⚠️ Unidades de Conservação (UCs)', ativa: true },
    { key: 'bacias_uepgrh', url: 'data/processed/bacia_miranda.geojson', nome: '🗺️ Delimitação da Bacia do Miranda', ativa: false },
    { key: 'bacias_especiais', url: 'data/processed/bacias_especiais.geojson', nome: '🛡️ Bacias dos Rios Cênicos (Manejo)', ativa: false },
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
      dadosCarregados[def.key] = dados;

      let camadaLeaflet = null;

      // Montagem de cada camada com o pane correto e popups persistentes
      switch (def.key) {
        case 'hidrografia':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'hidrografiaBasePane',
            style: (feature) => {
              const status = feature.properties?.status_pesca;
              return {
                color: obterCorPorStatusPesca(status),
                weight: obterPesoPorStatusPesca(status),
                opacity: status === 'Proibida' ? 0.95 : (status === 'Pesque e Solte' ? 0.9 : 0.8),
                lineCap: 'round',
                lineJoin: 'round'
              };
            },
            onEachFeature: (feature, layer) => {
              const p = feature.properties || {};
              const titulo = p.titulo || 'Curso Fluvial';
              const status = p.status_pesca || 'Permitida com Cota';
              layer.bindTooltip(`<strong>${escapeHTML(titulo)}</strong> &bull; ${escapeHTML(status)}`, {
                className: 'geofish-modern-tooltip',
                direction: 'top',
                offset: [0, -6],
                sticky: true
              });

              layer.bindPopup(() => gerarPopupHidrografia(feature), {
                className: 'geofish-leaflet-popup',
                maxWidth: 340,
                autoPan: true,
                autoPanPadding: [20, 20]
              });

              layer.on({
                mouseover: (e) => {
                  const l = e.target;
                  const st = feature.properties?.status_pesca;
                  l.setStyle({ weight: obterPesoPorStatusPesca(st) + 2.5, opacity: 1 });
                },
                mouseout: (e) => {
                  camadaLeaflet.resetStyle(e.target);
                },
                click: (e) => {
                  if (e && e.originalEvent) {
                    L.DomEvent.stopPropagation(e.originalEvent);
                  }
                  registrarCliqueFeicao();
                  const clickPos = (e && e.latlng) ? e.latlng : null;
                  if (clickPos) {
                    layer.openPopup(clickPos);
                  } else {
                    layer.openPopup();
                  }
                  if (window.innerWidth >= 900) {
                    renderizarPainelRio(feature);
                  }
                }
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
                    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                    color: #ffffff;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 15px;
                    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);
                    border: 2.5px solid #ffffff;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                  ">🚤</div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              });
              return L.marker(latlng, { icon: iconeGuia, pane: 'guiasPane' });
            },
            onEachFeature: (feature, layer) => {
              const gNome = feature.properties?.nome_operacional || 'Guia de Pesca';
              layer.bindTooltip(escapeHTML(gNome), {
                className: 'geofish-modern-tooltip',
                direction: 'top',
                offset: [0, -16]
              });

              layer.bindPopup(() => gerarPopupGuia(feature), {
                className: 'geofish-leaflet-popup',
                maxWidth: 320,
                autoPan: true
              });

              layer.on('click', (e) => {
                if (e && e.originalEvent) {
                  L.DomEvent.stopPropagation(e.originalEvent);
                }
                registrarCliqueFeicao();
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
                    background: ${isRampa ? 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
                    color: #ffffff;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    box-shadow: 0 4px 12px ${isRampa ? 'rgba(13, 148, 136, 0.35)' : 'rgba(239, 68, 68, 0.35)'};
                    border: 2.5px solid #ffffff;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                  ">${isRampa ? '⚓' : '🚨'}</div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              });
              return L.marker(latlng, { icon: iconePonto, pane: 'apoioPane' });
            },
            onEachFeature: (feature, layer) => {
              const aNome = feature.properties?.nome || 'Ponto de Apoio';
              layer.bindTooltip(escapeHTML(aNome), {
                className: 'geofish-modern-tooltip',
                direction: 'top',
                offset: [0, -15]
              });

              layer.bindPopup(() => gerarPopupPontoApoio(feature), {
                className: 'geofish-leaflet-popup',
                maxWidth: 320,
                autoPan: true
              });

              layer.on('click', (e) => {
                if (e && e.originalEvent) {
                  L.DomEvent.stopPropagation(e.originalEvent);
                }
                registrarCliqueFeicao();
              });
            }
          });
          break;

        case 'areas_restritas':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'restritasPane',
            style: {
              color: '#f59e0b',
              fillColor: '#f59e0b',
              weight: 2,
              fillOpacity: 0.22,
              dashArray: '5, 5',
              lineCap: 'round',
              lineJoin: 'round'
            },
            onEachFeature: (feature, layer) => {
              const u = feature.properties || {};
              const uNome = u.titulo || u.nome || 'Unidade de Conservação';
              const uCat = u.subtitulo || u.categoria || u.grupo || 'Área Protegida';
              layer.bindTooltip(`<strong>${escapeHTML(uNome)}</strong> &bull; ${escapeHTML(uCat)}`, {
                className: 'geofish-modern-tooltip',
                direction: 'top',
                offset: [0, -8],
                sticky: true
              });

              layer.bindPopup(() => gerarPopupAreaRestrita(feature), {
                className: 'geofish-leaflet-popup',
                maxWidth: 320,
                autoPan: true
              });

              layer.on('click', (e) => {
                if (e && e.originalEvent) {
                  L.DomEvent.stopPropagation(e.originalEvent);
                }
                registrarCliqueFeicao();
              });
            }
          });
          break;

        case 'rios_principais':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'riosPane',
            style: {
              color: '#0284c7',
              weight: 5.5,
              opacity: 0.92,
              lineCap: 'round',
              lineJoin: 'round'
            },
            onEachFeature: (feature, layer) => {
              const r = feature.properties || {};
              const nomeRio = r.titulo || r.rio || 'Rio Principal';
              layer.bindTooltip(`<strong>${escapeHTML(nomeRio)}</strong> &bull; Eixo Troncal`, {
                className: 'geofish-modern-tooltip',
                direction: 'top',
                offset: [0, -4],
                sticky: true
              });

              layer.bindPopup(() => gerarPopupRioPrincipal(feature), {
                className: 'geofish-leaflet-popup',
                maxWidth: 340,
                autoPan: true,
                autoPanPadding: [20, 20]
              });

              layer.on({
                mouseover: (e) => {
                  e.target.setStyle({ weight: 8, opacity: 1 });
                },
                mouseout: (e) => {
                  camadaLeaflet.resetStyle(e.target);
                },
                click: (e) => {
                  if (e && e.originalEvent) {
                    L.DomEvent.stopPropagation(e.originalEvent);
                  }
                  registrarCliqueFeicao();
                  const clickPos = (e && e.latlng) ? e.latlng : null;
                  if (clickPos) {
                    layer.openPopup(clickPos);
                  } else {
                    layer.openPopup();
                  }
                  if (window.innerWidth >= 900) {
                    renderizarPainelRio(feature);
                  }
                }
              });
            }
          });
          break;

        case 'bacias_uepgrh':
          camadaLeaflet = L.geoJSON(dados, {
            pane: 'baciasPane',
            style: {
              color: '#0284c7',
              fillColor: '#38bdf8',
              weight: 2,
              fillOpacity: 0.08,
              dashArray: '4, 4',
              lineCap: 'round',
              lineJoin: 'round'
            },
            onEachFeature: (feature, layer) => {
              const b = feature.properties || {};
              const bNome = b.titulo || b.nome_bacia || 'Bacia do Rio Miranda';
              layer.bindTooltip(escapeHTML(bNome), {
                className: 'geofish-modern-tooltip',
                direction: 'top',
                offset: [0, -6],
                sticky: true
              });
              layer.bindPopup(() => gerarPopupBacia(feature), {
                className: 'geofish-leaflet-popup',
                maxWidth: 320,
                autoPan: true
              });
              layer.on('click', (e) => {
                if (e && e.originalEvent) {
                  L.DomEvent.stopPropagation(e.originalEvent);
                }
                registrarCliqueFeicao();
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
              weight: 1.8,
              fillOpacity: 0.18,
              dashArray: '6, 6'
            },
            onEachFeature: (feature, layer) => {
              const s = feature.properties || {};
              const nome = s.titulo || s.nome_bacia || 'Bacia Cênica';
              layer.bindTooltip(`<strong>Bacia do Rio ${escapeHTML(nome)}</strong> &bull; Rio Cênico`, {
                className: 'geofish-modern-tooltip',
                direction: 'top',
                offset: [0, -6],
                sticky: true
              });
              layer.bindPopup(`
                <div class="geofish-map-popup">
                  <div class="geofish-map-popup-header">
                    <span class="geofish-map-popup-badge" style="background-color: #9c27b0;">🛡️ Bacia dos Rios Cênicos</span>
                  </div>
                  <h3 class="geofish-map-popup-title">Bacia do Rio ${escapeHTML(nome)}</h3>
                  <div class="geofish-map-popup-body">
                    <div class="geofish-popup-item">
                      <span class="geofish-popup-label">Categoria:</span>
                      <span class="geofish-popup-val">${escapeHTML(s.subtitulo || 'Manejo Especial')}</span>
                    </div>
                    <div class="geofish-popup-item">
                      <span class="geofish-popup-label">Área Total:</span>
                      <span class="geofish-popup-val">${s.area_ha ? Number(s.area_ha).toLocaleString('pt-BR') + ' ha' : 'Mapeada'}</span>
                    </div>
                    <div class="geofish-popup-item text-alerta-uc">
                      <span>🚫 Pesca proibida nas calhas cênicas principais. Preservação integral.</span>
                    </div>
                  </div>
                </div>
              `, { className: 'geofish-leaflet-popup', maxWidth: 300 });
              layer.on('click', (e) => {
                if (e && e.originalEvent) {
                  L.DomEvent.stopPropagation(e.originalEvent);
                }
                registrarCliqueFeicao();
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
              const a = feature.properties || {};
              const aNome = a.titulo || a.nome || 'Comunidade';
              layer.bindTooltip(`<strong>${escapeHTML(aNome)}</strong> &bull; ${escapeHTML(a.municipio || '')}`, {
                className: 'geofish-modern-tooltip',
                direction: 'top',
                offset: [0, -6],
                sticky: true
              });
              layer.bindPopup(`
                <div class="geofish-map-popup">
                  <div class="geofish-map-popup-header">
                    <span class="geofish-map-popup-badge" style="background-color: #795548;">🏘️ Comunidade Pantaneira</span>
                  </div>
                  <h3 class="geofish-map-popup-title">${escapeHTML(aNome)}</h3>
                  <div class="geofish-map-popup-body">
                    <div class="geofish-popup-item">
                      <span class="geofish-popup-label">Classificação:</span>
                      <span class="geofish-popup-val">${escapeHTML(a.subtitulo || a.tipo || 'Comunidade')}</span>
                    </div>
                    <div class="geofish-popup-item">
                      <span class="geofish-popup-label">Município:</span>
                      <span class="geofish-popup-val">${escapeHTML(a.municipio || 'Mato Grosso do Sul')}</span>
                    </div>
                  </div>
                </div>
              `, { className: 'geofish-leaflet-popup', maxWidth: 300 });
              layer.on('click', (e) => {
                if (e && e.originalEvent) {
                  L.DomEvent.stopPropagation(e.originalEvent);
                }
                registrarCliqueFeicao();
              });
            }
          });
          break;
      }

      if (camadaLeaflet) {
        dadosCarregados[def.key] = dados;
        camadasInstanciadas[def.key] = camadaLeaflet;
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
          hidrografia: 'Rede Hidrográfica e Regras Fluviais',
          rios_principais: 'Rios Principais do Estado',
          guias_credenciados: 'Guias de Pesca Credenciados',
          pontos_emergencia: 'Rampas Náuticas e Apoio',
          areas_restritas: 'Unidades de Conservação (UCs)',
          bacias_uepgrh: 'Delimitação da Bacia do Miranda',
          bacias_especiais: 'Bacias dos Rios Cênicos',
          aglomerados_rurais: 'Comunidades Pantaneiras'
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

// ========================================================
// CONTROLE DA SIDEBAR E ABAS DO WEBGIS
// ========================================================

function renderizarSidebarGuias(filtroRegiao = 'todas') {
  const container = document.getElementById('sidebar-guias-list');
  if (!container) return;

  const dados = dadosCarregados['guias_credenciados'];
  if (!dados || !dados.features || dados.features.length === 0) {
    container.innerHTML = '<div style="color: #64748b; padding: 14px; text-align: center;">Nenhum guia carregado no momento.</div>';
    return;
  }

  let features = dados.features;
  if (filtroRegiao === 'z1') {
    features = features.filter(f => {
      const col = (f.properties?.colonia || '').toLowerCase();
      const porto = (f.properties?.porto_base || '').toLowerCase();
      return col.includes('z-1') || col.includes('miranda') || porto.includes('miranda') || porto.includes('lontra');
    });
  } else if (filtroRegiao === 'z7') {
    features = features.filter(f => {
      const col = (f.properties?.colonia || '').toLowerCase();
      const porto = (f.properties?.porto_base || '').toLowerCase();
      return col.includes('z-7') || col.includes('aquidauana') || porto.includes('aquidauana') || porto.includes('anastácio');
    });
  } else if (filtroRegiao === 'z11') {
    features = features.filter(f => {
      const col = (f.properties?.colonia || '').toLowerCase();
      const porto = (f.properties?.porto_base || '').toLowerCase();
      return col.includes('z-11') || col.includes('bonito') || porto.includes('bonito') || porto.includes('águas do miranda');
    });
  }

  if (features.length === 0) {
    container.innerHTML = `
      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; text-align: center; color: #64748b; font-size: 0.85rem;">
        <div style="font-size: 1.5rem; margin-bottom: 6px;">🎣</div>
        <strong>Nenhum piloteiro cadastrado neste polo ainda.</strong>
        <p style="font-size: 0.78rem; margin-top: 6px; line-height: 1.4;">
          Conhece um condutor tradicional desta região? O cadastro com a Colônia é 100% gratuito.
        </p>
        <a href="https://wa.me/5516992667526?text=Ol%C3%A1!%20Gostaria%20de%20indicar%20um%20piloteiro%20para%20o%20GeoFish%20MS." target="_blank" rel="noopener noreferrer" class="btn-guia-wa" style="margin-top: 8px; justify-content: center;">
          <span>📲 Indicar via WhatsApp</span>
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = features.map(feat => {
    const p = feat.properties || {};
    const coords = feat.geometry ? feat.geometry.coordinates : null;
    const lat = coords ? coords[1] : null;
    const lng = coords ? coords[0] : null;
    const isConfirmado = Boolean(p.homologado === true && p.credenciado && p.contato_wa);
    const waUrl = isConfirmado ? normalizeWhatsApp(p.contato_wa) : '';

    return `
      <article class="sidebar-guia-card">
        <div class="sidebar-guia-card-header">
          <div>
            <div class="sidebar-guia-card-title">${escapeHTML(p.nome_operacional || 'Guia de Pesca')}</div>
            <div class="sidebar-guia-card-meta">
              📍 <strong>Colônia:</strong> ${escapeHTML(p.colonia || 'Z-1')} &bull; <strong>Base:</strong> ${escapeHTML(p.porto_base || 'Miranda')}
            </div>
            <div class="sidebar-guia-card-meta" style="color: #64748b;">
              ⛵ <strong>Embarcação:</strong> ${escapeHTML(p.tipo_barco || 'Voadeira pantaneira')}
            </div>
          </div>
          <span class="badge-tag" style="background: ${isConfirmado ? '#15803d' : '#f1f5f9'}; color: ${isConfirmado ? '#ffffff' : '#475569'}; border: ${isConfirmado ? 'none' : '1px solid #cbd5e1'}; font-size: 0.68rem; margin: 0; white-space: nowrap;">
            ${isConfirmado ? '✓ Homologado' : 'Vaga Demonstrativa'}
          </span>
        </div>
        <div class="sidebar-guia-card-actions">
          ${waUrl ? `
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-guia-wa" title="Conversar no WhatsApp">
              <span>💬 WhatsApp</span>
            </a>
          ` : `
            <span style="font-size: 0.72rem; color: #64748b; font-style: italic; align-self: center;">
              Homologação em andamento
            </span>
          `}
          ${(lat && lng) ? `
            <button type="button" class="btn-guia-focar" data-lat="${lat}" data-lng="${lng}" data-nome="${escapeHTML(p.nome_operacional || '')}" title="Ver no Mapa">
              <span>🗺️ Ver no Mapa</span>
            </button>
          ` : ''}
        </div>
      </article>
    `;
  }).join('');

  container.querySelectorAll('.btn-guia-focar').forEach(btn => {
    btn.addEventListener('click', () => {
      const lat = parseFloat(btn.getAttribute('data-lat'));
      const lng = parseFloat(btn.getAttribute('data-lng'));
      const nome = btn.getAttribute('data-nome');
      map.flyTo([lat, lng], 14, { duration: 1.2 });
      showToast(`Localizando: ${nome}`);
      if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('geofish-sidebar');
        if (sidebar) sidebar.classList.add('collapsed');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) backdrop.classList.remove('active');
        map.invalidateSize();
      }
    });
  });
}

function renderizarSidebarPousadas() {
  const container = document.getElementById('sidebar-pousadas-list');
  if (!container) return;

  const dados = dadosCarregados['pontos_emergencia'];
  if (!dados || !dados.features) {
    container.innerHTML = '<div style="color: #64748b; padding: 14px; text-align: center;">Carregando apoios náuticos...</div>';
    return;
  }

  const rampas = dados.features.filter(f => {
    const t = (f.properties?.tipo || '').toLowerCase();
    return t.includes('rampa') || t.includes('porto') || t.includes('apoio') || t.includes('marina') || t.includes('pousada');
  });

  const htmlRampas = rampas.map(feat => {
    const p = feat.properties || {};
    const coords = feat.geometry ? feat.geometry.coordinates : null;
    const lat = coords ? coords[1] : null;
    const lng = coords ? coords[0] : null;
    const temTelefoneValido = p.telefone_emergencia && !p.telefone_emergencia.includes('190') && p.contato_status !== 'sem_telefone';
    const tel = temTelefoneValido ? sanitizeTel(p.telefone_emergencia) : '';

    return `
      <article class="sidebar-guia-card">
        <div class="sidebar-guia-card-header">
          <div>
            <div class="sidebar-guia-card-title">${escapeHTML(p.nome || 'Ponto de Apoio')}</div>
            <div class="sidebar-guia-card-meta">
              ⚓ <strong>Tipo:</strong> ${escapeHTML(p.tipo || 'Rampa Náutica')}
            </div>
            ${p.endereco ? `
              <div class="sidebar-guia-card-meta" style="color: #64748b;">
                📍 ${escapeHTML(p.endereco)}
              </div>
            ` : ''}
            ${!temTelefoneValido ? `
              <div class="sidebar-guia-card-meta" style="color: #64748b; font-style: italic;">
                📞 Sem telefone cadastrado (Acesso público local)
              </div>
            ` : ''}
          </div>
        </div>
        <div class="sidebar-guia-card-actions">
          ${tel ? `
            <a href="${tel}" class="btn-guia-wa" style="background: #0284c7;" title="Ligar">
              <span>📞 Ligar</span>
            </a>
          ` : ''}
          ${(lat && lng) ? `
            <button type="button" class="btn-guia-focar" data-lat="${lat}" data-lng="${lng}" data-nome="${escapeHTML(p.nome || '')}">
              <span>🗺️ Ver no Mapa</span>
            </button>
          ` : ''}
        </div>
      </article>
    `;
  }).join('');

  const htmlModeloPousada = `
    <div style="margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <span style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">🏨 Estrutura de Pousadas &amp; Ranchos</span>
        <span class="badge-tag" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; font-size: 0.65rem; margin: 0;">Ficha Modelo</span>
      </div>
      <article class="sidebar-guia-card" style="border: 1px dashed #94a3b8; background: #f8fafc;">
        <div class="sidebar-guia-card-header">
          <div>
            <div class="sidebar-guia-card-title">Rancho Pantaneiro (Modelo de Ficha)</div>
            <div class="sidebar-guia-card-meta">📍 <strong>Região:</strong> Bacia do Rio Miranda</div>
            <div class="sidebar-guia-card-meta">⚓ <strong>Atracadouro:</strong> Rampa de concreto e trapiche flutuante</div>
            <div class="sidebar-guia-card-meta">🛎️ <strong>Comodidades:</strong> Barcos com motor, gelo, piloteiros e iscas</div>
            <div class="sidebar-guia-card-meta" style="color: #64748b; font-style: italic;">📞 Aguardando homologação do proprietário</div>
          </div>
        </div>
        <div style="font-size: 0.72rem; color: #64748b; margin-top: 6px; padding: 6px 8px; background: #ffffff; border-radius: 4px; border: 1px solid #e2e8f0;">
          ℹ️ <strong>Proprietário:</strong> Anuncie sua pousada ou rancho gratuitamente para aparecer com status Verificado e receber turistas direto no seu contato.
        </div>
      </article>
    </div>
  `;

  container.innerHTML = htmlRampas + htmlModeloPousada;

  container.querySelectorAll('.btn-guia-focar').forEach(btn => {
    btn.addEventListener('click', () => {
      const lat = parseFloat(btn.getAttribute('data-lat'));
      const lng = parseFloat(btn.getAttribute('data-lng'));
      const nome = btn.getAttribute('data-nome');
      map.flyTo([lat, lng], 14, { duration: 1.2 });
      showToast(`Localizando: ${nome}`);
      if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('geofish-sidebar');
        if (sidebar) sidebar.classList.add('collapsed');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) backdrop.classList.remove('active');
        map.invalidateSize();
      }
    });
  });
}

function inicializarSidebarDataGeo() {
  const sidebar = document.getElementById('geofish-sidebar');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const btnCloseSidebar = document.getElementById('btn-close-sidebar');
  const btnOpenSidebarFloat = document.getElementById('btn-open-sidebar-float');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');

  function abrirSidebar() {
    if (sidebar) {
      sidebar.classList.remove('collapsed');
      document.body.classList.add('sidebar-open');
      if (sidebarBackdrop && window.innerWidth <= 768) sidebarBackdrop.classList.add('active');
      setTimeout(() => map.invalidateSize(), 300);
    }
  }

  function fecharSidebar() {
    if (sidebar) {
      sidebar.classList.add('collapsed');
      document.body.classList.remove('sidebar-open');
      if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
      setTimeout(() => map.invalidateSize(), 300);
    }
  }

  function alternarSidebar() {
    if (sidebar) {
      if (sidebar.classList.contains('collapsed')) {
        abrirSidebar();
      } else {
        fecharSidebar();
      }
    }
  }

  if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', alternarSidebar);
  if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', fecharSidebar);
  if (btnOpenSidebarFloat) btnOpenSidebarFloat.addEventListener('click', abrirSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', fecharSidebar);

  // Inicialização de estado conforme viewport
  if (sidebar) {
    if (window.innerWidth <= 768) {
      sidebar.classList.add('collapsed');
      document.body.classList.remove('sidebar-open');
    } else {
      document.body.classList.add('sidebar-open');
    }
  }

  // Alternância de Abas da Sidebar
  document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');
      document.querySelectorAll('.sidebar-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.sidebar-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const pane = document.getElementById(`pane-${tabTarget}`);
      if (pane) pane.classList.add('active');
    });
  });

  // Filtros Regionais da Sidebar (Sincronização Real: Mapa + Lista + Estado)
  document.querySelectorAll('.sidebar-region-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-region-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      const regiao = btn.getAttribute('data-regiao');
      renderizarSidebarGuias(regiao);

      if (camadasInstanciadas['guias_credenciados'] && !map.hasLayer(camadasInstanciadas['guias_credenciados'])) {
        map.addLayer(camadasInstanciadas['guias_credenciados']);
      }

      if (regiao === 'z1') {
        map.flyTo([-20.35, -56.65], 11, { duration: 1.2 });
        showToast('Filtro: Piloteiros de Miranda & Passo do Lontra (Colônia Z-1)');
      } else if (regiao === 'z7') {
        map.flyTo([-20.48, -55.79], 12, { duration: 1.2 });
        showToast('Filtro: Piloteiros de Aquidauana & Anastácio (Colônia Z-7)');
      } else if (regiao === 'z11') {
        map.flyTo([-20.89, -56.12], 12, { duration: 1.2 });
        showToast('Filtro: Piloteiros de Bonito & Águas do Miranda (Colônia Z-11)');
      } else {
        map.fitBounds(BOUNDS_BACIA, { padding: [20, 20] });
        showToast('Filtro: Todas as Regiões da Bacia');
      }
    });
  });

  // Sincronização dos Checkboxes de Camadas (Padrão DataGEO)
  document.querySelectorAll('input[data-camada-key]').forEach(chk => {
    chk.addEventListener('change', () => {
      const key = chk.getAttribute('data-camada-key');
      const camada = camadasInstanciadas[key];
      if (!camada) return;
      if (chk.checked) {
        if (!map.hasLayer(camada)) map.addLayer(camada);
        showToast(`Camada ativada: ${chk.closest('label').textContent.trim()}`);
      } else {
        if (map.hasLayer(camada)) map.removeLayer(camada);
        showToast(`Camada desativada: ${chk.closest('label').textContent.trim()}`);
      }
    });
  });

  // Botões do Header do Geoportal
  const btnTelefonesTop = document.getElementById('btn-telefones-top');
  if (btnTelefonesTop) btnTelefonesTop.addEventListener('click', () => {
    vibrar(20);
    abrirModalTelefones();
  });

  const btnSateliteTop = document.getElementById('btn-satelite-top');
  if (btnSateliteTop) btnSateliteTop.addEventListener('click', alternarMapaBase);

  const btnOfflineTop = document.getElementById('btn-offline-top');
  if (btnOfflineTop) btnOfflineTop.addEventListener('click', () => {
    vibrar(25);
    const btnOfflineOrig = document.getElementById('btn-offline');
    if (btnOfflineOrig) btnOfflineOrig.click();
    else showToast('Camadas GeoJSON e regras salvas offline no IndexedDB.');
  });

  const btnSobreTop = document.getElementById('btn-sobre-top');
  if (btnSobreTop) btnSobreTop.addEventListener('click', () => {
    vibrar(20);
    abrirModalSobre();
  });

  const badgeDefesoTop = document.getElementById('badge-defeso-top');
  if (badgeDefesoTop) badgeDefesoTop.addEventListener('click', () => {
    abrirSidebar();
    const tabRegras = document.getElementById('tab-regras');
    if (tabRegras) tabRegras.click();
  });
}

// Inicialização do aplicativo: carrega camadas, módulos auxiliares, defeso e busca
window.addEventListener('DOMContentLoaded', () => {
  initSpeciesChecker();
  initPWAOffline();
  verificarPeriodoDefeso();
  inicializarSidebarDataGeo();

  carregarTodasCamadas().then(() => {
    renderizarSidebarGuias('todas');
    renderizarSidebarPousadas();

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
    if (camadasInstanciadas['hidrografia']) map.addLayer(camadasInstanciadas['hidrografia']);
    if (camadasInstanciadas['rios_principais']) map.addLayer(camadasInstanciadas['rios_principais']);
    if (camadasInstanciadas['guias_credenciados']) map.addLayer(camadasInstanciadas['guias_credenciados']);
    if (camadasInstanciadas['pontos_emergencia']) map.addLayer(camadasInstanciadas['pontos_emergencia']);
    if (camadasInstanciadas['areas_restritas']) map.addLayer(camadasInstanciadas['areas_restritas']);
    showToast('Exibindo todas as camadas ativas.');
  } else if (tipo === 'regras') {
    if (camadasInstanciadas['hidrografia']) map.addLayer(camadasInstanciadas['hidrografia']);
    if (camadasInstanciadas['rios_principais']) map.addLayer(camadasInstanciadas['rios_principais']);
    showToast('Filtro: Regras de Pesca e Rede Fluvial.');
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

    // 3. Busca em Rios Principais (Eixos Troncais do MS)
    const dadosRios = dadosCarregados['rios_principais'];
    if (dadosRios && dadosRios.features) {
      for (const feat of dadosRios.features) {
        const p = feat.properties || {};
        const rioNome = p.titulo || p.rio || '';
        const rioNorm = formatarTermo(rioNome);
        if (rioNorm.includes(termoNorm)) {
          let coordsCentro = null;
          if (feat.geometry) {
            if (feat.geometry.type === 'LineString' && feat.geometry.coordinates.length > 0) {
              const mid = Math.floor(feat.geometry.coordinates.length / 2);
              coordsCentro = [feat.geometry.coordinates[mid][1], feat.geometry.coordinates[mid][0]];
            } else if (feat.geometry.type === 'MultiLineString' && feat.geometry.coordinates.length > 0) {
              const firstLine = feat.geometry.coordinates[0];
              const mid = Math.floor(firstLine.length / 2);
              coordsCentro = [firstLine[mid][1], firstLine[mid][0]];
            }
          }
          correspondencias.push({
            tipoIcone: '🌊',
            titulo: `${rioNome} (Eixo Troncal)`,
            subtitulo: `Extensão: ${p.comprimento_km || p.extensao_km || '—'} km • Cota: 1 nativo + 5 piranhas`,
            categoria: 'Rio Principal',
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
        const nomeNorm = formatarTermo(p.titulo || p.nome);
        const municNorm = formatarTermo(p.municipio);
        const catNorm = formatarTermo(p.subtitulo || p.categoria || p.grupo);
        if (nomeNorm.includes(termoNorm) || municNorm.includes(termoNorm) || catNorm.includes(termoNorm)) {
          correspondencias.push({
            tipoIcone: '⚠️',
            titulo: p.titulo || p.nome || 'Unidade de Conservação',
            subtitulo: `${p.subtitulo || p.categoria || p.grupo || 'Área Protegida'} • ${p.municipio || 'MS'}`,
            categoria: 'Unidade de Conservação',
            feature: feat
          });
        }
      }
    }

    // 5. Busca na Rede Hidrográfica e Regras Fluviais (561 cursos d'água)
    const dadosHidro = dadosCarregados['hidrografia'];
    if (dadosHidro && dadosHidro.features) {
      for (const feat of dadosHidro.features) {
        const p = feat.properties || {};
        const titNorm = formatarTermo(p.titulo);
        const stNorm = formatarTermo(p.status_pesca);
        const regNorm = formatarTermo(p.regras_pesca);
        if (titNorm.includes(termoNorm) || stNorm.includes(termoNorm) || regNorm.includes(termoNorm)) {
          let coordsCentro = null;
          if (feat.geometry) {
            if (feat.geometry.type === 'LineString' && feat.geometry.coordinates.length > 0) {
              const mid = Math.floor(feat.geometry.coordinates.length / 2);
              coordsCentro = [feat.geometry.coordinates[mid][1], feat.geometry.coordinates[mid][0]];
            } else if (feat.geometry.type === 'MultiLineString' && feat.geometry.coordinates.length > 0) {
              const firstLine = feat.geometry.coordinates[0];
              const mid = Math.floor(firstLine.length / 2);
              coordsCentro = [firstLine[mid][1], firstLine[mid][0]];
            }
          }
          let icone = '🎣';
          if (p.status_pesca === 'Proibida') icone = '🚫';
          else if (p.status_pesca === 'Pesque e Solte') icone = '🌿';

          correspondencias.push({
            tipoIcone: icone,
            titulo: `${p.titulo || 'Curso Fluvial'} (${p.status_pesca || 'Regulado'})`,
            subtitulo: p.regras_pesca || `Cota: ${p.cota_abate || 'Regulamentada'}`,
            categoria: 'Rede Fluvial',
            coords: coordsCentro,
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


// 16. Módulo de Telefones Úteis e Emergência delegado para js/modules/telefones-apoio.js


// ========================================================
// 18. CONTROLES DO PORTAL COMUNITÁRIO & NAVEGAÇÃO DA BACIA
// ========================================================

// Botão para Centralizar e Enquadrar a Bacia do Rio Miranda
const btnCentralizarBacia = document.getElementById('btn-centralizar-bacia');
if (btnCentralizarBacia) {
  btnCentralizarBacia.addEventListener('click', () => {
    vibrar(25);
    if (map) {
      // Enquadramento panorâmico de toda a Bacia Hidrográfica do Rio Miranda (MS)
      map.flyTo([-20.35, -56.35], 9, { duration: 1.2 });
      showToast('Visualização ajustada para a Bacia do Rio Miranda');
    }
  });
}

// Remove qualquer classe residual de tela cheia para evitar aprisionamento de tela
document.body.classList.remove('map-fullscreen');

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

function abrirModalParcerias(aba = 'pousadas', contexto = null) {
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

          if (WHATSAPP_CONTATO_SUPORTE) {
            const urlWpp = `https://wa.me/${WHATSAPP_CONTATO_SUPORTE}?text=${encodeURIComponent(texto)}`;
            window.open(urlWpp, '_blank');
            showToast('Proposta gerada! Encaminhando ao suporte comunitário.');
          } else {
            showToast('Dados copiados para a área de transferência!');
          }
          vibrar(30);
          destroy();
        });
      }

      // 1. FLUXO WHATSAPP-FIRST: Botão Principal de Áudio / Mensagem
      const btnCadastroPiloteiroWpp = modalEl.querySelector('#btn-cadastro-piloteiro-whatsapp');
      if (btnCadastroPiloteiroWpp) {
        btnCadastroPiloteiroWpp.addEventListener('click', async () => {
          let textoMensagem = 'Olá! Sou piloteiro/pescador tradicional e gostaria de cadastrar minha embarcação no GeoFish MS. Seguem meus dados / áudio com meu nome, porto e barco...';
          if (contexto && contexto.rio) {
            textoMensagem = `Olá! Sou piloteiro/pescador tradicional e gostaria de cadastrar minha embarcação no GeoFish MS (atendo na região do ${contexto.rio}). Seguem meus dados / áudio com meu nome, porto e barco...`;
          }

          if (navigator.clipboard && navigator.clipboard.writeText) {
            try { await navigator.clipboard.writeText(textoMensagem); } catch (_) {}
          }

          if (WHATSAPP_CONTATO_SUPORTE) {
            const urlWpp = `https://wa.me/${WHATSAPP_CONTATO_SUPORTE}?text=${encodeURIComponent(textoMensagem)}`;
            window.open(urlWpp, '_blank');
            showToast('Abrindo WhatsApp! Grave seu áudio ou envie seus dados.');
          } else {
            showToast('Texto de apresentação copiado para a área de transferência!');
          }
          vibrar(30);
          destroy();
        });
      }

      // 2. FLUXO SECUNDÁRIO: Formulário Opcional por Escrito
      const btnEnviarCadastroGuia = modalEl.querySelector('#btn-enviar-cadastro-guia');
      if (btnEnviarCadastroGuia) {
        btnEnviarCadastroGuia.addEventListener('click', async () => {
          const nome = modalEl.querySelector('#guia-nome')?.value.trim();
          const apelido = modalEl.querySelector('#guia-apelido')?.value.trim();
          const colonia = modalEl.querySelector('#guia-colonia')?.value;
          const porto = modalEl.querySelector('#guia-porto')?.value.trim();
          const wpp = modalEl.querySelector('#guia-wpp')?.value.trim();
          const barco = modalEl.querySelector('#guia-barco')?.value.trim();

          if (!nome) { vibrar(30); return showToast('Informe seu nome ou apelido.'); }

          const texto = `*CADASTRO COMUNITÁRIO DE PILOTEIRO - GEOFISH MS*\n\n` +
            `🚤 *Nome:* ${nome} ${apelido ? `("${apelido}")` : ''}\n` +
            `📜 *Colônia de Filiação:* ${colonia}\n` +
            `📍 *Porto de Saída:* ${porto || 'A combinar'}\n` +
            `⛵ *Embarcação / Motor:* ${barco || 'Barco homologado'}\n` +
            `💬 *WhatsApp Turistas:* ${wpp || 'Mesmo número deste WhatsApp'}\n\n` +
            `Olá! Sou piloteiro da Bacia do Miranda e gostaria de incluir meu ponto e contato comunitário no WebGIS!`;

          if (navigator.clipboard && navigator.clipboard.writeText) {
            try { await navigator.clipboard.writeText(texto); } catch (_) {}
          }

          if (WHATSAPP_CONTATO_SUPORTE) {
            const urlWpp = `https://wa.me/${WHATSAPP_CONTATO_SUPORTE}?text=${encodeURIComponent(texto)}`;
            window.open(urlWpp, '_blank');
            showToast('Dados formatados! Encaminhando ao suporte comunitário.');
          } else {
            showToast('Dados do piloteiro copiados para a área de transferência!');
          }
          vibrar(30);
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

window.abrirModalParceriasTab = (aba, contexto = null) => abrirModalParcerias(aba, contexto);
window.abrirModalParceiros = () => abrirModalParcerias('pousadas');

const btnParceirosTopo = document.getElementById('btn-parceiros-topo');
const footerBtnParceiros = document.getElementById('footer-btn-parceiros');
const footerBtnPiloteiros = document.getElementById('footer-btn-piloteiros');

if (btnParceirosTopo) btnParceirosTopo.addEventListener('click', () => abrirModalParcerias('pousadas'));
if (footerBtnParceiros) footerBtnParceiros.addEventListener('click', () => abrirModalParcerias('pousadas'));
if (footerBtnPiloteiros) footerBtnPiloteiros.addEventListener('click', () => abrirModalParcerias('piloteiros'));

window.obterPosicaoRio = obterLocalizacao;
window.obterLocalizacao = obterLocalizacao;
window.mostrarToast = showToast;
window.abrirModalTelefones = abrirModalTelefones;
window.fecharModalTelefones = fecharModalTelefones;
window.abrirModalEspecies = abrirModalEspecies;
window.abrirModalSobre = abrirModalSobre;
window.abrirModalParceiros = abrirModalParceiros;
window.abrirModalCartilha = abrirModalCartilha;
window.fecharModalAtivo = fecharModalAtivo;

// Botão adicional na seção de espécies que abre o verificador de medidas
const btnPortalOpenSpecies = document.getElementById('btn-portal-open-species');
if (btnPortalOpenSpecies) {
  btnPortalOpenSpecies.addEventListener('click', () => {
    vibrar(25);
    abrirModalEspecies();
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
    case 'tarefa-explorar-mapa':
      e.preventDefault();
      vibrar(20);
      map.fitBounds(BOUNDS_BACIA, { padding: [20, 20] });
      if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('geofish-sidebar');
        if (sidebar) sidebar.classList.add('collapsed');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) backdrop.classList.remove('active');
        map.invalidateSize();
      } else {
        showToast('Mapa focado na Bacia do Rio Miranda');
      }
      break;
    case 'tarefa-consultar-regras':
      e.preventDefault();
      vibrar(20);
      abrirModalEspecies();
      break;
    case 'tarefa-encontrar-servicos':
      e.preventDefault();
      vibrar(20);
      const tabGuias = document.getElementById('tab-guias');
      if (tabGuias) tabGuias.click();
      break;
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
    case 'abrir-telefones':
      e.preventDefault();
      vibrar(20);
      abrirModalTelefones();
      break;
    case 'scroll-top':
      e.preventDefault();
      vibrar(20);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    default:
      break;
  }
});

// 20, 21. Cartilha PMA sob demanda e Prep Offline delegados para módulos ES6.

