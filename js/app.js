// 1. Inicializar o mapa centrado na Bacia do Rio Miranda
const map = L.map('map', {
  center: [-20.50, -56.50],
  zoom: 9,
  zoomControl: false // Ocultado para reposicionar na interface móvel
});

// Reposiciona o controlo de zoom para o canto superior direito
L.control.zoom({ position: 'topright' }).addTo(map);

// 2. Camada base de azulejos (Tiles) - Mudamos para a Esri (Robusto, sem API key)
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 16,
  attribution: '© Esri & GeoFish MS'
}).addTo(map);

// 2.1. Adicionar Créditos Oficiais dos Dados (SEMADESC/MS)
map.attributionControl.addAttribution('Dados Geoespaciais Oficiais: <a href="https://www.pinms.ms.gov.br/arcgis/rest/services/SEMADESC/SEMADESC_MAPAS/MapServer" target="_blank">Governo de Mato Grosso do Sul (SEMADESC/IMASUL)</a>');

// 3. Regras de cores para os segmentos
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

// 4. Elementos da interface para a Bottom Sheet
const bottomSheet = document.getElementById('bottom-sheet');
const sheetContent = document.getElementById('sheet-content');
const closeSheetBtn = document.getElementById('close-sheet');

if (closeSheetBtn) {
  closeSheetBtn.addEventListener('click', () => {
    bottomSheet.classList.add('hidden');
  });
}

function exibirDetalhes(html) {
  sheetContent.innerHTML = html;
  bottomSheet.classList.remove('hidden');
}

// Panes para ordem de desenho (evitar bugs de z-index)
map.createPane('areas'); map.getPane('areas').style.zIndex = 410;
map.createPane('linhas'); map.getPane('linhas').style.zIndex = 420;
map.createPane('pontos'); map.getPane('pontos').style.zIndex = 430;

// Lógica de Cache Inteligente (Stale-while-revalidate / Offline-First)
async function carregarCamadaComCache(layerKey, url) {
    let dados = await GeoFishDB.obterCamada(layerKey);
    
    // Dispara a atualização em plano de fundo sem travar a interface
    fetch(url, { cache: 'no-cache' })
      .then(r => r.json())
      .then(d => GeoFishDB.salvarCamada(layerKey, d))
      .catch(e => console.log('Sincronização em bg falhou, mantendo dados offline.', e));

    if (!dados) {
        // Se for a primeira vez e o IndexedDB estiver vazio, espera a rede.
        try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response.ok) dados = await response.json();
        } catch (e) {
            console.error('Falha crítica: Sem rede e banco vazio.', e);
        }
    }
    return dados;
}

// 5. Inicialização e carregamento das camadas com suporte offline
const controleCamadas = L.control.layers(null, null, { collapsed: true, position: 'topleft' }).addTo(map);

