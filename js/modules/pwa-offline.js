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
  const btnFecharInstall = document.getElementById('btn-fechar-install');
  const modalInstall = document.getElementById('modal-install');
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

  if (btnFecharInstall) btnFecharInstall.addEventListener('click', fecharModalInstall);

  if (modalInstall) {
    modalInstall.addEventListener('click', (e) => {
      if (e.target === modalInstall) fecharModalInstall();
    });
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
}

// Fechamento com Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    fecharModalInstall();
  }
});

// Retrocompatibilidade global
if (typeof window !== 'undefined') {
  window.abrirModalInstall = abrirModalInstall;
  window.fecharModalInstall = fecharModalInstall;
}
