/**
 * GeoFish MS - Módulo PWA & Governança de Modo Offline
 * Suporte a operação em celular sem internet no barco, Service Worker e Instalação A2HS
 */

import { vibrar, showToast } from './utils.js';

let deferredInstallPrompt = null;

export function atualizarStatusRede() {
  const statusRedeEl = document.getElementById('status-rede');
  if (!statusRedeEl) return;

  if (navigator.onLine) {
    statusRedeEl.innerHTML = '<span class="status-dot"></span> Online';
    statusRedeEl.className = '';
  } else {
    statusRedeEl.innerHTML = '<span class="status-dot"></span> Modo Offline';
    statusRedeEl.className = 'offline';
  }
}

export function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    const hadController = Boolean(navigator.serviceWorker.controller);

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          reg.update();
        })
        .catch((err) => {
          console.warn('Erro ao registrar Service Worker do PWA:', err);
        });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Primeira instalação: assume controle em segundo plano sem recarregar a tela
      if (!hadController) {
        return;
      }
      // Atualização com formulário em preenchimento: notifica o usuário sem recarregar destrutivamente
      showToast('O GeoFish MS foi atualizado em segundo plano.', 'info');
    });
  }
}

import { abrirModalDeTemplate } from './modal-manager.js';

let modalInstallInstancia = null;

export function abrirModalInstall() {
  modalInstallInstancia = abrirModalDeTemplate('template-modal-install', {
    modalId: 'modal-install',
    onDestroy: () => {
      modalInstallInstancia = null;
    }
  });
}

export function fecharModalInstall() {
  if (modalInstallInstancia) {
    modalInstallInstancia.destroy();
    modalInstallInstancia = null;
  }
}