async function inicializarCamadas() {
  // A. Trechos de Pesca (Linhas com regras de restrição)
  const dadosTrechos = await carregarCamadaComCache('trechos_pesca', 'data/processed/trechos_pesca.geojson');
  if (dadosTrechos) {
    const layerTrechos = L.geoJSON(dadosTrechos, {
      style: (feature) => {
        return {
          color: obterCorPorRegra((feature.properties || {}).regra),
          weight: 8, // Aumentado para acessibilidade de toque
          opacity: 0.8
        };
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e); // Evita cliques em camadas sobrepostas
          const t = feature.properties || {};
          exibirDetalhes(`
            <span class="badge" style="background-color: ${obterCorPorRegra(t.regra)};">Regra: ${t.regra}</span>
            <h3>${t.rio || 'Trecho de Rio'}</h3>
            <p><strong>Normativa:</strong> ${t.normativa || 'Consulte o IMASUL'}</p>
            <p><strong>Período:</strong> ${t.periodo || 'Ano todo'}</p>
            <hr>
            <p><small>${t.observacao || 'Respeite a sinalização local.'}</small></p>
          `);
        });
      }
    }).addTo(map);
    controleCamadas.addOverlay(layerTrechos, "🎣 Regras de Pesca (Trechos)");
  }

  // B. Guias e Condutores Credenciados (Pontos)
  const dadosGuias = await carregarCamadaComCache('guias_colonia', 'data/processed/guias_credenciados.geojson');
  if (dadosGuias) {
    const layerGuias = L.geoJSON(dadosGuias, {
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          pane: 'pontos',
          radius: 7,
          fillColor: '#0b4f6c',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 0.9
        });
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', () => {
          const g = feature.properties || {};
          const linkWhatsapp = g.contato_wa ? `https://wa.me/${g.contato_wa.replace(/\D/g, '')}` : '#';
          exibirDetalhes(`
            <span class="badge" style="background-color: #0b4f6c;">Guia Credenciado</span>
            <h3>${g.nome_operacional || 'Condutor de Pesca'}</h3>
            <p><strong>Colónia:</strong> ${g.colonia || 'Z-1 / Z-7'}</p>
            <p><strong>Base Habitual:</strong> ${g.porto_base || 'Não informado'}</p>
            <p><strong>Embarcação:</strong> ${g.tipo_barco || 'Barco a motor'}</p>
            ${g.contato_wa ? `<a href="${linkWhatsapp}" target="_blank" class="btn-contato">Contactar via WhatsApp</a>` : ''}
          `);
        });
      }
    }).addTo(map);
    controleCamadas.addOverlay(layerGuias, "🚤 Guias Credenciados");
  }

  // C. Infraestrutura de Apoio e Emergência (Pontos)
  const dadosApoio = await carregarCamadaComCache('pontos_emergencia', 'data/processed/pontos_emergencia.geojson');
  if (dadosApoio) {
    const layerApoio = L.geoJSON(dadosApoio, {
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          pane: 'pontos',
          radius: 6,
          fillColor: '#d32f2f',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 0.9
        });
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', () => {
          const a = feature.properties || {};
          exibirDetalhes(`
            <span class="badge" style="background-color: #d32f2f;">Apoio / Emergência</span>
            <h3>${a.nome || 'Ponto de Apoio'}</h3>
            <p><strong>Tipo:</strong> ${a.tipo || 'Utilidade Pública'}</p>
            ${a.telefone_emergencia ? `<p><strong>Contato:</strong> <a href="tel:${a.telefone_emergencia}">${a.telefone_emergencia}</a></p>` : ''}
            <p><strong>Rampa para Barcos:</strong> ${a.possui_rampa ? 'Sim' : 'Não'}</p>
          `);
        });
      }
    }).addTo(map);
    controleCamadas.addOverlay(layerApoio, "🏥 Apoio e Emergência");
  }

  // D. Áreas Restritas (Polígonos de Unidades de Conservação)
  const dadosRestritos = await carregarCamadaComCache('areas_restritas', 'data/processed/areas_restritas.geojson');
  if (dadosRestritos) {
    const layerRestritas = L.geoJSON(dadosRestritos, {
      pane: 'areas',
      style: {
        color: '#ff9800',
        fillColor: '#ff9800',
        weight: 2,
        fillOpacity: 0.2,
        dashArray: '5, 5'
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', () => {
          const u = feature.properties || {};
          exibirDetalhes(`
            <span class="badge" style="background-color: #ff9800;">Área de Preservação (${u.esfera})</span>
            <h3>${u.nome || 'Unidade de Conservação'}</h3>
            <p><strong>Categoria:</strong> ${u.categoria}</p>
            <p><strong>Município:</strong> ${u.municipio}</p>
            <p><small><strong>Atenção:</strong> Verifique as normativas específicas desta área. A pesca pode ser proibida ou restrita à Cota Zero.</small></p>
          `);
        });
      }
    }).addTo(map);
    controleCamadas.addOverlay(layerRestritas, "⚠️ Áreas Restritas / UCs");
  }

  // E. Limites de Bacias UEPGRH (Polígonos de Fundo)
  const dadosBacias = await carregarCamadaComCache('bacias_uepgrh', 'data/processed/bacias_uepgrh.geojson');
  if (dadosBacias) {
    const layerBacias = L.geoJSON(dadosBacias, {
      style: {
        color: '#1976d2',
        fillColor: '#64b5f6',
        weight: 1,
        fillOpacity: 0.1,
        dashArray: '4, 4'
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', () => {
          const b = feature.properties || {};
          exibirDetalhes(`
            <span class="badge" style="background-color: #1976d2;">Bacia Hidrográfica</span>
            <h3>${b.nome_bacia || 'Bacia Desconhecida'}</h3>
            <p><strong>Rio Principal:</strong> ${b.rio_principal || 'Não informado'}</p>
            <p><strong>Área:</strong> ${Number(b.area_km2).toLocaleString('pt-BR')} km²</p>
          `);
        });
      }
    }).addTo(map);
    controleCamadas.addOverlay(layerBacias, "🗺️ Bacias Hidrográficas (UEPGRH)");
  }

  // F. Rios Principais do Estado (Linhas Globais)
  const dadosRios = await carregarCamadaComCache('rios_principais', 'data/processed/rios_principais.geojson');
  if (dadosRios) {
    const layerRios = L.geoJSON(dadosRios, {
      style: {
        color: '#0288d1',
        weight: 8, // Aumentado para acessibilidade de toque
        opacity: 0.5,
        dashArray: '2, 6'
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', () => {
          const r = feature.properties || {};
          exibirDetalhes(`
            <span class="badge" style="background-color: #0288d1;">Rio Principal (Macro)</span>
            <h3>${r.rio || 'Rio Desconhecido'}</h3>
            <p><strong>Extensão Mapeada:</strong> ${r.extensao_km > 0 ? r.extensao_km + ' km' : 'Não informada'}</p>
            <p><small>Nota: Para regras de pesca específicas, consulte a hidrografia oficial aproximando o mapa.</small></p>
          `);
        });
      }
    }).addTo(map);
    controleCamadas.addOverlay(layerRios, "🌊 Rios Principais (Estado)");
  }

  // G. Bacias Especiais (Manejo/Zoneamento)
  const dadosEspeciais = await carregarCamadaComCache('bacias_especiais', 'data/processed/bacias_especiais.geojson');
  if (dadosEspeciais) {
    const layerEspeciais = L.geoJSON(dadosEspeciais, {
      style: {
        color: '#9c27b0', // Roxo
        fillColor: '#ce93d8',
        weight: 2,
        fillOpacity: 0.15,
        dashArray: '6, 6'
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', () => {
          const e = feature.properties || {};
          exibirDetalhes(`
            <span class="badge" style="background-color: #9c27b0;">Área Especial de Manejo</span>
            <h3>${e.nome_bacia || 'Bacia Especial'}</h3>
            <p><strong>Área Coberta:</strong> ${Number(e.area_ha).toLocaleString('pt-BR')} Hectares</p>
            <p><small>Atenção: Esta bacia possui regulamentações pesqueiras exclusivas ou de zoneamento ambiental.</small></p>
          `);
        });
      }
    }).addTo(map);
    controleCamadas.addOverlay(layerEspeciais, "🎯 Bacias Especiais (Manejo)");
  }

  // H. Aglomerados Rurais (Polígonos)
  const dadosAglomerados = await carregarCamadaComCache('aglomerados_rurais', 'data/processed/aglomerados_rurais.geojson');
  if (dadosAglomerados) {
    const layerAglomerados = L.geoJSON(dadosAglomerados, {
      style: {
        color: '#795548', // Marrom terra
        fillColor: '#8d6e63',
        weight: 1,
        fillOpacity: 0.4,
        dashArray: '3, 3'
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', () => {
          const a = feature.properties || {};
          exibirDetalhes(`
            <span class="badge" style="background-color: #795548;">Aglomerado Rural</span>
            <h3>${a.nome || 'Comunidade'}</h3>
            <p><strong>Tipo:</strong> ${a.tipo || 'Rural'}</p>
            <p><strong>Município:</strong> ${a.municipio || 'Não informado'}</p>
            <p><small>Comunidades ribeirinhas ou aglomerados rurais mapeados.</small></p>
          `);
        });
      }
    }).addTo(map);
    controleCamadas.addOverlay(layerAglomerados, "🏘️ Aglomerados Rurais");
  }
}

