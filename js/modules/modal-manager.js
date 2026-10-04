/**
 * GeoFish MS - Gerenciador Universal de Modais via Templates HTML Nativos (<template>)
 * Instancia o modal no DOM sob demanda via cloneNode e o destrói completamente ao fechar via remove().
 */

import { vibrar } from './utils.js';

let modalAtivo = null; // { id, element, destroy }
const pilhaModais = []; // Suporte a modais empilhados (ex: confirmação SOS sobreposta)

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

  // Se já houver um modal ativo e a opção 'empilhar' não for solicitada, fecha o anterior
  if (modalAtivo && !options.empilhar) {
    try {
      modalAtivo.destroy();
    } catch (_) {}
  }

  // Clona o fragmento nativo do template
  const fragment = template.content.cloneNode(true);
  const modalEl = fragment.firstElementChild;
  if (!modalEl) {
    console.warn(`[ModalManager] Conteúdo vazio no template: #${templateId}`);
    return null;
  }

  // Garante que qualquer instância anterior órfã com o mesmo ID seja removida do DOM
  if (modalEl.id) {
    const orfao = document.getElementById(modalEl.id);
    if (orfao) orfao.remove();
  }

  // Exibe o modal removendo 'hidden' e ajustando atributos de acessibilidade
  modalEl.classList.remove('hidden');
  modalEl.setAttribute('aria-hidden', 'false');

  // Adiciona o elemento diretamente ao DOM no final do <body>
  document.body.appendChild(modalEl);

  let destruido = false;

  // Função central de destruição: remove os listeners e desanexa o modal do DOM
  const destroy = () => {
    if (destruido || !modalEl) return;
    destruido = true;

    // Dispara hook de limpeza pré-destruição
    if (typeof options.onDestroy === 'function') {
      try {
        options.onDestroy(modalEl);
      } catch (err) {
        console.error(`[ModalManager] Erro no onDestroy de #${templateId}:`, err);
      }
    }

    modalEl.removeEventListener('click', handleBackdropClick);
    window.removeEventListener('keydown', handleEscape);

    // DESTRUIÇÃO TOTAL DO ELEMENTO NO DOM
    if (modalEl.parentNode) {
      modalEl.remove();
    }

    // Gerencia a pilha de modais
    if (options.empilhar) {
      const idx = pilhaModais.indexOf(infoModal);
      if (idx !== -1) pilhaModais.splice(idx, 1);
    } else if (modalAtivo && modalAtivo.element === modalEl) {
      modalAtivo = null;
    }

    // Restaura foco de acessibilidade ao botão disparador, se fornecido
    if (options.returnFocusEl && typeof options.returnFocusEl.focus === 'function') {
      try { options.returnFocusEl.focus(); } catch (_) {}
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === modalEl) {
      vibrar(20);
      destroy();
    }
  };

  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      destroy();
    }
  };

  // Botões de fechar automáticos dentro do modal
  const closeBtns = modalEl.querySelectorAll('.modal-close-btn, [data-modal-close], .btn-cancelar-modal, .btn-confirm-cancel');
  closeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrar(20);
      destroy();
    });
  });

  modalEl.addEventListener('click', handleBackdropClick);
  window.addEventListener('keydown', handleEscape);

  const infoModal = { id: modalEl.id, element: modalEl, destroy };

  if (options.empilhar) {
    pilhaModais.push(infoModal);
  } else {
    modalAtivo = infoModal;
  }

  // Suporte a navegação por botão físico/gesto de voltar do Android
  try {
    history.pushState({ modal: modalEl.id }, '');
  } catch (_) {}

  // Dispara hook de inicialização com os elementos recém-injetados no DOM
  if (typeof options.onMount === 'function') {
    try {
      options.onMount(modalEl, destroy);
    } catch (err) {
      console.error(`[ModalManager] Erro no onMount de #${templateId}:`, err);
    }
  }

  vibrar(25);
  return infoModal;
}

/**
 * Fecha e destrói o modal ativo atualmente no DOM
 */
export function fecharModalAtivo() {
  if (pilhaModais.length > 0) {
    const topo = pilhaModais.pop();
    if (topo) topo.destroy();
    return;
  }
  if (modalAtivo) {
    modalAtivo.destroy();
    modalAtivo = null;
  }
}

/**
 * Fecha e destrói um modal pelo seu ID específico
 */
export function fecharModalPorId(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
  if (modalAtivo && modalAtivo.id === id) {
    modalAtivo = null;
  }
}

// Escuta evento popstate do Android para fechar/destruir o modal aberto
window.addEventListener('popstate', () => {
  if (pilhaModais.length > 0) {
    const topo = pilhaModais.pop();
    if (topo) topo.destroy();
  } else if (modalAtivo) {
    modalAtivo.destroy();
    modalAtivo = null;
  }
});

// Retrocompatibilidade no objeto window
if (typeof window !== 'undefined') {
  window.abrirModalDeTemplate = abrirModalDeTemplate;
  window.fecharModalAtivo = fecharModalAtivo;
  window.fecharModalPorId = fecharModalPorId;
}