export function initPWAOffline() {
  atualizarStatusRede();

  // Solicita persistência de dados no dispositivo para evitar expurgo de cache/IndexedDB
  if (typeof window !== 'undefined' && window.GeoFishDB) {
    window.GeoFishDB.solicitarPersistencia();
  }

  window.addEventListener('online', () => {
    atualizarStatusRede();
    showToast('Conexão restabelecida: Você está online.');
  });

  window.addEventListener('offline', () => {
    atualizarStatusRede();
    showToast('Você está offline: GeoFish MS operando com dados salvos no celular.');
  });

  registrarServiceWorker();

  // Controle de Instalação PWA
  const btnInstallPWA = document.getElementById('btn-install-pwa');
  const androidBanner = document.getElementById('android-install-banner');
  const btnAndroidInstall = document.getElementById('btn-android-install');
  const btnAndroidDismiss = document.getElementById('btn-android-dismiss');

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (btnInstallPWA) {
    if (isStandalone) {
      btnInstallPWA.style.display = 'none';
    } else {
      btnInstallPWA.addEventListener('click', () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          deferredInstallPrompt.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') {
              if (btnInstallPWA) btnInstallPWA.style.display = 'none';
              if (androidBanner) androidBanner.classList.add('hidden');
            }
            deferredInstallPrompt = null;
          });
        } else {
          abrirModalInstall();
        }
      });
    }
  }

  // Captura o evento nativo de instalação no Android (Google Chrome & Samsung Internet)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;

    if (btnInstallPWA) btnInstallPWA.style.display = 'inline-flex';

    if (!isStandalone && androidBanner) {
      const bannerDispensado = sessionStorage.getItem('pwa_banner_dismissed');
      if (!bannerDispensado) {
        setTimeout(() => {
          androidBanner.classList.remove('hidden');
        }, 3000);
      }
    }
  });

  if (btnAndroidInstall) {
    btnAndroidInstall.addEventListener('click', () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then((choice) => {
          if (choice.outcome === 'accepted') {
            if (androidBanner) androidBanner.classList.add('hidden');
            if (btnInstallPWA) btnInstallPWA.style.display = 'none';
          }
          deferredInstallPrompt = null;
        });
      } else {
        abrirModalInstall();
      }
    });
  }

  if (btnAndroidDismiss) {
    btnAndroidDismiss.addEventListener('click', () => {
      if (androidBanner) androidBanner.classList.add('hidden');
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
    });
  }

  window.addEventListener('appinstalled', () => {
    if (androidBanner) androidBanner.classList.add('hidden');
    if (btnInstallPWA) btnInstallPWA.style.display = 'none';
    deferredInstallPrompt = null;
    showToast('GeoFish MS instalado com sucesso no seu aparelho!', 'info');
  });

  // Catálogo oficial de camadas vetoriais fundamentais para navegação fluvial offline
  const CAMADAS_PARA_OFFLINE = [
    { key: 'trechos_pesca', url: 'data/processed/trechos_pesca.geojson', nome: 'Regras de Pesca' },
    { key: 'guias_credenciados', url: 'data/processed/guias_credenciados.geojson', nome: 'Guias Credenciados' },
    { key: 'pontos_emergencia', url: 'data/processed/pontos_emergencia.geojson', nome: 'Apoio e Emergência' },
    { key: 'areas_restritas', url: 'data/processed/areas_restritas.geojson', nome: 'Áreas Restritas (UCs)' },
    { key: 'rios_principais', url: 'data/processed/rios_principais.geojson', nome: 'Rios Principais' },
    { key: 'bacias_uepgrh', url: 'data/processed/bacias_uepgrh.geojson', nome: 'Bacias Hidrográficas' },
    { key: 'bacias_especiais', url: 'data/processed/bacias_especiais.geojson', nome: 'Bacias Especiais' },
    { key: 'aglomerados_rurais', url: 'data/processed/aglomerados_rurais.geojson', nome: 'Aglomerados Rurais' }
  ];

  // Botão "Salvar para o Barco" (Modo 100% Offline Verificável)
  const btnPrepOffline = document.getElementById('btn-prep-offline');
  if (btnPrepOffline) {
    btnPrepOffline.addEventListener('click', async () => {
      vibrar([40, 60, 40]);
      btnPrepOffline.disabled = true;

      try {
        if (navigator.onLine) {
          let baixadas = 0;
          const total = CAMADAS_PARA_OFFLINE.length;

          // Notifica service worker para garantir os assets shell
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'PRECACHE_CHECK' });
          }

          // Solicita armazenamento persistente no navegador
          if (window.GeoFishDB) {
            await window.GeoFishDB.solicitarPersistencia();
          }

          for (let i = 0; i < total; i++) {
            const c = CAMADAS_PARA_OFFLINE[i];
            btnPrepOffline.innerHTML = `⏳ Baixando ${c.nome} (${i + 1}/${total})...`;

            try {
              const resp = await fetch(c.url, { cache: 'no-cache' });
              if (resp.ok) {
                const json = await resp.json();
                if (json && json.features && json.features.length > 0) {
                  const etag = resp.headers.get('ETag') || '1.0';
                  if (window.GeoFishDB) {
                    await window.GeoFishDB.salvarCamada(c.key, json, etag, etag);
                  }
                  if ('caches' in window) {
                    const cache = await caches.open('geofish-geojson-v2');
                    const fullUrl = new URL(c.url, window.location.href).href;
                    await cache.put(fullUrl, new Response(JSON.stringify(json), {
                      status: 200,
                      headers: { 'Content-Type': 'application/json' }
                    }));
                  }
                  baixadas++;
                }
              }
            } catch (errCamada) {
              console.warn(`[PWA Offline] Falha ao baixar camada ${c.key}:`, errCamada);
            }
          }

          if (baixadas === total) {
            btnPrepOffline.innerHTML = `✅ Pronto para o Rio! (${baixadas}/${total} Camadas)`;
            btnPrepOffline.style.background = '#15803d';
            btnPrepOffline.style.color = '#ffffff';
            showToast(`Sucesso! As ${total} camadas vetoriais estão salvas na memória local. O mapa base de satélite é salvo conforme você navega na região (até 1.500 quadrículas).`, 'info');
          } else {
            btnPrepOffline.innerHTML = `⚠️ ${baixadas} de ${total} Salvas (Tentar de novo)`;
            btnPrepOffline.style.background = '#b45309';
            btnPrepOffline.style.color = '#ffffff';
            showToast(`${baixadas} de ${total} camadas salvas. Toque novamente para completar o download.`, 'warning');
          }
        } else {
          // Usuário já está offline: checa quantas camadas de fato existem no IndexedDB
          let salvasOffline = 0;
          if (window.GeoFishDB) {
            for (const c of CAMADAS_PARA_OFFLINE) {
              const cached = await window.GeoFishDB.obterCamada(c.key);
              if (cached && cached.data && cached.data.features && cached.data.features.length > 0) {
                salvasOffline++;
              }
            }
          }

          if (salvasOffline === CAMADAS_PARA_OFFLINE.length) {
            btnPrepOffline.innerHTML = `✅ Recursos Salvos (${salvasOffline}/${CAMADAS_PARA_OFFLINE.length})`;
            btnPrepOffline.style.background = '#15803d';
            btnPrepOffline.style.color = '#ffffff';
            showToast(`Modo offline ativo: todas as ${salvasOffline} camadas estão disponíveis no celular.`, 'info');
          } else {
            btnPrepOffline.innerHTML = `⚠️ ${salvasOffline} de ${CAMADAS_PARA_OFFLINE.length} Salvas`;
            btnPrepOffline.style.background = '#b45309';
            btnPrepOffline.style.color = '#ffffff';
            showToast(`Modo offline: ${salvasOffline} de ${CAMADAS_PARA_OFFLINE.length} camadas prontas. Conecte-se para baixar o restante.`, 'warning');
          }
        }
      } catch (err) {
        console.warn('[PWA Offline] Erro no preparo offline:', err);
        btnPrepOffline.innerHTML = '⚠️ Erro ao verificar';
        showToast('Não foi possível verificar os recursos offline.', 'warning');
      } finally {
        btnPrepOffline.disabled = false;
      }
    });
  }
}

// Retrocompatibilidade global
if (typeof window !== 'undefined') {
  window.abrirModalInstall = abrirModalInstall;
  window.fecharModalInstall = fecharModalInstall;
}
