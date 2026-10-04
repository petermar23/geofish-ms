/**
 * GeoFish MS - Módulo do Leitor da Cartilha Oficial PMA-MS
 * Utiliza <template id="template-modal-cartilha"> nativo, instanciando sob demanda e destruindo ao fechar.
 */

import { abrirModalDeTemplate } from './modal-manager.js';
import { vibrar } from './utils.js';

let modalInstancia = null;

export function alternarAbaCartilha(tipo, container = document) {
  const tabs = {
    rios: { btn: 'tab-btn-rios-proibidos', panel: 'panel-cartilha-rios' },
    iscas: { btn: 'tab-btn-iscas', panel: 'panel-cartilha-iscas' },
    transporte: { btn: 'tab-btn-transporte', panel: 'panel-cartilha-transporte' },
    petrechos: { btn: 'tab-btn-petrechos', panel: 'panel-cartilha-petrechos' },
    contatos: { btn: 'tab-btn-contatos', panel: 'panel-cartilha-contatos' }
  };

  Object.entries(tabs).forEach(([k, item]) => {
    const b = container.querySelector ? container.querySelector(`#${item.btn}`) : document.getElementById(item.btn);
    const p = container.querySelector ? container.querySelector(`#${item.panel}`) : document.getElementById(item.panel);
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

export function abrirModalCartilha(abaInicial = 'rios') {
  modalInstancia = abrirModalDeTemplate('template-modal-cartilha', {
    modalId: 'modal-cartilha',
    onMount: (modalEl) => {
      const tabBtns = modalEl.querySelectorAll('.cartilha-tab-btn');
      tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          vibrar(20);
          const tab = btn.getAttribute('data-tab');
          alternarAbaCartilha(tab, modalEl);
        });
      });
      alternarAbaCartilha(abaInicial, modalEl);
    },
    onDestroy: () => {
      modalInstancia = null;
    }
  });
}

export function fecharModalCartilha() {
  if (modalInstancia) {
    modalInstancia.destroy();
    modalInstancia = null;
  }
}

// Retrocompatibilidade global
if (typeof window !== 'undefined') {
  window.abrirModalCartilha = abrirModalCartilha;
  window.fecharModalCartilha = fecharModalCartilha;
  window.alternarAbaCartilha = alternarAbaCartilha;
}
