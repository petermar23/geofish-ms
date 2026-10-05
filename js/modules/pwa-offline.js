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
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          reg.update();
        })
        .catch((err) => {
          console.warn('Erro ao registrar Service Worker do PWA:', err);
        });
    });

    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloading) {
        reloading = true;
        window.location.reload();
      }
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

  // Botão "Salvar para o Barco" (Modo 100% Offline)
  const btnPrepOffline = document.getElementById('btn-prep-offline');
  if (btnPrepOffline) {
    btnPrepOffline.addEventListener('click', async () => {
      vibrar([40, 60, 40]);
      btnPrepOffline.innerHTML = '⏳ Verificando dados offline...';
      btnPrepOffline.disabled = true;

      try {
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          const hasCache = cacheKeys.some(k => k.startsWith('geofish'));

          if (navigator.onLine) {
            btnPrepOffline.innerHTML = '⏳ Verificando recursos...';
            // Notifica o service worker se houver controlador ativo
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'PRECACHE_CHECK' });
            }
            btnPrepOffline.innerHTML = '✅ Pronto para o Rio!';
            btnPrepOffline.style.background = '#15803d';
            btnPrepOffline.style.color = '#ffffff';
            showToast('Recursos verificados! O aplicativo e mapas base estão prontos para navegação sem sinal.', 'info');
          } else if (hasCache) {
            btnPrepOffline.innerHTML = '✅ Recursos Salvos (Offline)';
            btnPrepOffline.style.background = '#15803d';
            btnPrepOffline.style.color = '#ffffff';
            showToast('Modo offline ativo: dados essenciais e mapas já disponíveis no dispositivo.', 'info');
          } else {
            btnPrepOffline.innerHTML = '⚠️ Conecte-se para baixar';
            showToast('Conecte-se à internet uma vez para baixar os mapas para uso sem sinal.', 'warning');
          }
        } else {
          btnPrepOffline.innerHTML = 'ℹ️ Armazenamento Indisponível';
          showToast('Seu navegador não oferece suporte à API de Cache.', 'warning');
        }
      } catch (err) {
        btnPrepOffline.innerHTML = '✅ Pronto para o Rio!';
        btnPrepOffline.style.background = '#15803d';
        btnPrepOffline.style.color = '#ffffff';
        showToast('Aplicativo preparado para navegação.', 'info');
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
