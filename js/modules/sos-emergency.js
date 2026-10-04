/**
 * GeoFish MS - Módulo de Central de Emergência & S.O.S Fluvial
 * Prevenção de acidentes, suporte de resgate com Marinha (185), PMA (190) e Bombeiros (193)
 */

import { escapeHTML, vibrar, showToast } from './utils.js';

let acaoPendenteSos = null; // { tipo: 'call' | 'copy' | 'wpp', numero, servico }

export function gerarTextoResgate() {
  const dataHora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `🚨 *S.O.S RESGATE FLUVIAL - PANTANAL MS*\n` +
         `📍 Região: Bacia do Rio Miranda (Pantanal/MS)\n` +
         `⏰ Horário: ${dataHora}\n` +
         `🆘 Solicito apoio emergencial para embarcação/pescador na calha do rio.\n\n` +
         `Canais de Acionamento Imediato:\n` +
         `• Marinha do Brasil (Capitania Fluvial): 185\n` +
         `• Polícia Militar Ambiental (Pelotão Miranda): 190 / (67) 3242-4344\n` +
         `• Corpo de Bombeiros Militar: 193\n` +
         `• Hospital Municipal de Miranda: (67) 3242-1222`;
}

export function abrirModalSos() {
  const modalSos = document.getElementById('modal-sos');
  if (!modalSos) return;
  modalSos.classList.remove('hidden');
  modalSos.setAttribute('aria-hidden', 'false');
  vibrar(35);
  try {
    history.pushState({ modal: 'sos' }, '');
  } catch (_) {}
}

export function fecharModalSos() {
  const modalSos = document.getElementById('modal-sos');
  if (!modalSos) return;
  modalSos.classList.add('hidden');
  modalSos.setAttribute('aria-hidden', 'true');
}

export function abrirConfirmacaoSos(acao) {
  acaoPendenteSos = acao;
  const modalConfirmSos = document.getElementById('modal-confirm-sos');
  const confirmSosText = document.getElementById('confirm-sos-text');
  const btnExecutarSosCall = document.getElementById('btn-executar-sos-call');

  if (!modalConfirmSos || !confirmSosText) return;

  if (acao.tipo === 'call') {
    confirmSosText.innerHTML = `Você está prestes a discar para <strong>${escapeHTML(acao.servico)} (${escapeHTML(acao.numero)})</strong>.<br><br>` +
      `<span style="color: #991b1b; font-weight: 700;">⚠️ Confirme apenas se estiver em situação real de risco à vida ou à navegação. Trote aos serviços de emergência é crime (Art. 340 do Código Penal).</span>`;
    if (btnExecutarSosCall) btnExecutarSosCall.textContent = `📞 Ligar para ${acao.numero}`;
  } else if (acao.tipo === 'copy') {
    confirmSosText.innerHTML = `Deseja copiar o texto oficial de socorro com as suas coordenadas GPS atuais para a área de transferência?`;
    if (btnExecutarSosCall) btnExecutarSosCall.textContent = `📋 Sim, Copiar Mensagem`;
  } else if (acao.tipo === 'wpp') {
    confirmSosText.innerHTML = `Deseja abrir o aplicativo do WhatsApp com a mensagem de emergência e suas coordenadas GPS atuais pré-preenchidas?`;
    if (btnExecutarSosCall) btnExecutarSosCall.textContent = `💬 Sim, Abrir WhatsApp`;
  }

  modalConfirmSos.classList.remove('hidden');
  vibrar(40);
}

export function fecharConfirmacaoSos() {
  const modalConfirmSos = document.getElementById('modal-confirm-sos');
  if (!modalConfirmSos) return;
  modalConfirmSos.classList.add('hidden');
  acaoPendenteSos = null;
}

export function executarSosAcao() {
  if (!acaoPendenteSos) return;

  if (acaoPendenteSos.tipo === 'call') {
    const numLimpo = acaoPendenteSos.numero.replace(/\D/g, '');
    window.location.href = `tel:${numLimpo}`;
  } else if (acaoPendenteSos.tipo === 'copy') {
    const texto = gerarTextoResgate();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(() => {
        showToast('Texto de emergência copiado para a área de transferência!', 'info');
      }).catch(() => {
        showToast('Erro ao copiar. Anote os contatos exibidos na tela.', 'warning');
      });
    } else {
      showToast('Área de transferência indisponível no navegador.', 'warning');
    }
  } else if (acaoPendenteSos.tipo === 'wpp') {
    vibrar(30);
    const texto = gerarTextoResgate();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  }

  fecharConfirmacaoSos();
}

export function initSosEmergency() {
  const btnSos = document.getElementById('btn-sos');
  const btnFecharSos = document.getElementById('btn-fechar-sos');
  const modalSos = document.getElementById('modal-sos');

  if (btnSos) btnSos.addEventListener('click', abrirModalSos);
  if (btnFecharSos) btnFecharSos.addEventListener('click', fecharModalSos);

  if (modalSos) {
    modalSos.addEventListener('click', (e) => {
      if (e.target === modalSos) fecharModalSos();
    });
  }

  const btnCopiarResgate = document.getElementById('btn-copiar-resgate');
  if (btnCopiarResgate) {
    btnCopiarResgate.addEventListener('click', () => {
      abrirConfirmacaoSos({ tipo: 'copy' });
    });
  }

  const btnWppResgate = document.getElementById('btn-wpp-resgate');
  if (btnWppResgate) {
    btnWppResgate.addEventListener('click', () => {
      abrirConfirmacaoSos({ tipo: 'wpp' });
    });
  }

  // Delegação dos botões de ligação rápida
  const sosButtons = document.querySelectorAll('.sos-call-btn');
  sosButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const servico = btn.getAttribute('data-service') || 'Serviço de Emergência';
      const numero = btn.getAttribute('data-number') || '';
      if (numero) {
        abrirConfirmacaoSos({ tipo: 'call', servico, numero });
      }
    });
  });

  const btnCancelarSosCall = document.getElementById('btn-cancelar-sos-call');
  const btnExecutarSosCall = document.getElementById('btn-executar-sos-call');
  const modalConfirmSos = document.getElementById('modal-confirm-sos');

  if (btnCancelarSosCall) btnCancelarSosCall.addEventListener('click', fecharConfirmacaoSos);
  if (btnExecutarSosCall) btnExecutarSosCall.addEventListener('click', executarSosAcao);

  if (modalConfirmSos) {
    modalConfirmSos.addEventListener('click', (e) => {
      if (e.target === modalConfirmSos) fecharConfirmacaoSos();
    });
  }
}

// Fechamento com Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    fecharConfirmacaoSos();
    fecharModalSos();
  }
});

// Retrocompatibilidade global
if (typeof window !== 'undefined') {
  window.abrirModalSos = abrirModalSos;
  window.fecharModalSos = fecharModalSos;
  window.abrirConfirmacaoSos = abrirConfirmacaoSos;
  window.fecharConfirmacaoSos = fecharConfirmacaoSos;
}
