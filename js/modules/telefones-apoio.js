/**
 * GeoFish MS - Módulo de Telefones Úteis e Contatos Institucionais
 * Fornece lista direta de discagem para órgãos públicos oficiais (PMA, Bombeiros, SAMU, Marinha e Hospitais)
 * Sem despacho automatizado de mensagens a terceiros ou promessa de salvamento/resgate.
 */

import { vibrar } from './utils.js';
import { abrirModalDeTemplate } from './modal-manager.js';

let modalTelefonesInstancia = null;

export function abrirModalTelefones() {
  modalTelefonesInstancia = abrirModalDeTemplate('template-modal-telefones', {
    modalId: 'modal-telefones',
    onMount: (modalEl) => {
      const btnFechar = modalEl.querySelector('#btn-fechar-telefones');
      if (btnFechar) {
        btnFechar.addEventListener('click', () => {
          vibrar(15);
          fecharModalTelefones();
        });
      }

      const btnFecharRodape = modalEl.querySelector('#btn-fechar-telefones-rodape');
      if (btnFecharRodape) {
        btnFecharRodape.addEventListener('click', () => {
          vibrar(15);
          fecharModalTelefones();
        });
      }
    },
    onDestroy: () => {
      modalTelefonesInstancia = null;
    }
  });
}

export function fecharModalTelefones() {
  if (modalTelefonesInstancia) {
    modalTelefonesInstancia.destroy();
    modalTelefonesInstancia = null;
  }
}

// Retrocompatibilidade global
if (typeof window !== 'undefined') {
  window.abrirModalTelefones = abrirModalTelefones;
  window.fecharModalTelefones = fecharModalTelefones;
}
