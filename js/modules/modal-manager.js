/**
 * GeoFish MS - Gerenciador Universal de Modais e Overlays
 * Arquitetura de Pilha Única (LIFO) com sincronização bidirecional do Histórico (Android Back / popstate)
 * e Gerenciamento Acessível de Foco.
 */

import { vibrar } from './utils.js';

// Pilha universal de modais e overlays ativos no aplicativo
const pilhaModais = [];

// Contador de eventos popstate disparados pelo próprio modalManager (via history.back())
let pendentesHistoryBack = 0;

/**
 * Fecha uma entrada da pilha (modal ou overlay externo)
 * @param {Object} entry - Objeto da entrada
 * @param {boolean} vindoDePopstate - Se true, originado pelo botão físico/gesto de voltar do Android
 */
function fecharEntrada(entry, vindoDePopstate = false, substituindo = false) {
  if (!entry || entry.destruido) return;
  entry.destruido = true;

  // 1. Remove da pilha universal
  const idx = pilhaModais.indexOf(entry);
  if (idx !== -1) {
    pilhaModais.splice(idx, 1);
  }

  // 2. Executa callback onDestroy
  if (typeof entry.onDestroy === 'function') {
    try {
      entry.onDestroy(entry.element);
    } catch (err) {
      console.error(`[ModalManager] Erro no onDestroy de #${entry.id}:`, err);
    }
  }

  // 3. Limpeza do DOM e de listeners caso seja elemento de template
  if (entry.element) {
    if (typeof entry.element._cleanupListeners === 'function') {
      try { entry.element._cleanupListeners(); } catch (_) {}
    }
    if (entry.element.parentNode) {
      entry.element.remove();
    }
  }

  // 4. Se for overlay externo (ex: bottomSheet), chama sua rotina de fechamento
  if (typeof entry.onExternalClose === 'function') {
    try {
      entry.onExternalClose();
    } catch (err) {
      console.error(`[ModalManager] Erro no onExternalClose de #${entry.id}:`, err);
    }
  }

  // 5. Sincronização do Histórico do Navegador / Android:
  // Se o fechamento foi disparado pela interface ("X", backdrop, Escape ou código),
  // e havia pushState associado, desfaz a entrada no history sem travar a navegação.
  // Se estiver sendo substituído por outro modal, ignora para evitar concorrência de history.
  if (entry.hasHistoryState && !vindoDePopstate && !substituindo) {
    try {
      pendentesHistoryBack++;
      window.history.back();
    } catch (_) {}
  }

  // 6. Devolução de Foco para Acessibilidade
  if (entry.returnFocusEl && typeof entry.returnFocusEl.focus === 'function' && document.body.contains(entry.returnFocusEl)) {
    try {
      entry.returnFocusEl.focus();
    } catch (_) {}
  }
}

/**
 * Instancia um modal a partir de uma tag <template id="..."> no DOM
 * @param {string} templateId - ID da tag <template>
 * @param {Object} options - Configurações de ciclo de vida e eventos
 * @returns {Object|null} - Objeto contendo o elemento instanciado e o método destroy
 */