// Inicia as camadas após o carregamento da página
window.addEventListener('DOMContentLoaded', inicializarCamadas);

// 6. Registro do Service Worker (PWA Offline)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('PWA: Service Worker registrado com sucesso!', reg.scope))
            .catch(err => console.error('PWA: Erro ao registrar Service Worker:', err));
    });
}

// 7. Lógica de Localização sob demanda (Onde estou agora?)
let marcadorPosicao = null;
let circuloPrecisao = null;

const btnLocalizacao = document.getElementById('btn-localizacao');

if (btnLocalizacao) {
  btnLocalizacao.addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
      alert('O seu telemóvel/navegador não suporta geolocalização.');
      return;
    }

    // Feedback visual no botão enquanto obtém o sinal de satélite
    btnLocalizacao.textContent = 'A obter GPS...';
    btnLocalizacao.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const lat = posicao.coords.latitude;
        const lng = posicao.coords.longitude;
        const precisao = Math.round(posicao.coords.accuracy); // Margem de erro em metros

        // Remove marcadores anteriores de posição, se existirem
        if (marcadorPosicao) map.removeLayer(marcadorPosicao);
        if (circuloPrecisao) map.removeLayer(circuloPrecisao);

        // 1. Círculo de precisão do GPS
        circuloPrecisao = L.circle([lat, lng], {
          radius: precisao,
          color: '#1976d2',
          fillColor: '#64b5f6',
          fillOpacity: 0.2,
          weight: 1
        }).addTo(map);

        // 2. Marcador da posição atual do pescador
        marcadorPosicao = L.circleMarker([lat, lng], {
          radius: 9,
          fillColor: '#0288d1',
          color: '#ffffff',
          weight: 3,
          fillOpacity: 1
        }).addTo(map);

        marcadorPosicao.bindPopup(`
          <strong>Você está aqui!</strong><br>
          Precisão do GPS: cerca de ${precisao} metros.<br>
          <small>Toque na linha do rio ao lado para ver as regras de pesca.</small>
        `).openPopup();

        // Centra o mapa na posição obtida com zoom de detalhe
        map.setView([lat, lng], 14);

        // Restaura o botão
        btnLocalizacao.textContent = '📍 Minha Posição';
        btnLocalizacao.disabled = false;
      },
      (erro) => {
        let mensagem = 'Não foi possível obter a sua localização.';
        if (erro.code === erro.PERMISSION_DENIED) {
          mensagem = 'Permissão de localização negada. Ative o GPS nas definições do telemóvel.';
        } else if (erro.code === erro.POSITION_UNAVAILABLE) {
          mensagem = 'Sinal de GPS indisponível no momento.';
        } else if (erro.code === erro.TIMEOUT) {
          mensagem = 'O tempo para obter o sinal de satélite expirou.';
        }
        alert(mensagem);
        btnLocalizacao.textContent = '📍 Minha Posição';
        btnLocalizacao.disabled = false;
      },
      {
        enableHighAccuracy: true, // Força a utilização do chip de GPS em vez de IP/antena
        timeout: 15000,           // Limite de 15 segundos para resposta
        maximumAge: 0             // Garante que a leitura não vem de cache antigo
      }
    );
  });
}