export function abrirModalDeTemplate(templateId, options = {}) {
  const template = document.getElementById(templateId);
  if (!template) {
    console.warn(`[ModalManager] Tag <template> não encontrada: #${templateId}`);
    return null;
  }

  // Se não for empilhado e já existirem modais abertos, substitui os anteriores sem duplicar histórico
  let substituindo = false;
  if (!options.empilhar && pilhaModais.length > 0) {
    substituindo = true;
    while (pilhaModais.length > 0) {
      const topo = pilhaModais[pilhaModais.length - 1];
      topo.destroy(false, true);
    }
  }

  // Clona o fragmento nativo do template
  const fragment = template.content.cloneNode(true);
  const modalEl = fragment.firstElementChild;
  if (!modalEl) {
    console.warn(`[ModalManager] Conteúdo vazio no template: #${templateId}`);
    return null;
  }

  // Lê e aplica o modalId configurado
  const effectiveId = options.modalId || modalEl.id || `modal-${templateId}`;
  modalEl.id = effectiveId;

  // Garante que qualquer elemento órfão anterior com o mesmo ID seja removido do DOM
  const orfao = document.getElementById(effectiveId);
  if (orfao) orfao.remove();

  // Exibe o modal removendo 'hidden' e ajustando acessibilidade
  modalEl.classList.remove('hidden');
  modalEl.setAttribute('aria-hidden', 'false');

  // Salva o elemento com foco ativo para devolução posterior
  const returnFocusEl = options.returnFocusEl ||
    (document.activeElement instanceof HTMLElement ? document.activeElement : null);

  // Injeta o elemento no DOM
  document.body.appendChild(modalEl);

  // Cria a estrutura de dados da entrada do modal
  const infoModal = {
    id: effectiveId,
    element: modalEl,
    onDestroy: options.onDestroy,
    returnFocusEl,
    hasHistoryState: true,
    destruido: false,
    destroy: (vindoDePopstate = false, subt = false) => {
      fecharEntrada(infoModal, vindoDePopstate, subt);
    }
  };

  // Configura listeners de clique dentro do modal (Backdrop e botões com atributos de fechar)
  const handleBackdropClick = (e) => {
    if (e.target === modalEl) {
      vibrar(20);
      infoModal.destroy(false);
    }
  };

  const closeBtns = modalEl.querySelectorAll('.modal-close-btn, [data-modal-close], .btn-cancelar-modal, .btn-confirm-cancel');
  const handleCloseBtnClick = (e) => {
    e.preventDefault();
    vibrar(20);
    infoModal.destroy(false);
  };

  // Prender foco no modal (Tab trapping para acessibilidade WCAG)
  const handleKeyDownTrap = (e) => {
    if (e.key === 'Tab') {
      const focusables = modalEl.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl || document.activeElement === modalEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  };

  closeBtns.forEach((btn) => btn.addEventListener('click', handleCloseBtnClick));
  modalEl.addEventListener('click', handleBackdropClick);
  modalEl.addEventListener('keydown', handleKeyDownTrap);

  modalEl._cleanupListeners = () => {
    modalEl.removeEventListener('click', handleBackdropClick);
    modalEl.removeEventListener('keydown', handleKeyDownTrap);
    closeBtns.forEach((btn) => btn.removeEventListener('click', handleCloseBtnClick));
  };

  // Registra na pilha universal
  pilhaModais.push(infoModal);

  // Registra no histórico do navegador (replaceState se estiver alternando, pushState se for nova abertura)
  try {
    if (substituindo) {
      history.replaceState({ geofishModal: effectiveId }, '');
    } else {
      history.pushState({ geofishModal: effectiveId }, '');
    }
  } catch (_) {}

  // Dispara hook onMount
  if (typeof options.onMount === 'function') {
    try {
      options.onMount(modalEl, () => infoModal.destroy(false));
    } catch (err) {
      console.error(`[ModalManager] Erro no onMount de #${effectiveId}:`, err);
    }
  }

  // Foco inicial acessível
  requestAnimationFrame(() => {
    if (infoModal.destruido || !modalEl) return;
    const focusable = modalEl.querySelector(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]):not(.modal-close-btn), [tabindex="0"]'
    ) || modalEl.querySelector('.modal-close-btn') || modalEl;

    if (focusable && typeof focusable.focus === 'function') {
      try {
        if (modalEl.getAttribute('tabindex') === null && focusable === modalEl) {
          modalEl.setAttribute('tabindex', '-1');
        }
        focusable.focus();
      } catch (_) {}
    }
  });

  vibrar(25);
  return infoModal;
}

/**
 * Fecha e destrói o modal ou overlay do topo da pilha
 */
export function fecharModalAtivo() {
  if (pilhaModais.length > 0) {
    const topo = pilhaModais[pilhaModais.length - 1];
    topo.destroy(false);
    return true;
  }
  return false;
}

/**
 * Fecha e destrói um modal pelo seu ID específico, chamando adequadamente o onDestroy
 */
export function fecharModalPorId(id) {
  const idx = pilhaModais.findIndex(m => m.id === id || (m.element && m.element.id === id));
  if (idx !== -1) {
    const entry = pilhaModais[idx];
    entry.destroy(false);
    return true;
  }
  // Fallback para elemento órfão caso não esteja na pilha
  const el = document.getElementById(id);
  if (el) {
    el.remove();
    return true;
  }
  return false;
}

/**
 * Registra um overlay externo (ex: bottomSheet) na pilha universal de navegação
 * @param {Object} config - { id, fechar, returnFocusEl }
 */
export function registrarOverlayExterno({ id, fechar, returnFocusEl }) {
  // Se já existir entrada com o mesmo ID, fecha a anterior sem push extra
  desregistrarOverlayExterno(id, false);

  const prevFocus = returnFocusEl ||
    (document.activeElement instanceof HTMLElement ? document.activeElement : null);

  const entry = {
    id,
    element: null,
    hasHistoryState: true,
    destruido: false,
    returnFocusEl: prevFocus,
    onExternalClose: fechar,
    destroy: (vindoDePopstate = false) => {
      fecharEntrada(entry, vindoDePopstate);
    }
  };

  pilhaModais.push(entry);

  try {
    history.pushState({ geofishOverlay: id }, '');
  } catch (_) {}

  return entry;
}

/**
 * Remove um overlay externo da pilha universal
 * @param {string} id - ID do overlay
 * @param {boolean} viaUsuario - Se true, dispara history.back()
 */
export function desregistrarOverlayExterno(id, viaUsuario = true) {
  const idx = pilhaModais.findIndex(m => m.id === id);
  if (idx !== -1) {
    const entry = pilhaModais[idx];
    entry.destroy(!viaUsuario);
  }
}

/**
 * Retorna se há algum modal ou overlay aberto
 */
export function temModalOuOverlayAberto() {
  return pilhaModais.length > 0;
}

// ========================================================
// LISTENERS UNIVERSAIS ÚNICOS DE TECLADO E HISTÓRICO
// ========================================================

// 1. Escuta única para tecla Escape (fecha apenas o elemento do topo da pilha LIFO)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Se a caixa de busca rápida local estiver aberta, fecha primeiro
    const searchResults = document.getElementById('local-search-results');
    if (searchResults && !searchResults.classList.contains('hidden')) {
      searchResults.classList.add('hidden');
      return;
    }

    if (pilhaModais.length > 0) {
      e.preventDefault();
      const topo = pilhaModais[pilhaModais.length - 1];
      topo.destroy(false);
    }
  }
});

// 2. Escuta única para evento popstate do navegador / botão físico de voltar do Android
window.addEventListener('popstate', () => {
  // Se o evento foi disparado pelo nosso próprio history.back(), decrementa e encerra
  if (pendentesHistoryBack > 0) {
    pendentesHistoryBack--;
    return;
  }

  // Se a busca rápida local estiver aberta, fecha
  const searchResults = document.getElementById('local-search-results');
  if (searchResults && !searchResults.classList.contains('hidden')) {
    searchResults.classList.add('hidden');
    return;
  }

  // Fecha o elemento do topo da pilha informando que veio de popstate
  if (pilhaModais.length > 0) {
    const topo = pilhaModais[pilhaModais.length - 1];
    topo.destroy(true);
  }
});

// Retrocompatibilidade no objeto global window
if (typeof window !== 'undefined') {
  window.abrirModalDeTemplate = abrirModalDeTemplate;
  window.fecharModalAtivo = fecharModalAtivo;
  window.fecharModalPorId = fecharModalPorId;
  window.registrarOverlayExterno = registrarOverlayExterno;
  window.desregistrarOverlayExterno = desregistrarOverlayExterno;
  window.temModalOuOverlayAberto = temModalOuOverlayAberto;
}
