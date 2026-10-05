/**
 * GeoFish MS - Módulo de Central de Emergência & S.O.S Fluvial
 * Utiliza <template> nativo, instanciando no DOM sob demanda e destruindo ao fechar.
 */

import { escapeHTML, vibrar, showToast } from './utils.js';
import { abrirModalDeTemplate } from './modal-manager.js';

let modalSosInstancia = null;
let modalConfirmSosInstancia = null;
let acaoPendenteSos = null; // { tipo: 'call' | 'copy' | 'wpp', numero, servico }

export function gerarTextoResgate() {
  const dataHora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const pos = (typeof window !== 'undefined' && window.ultimaPosicaoUsuario) ? window.ultimaPosicaoUsuario : null;
  const coordsTexto = (pos && typeof pos.lat === 'number' && typeof pos.lng === 'number')
    ? `📍 Coordenadas GPS: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (Precisão: ±${Math.round(pos.precisao || 10)}m)`
    : `📍 Localização GPS: Não detectada no dispositivo (informe sua referência local)`;

  return `🚨 *S.O.S RESGATE FLUVIAL - PANTANAL MS*\n` +
         `📍 Região: Bacia do Rio Miranda (Pantanal/MS)\n` +
         `${coordsTexto}\n` +
         `⏰ Horário do Alerta: ${dataHora}\n` +
         `🆘 Solicito apoio emergencial para embarcação/pescador na calha do rio.\n\n` +
         `Canais de Acionamento Imediato:\n` +
         `• Marinha do Brasil (Capitania Fluvial): 185\n` +
         `• Polícia Militar Ambiental (Pelotão Miranda): (67) 3242-4344\n` +
         `• Polícia Militar Ambiental (Plantão Estadual MS): (67) 3357-1500 / 190\n` +
         `• Corpo de Bombeiros Militar: 193\n` +
         `• Hospital Municipal de Miranda: (67) 3242-1222`;
}

export function abrirModalSos() {
  modalSosInstancia = abrirModalDeTemplate('template-modal-sos', {
    modalId: 'modal-sos',
    onMount: (modalEl) => {
      // Exibe coordenadas reais no card de SOS se disponíveis
      const coordsDisplay = modalEl.querySelector('#sos-coords-display');
      if (coordsDisplay) {
        const pos = (typeof window !== 'undefined' && window.ultimaPosicaoUsuario) ? window.ultimaPosicaoUsuario : null;
        if (pos && typeof pos.lat === 'number' && typeof pos.lng === 'number') {
          const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          coordsDisplay.innerHTML = `<span style="color: #047857; font-weight: 700;">📍 Sua Posição GPS Atual:</span> ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} <span style="font-size:0.75rem; color:#64748b;">(±${Math.round(pos.precisao || 10)}m, às ${hora})</span>.<br>Informe estas coordenadas ou seu ponto de referência ao atendente de socorro:`;
        } else {
          coordsDisplay.innerHTML = `Em caso de pane de motor, acidente náutico ou socorro médico na calha do Rio Miranda e Aquidauana, acione as forças públicas de segurança pelos números abaixo:`;
        }
      }

      const btnCopiar = modalEl.querySelector('#btn-copiar-resgate');
      if (btnCopiar) {
        btnCopiar.addEventListener('click', () => {
          abrirConfirmacaoSos({ tipo: 'copy' });
        });
      }

      const btnWpp = modalEl.querySelector('.btn-wpp-action') || modalEl.querySelector('#btn-wpp-resgate');
      if (btnWpp) {
        btnWpp.addEventListener('click', (e) => {
          e.preventDefault();
          abrirConfirmacaoSos({ tipo: 'wpp' });
        });
      }

      const callBtns = modalEl.querySelectorAll('.sos-call-btn');
      callBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const servico = btn.getAttribute('data-service') || 'Serviço de Emergência';
          const numero = btn.getAttribute('data-number') || '';
          if (numero) {
            abrirConfirmacaoSos({ tipo: 'call', servico, numero });
          }
        });
      });
    },
    onDestroy: () => {
      modalSosInstancia = null;
    }
  });
}

export function fecharModalSos() {
  if (modalSosInstancia) {
    modalSosInstancia.destroy();
    modalSosInstancia = null;
  }
}

export function abrirConfirmacaoSos(acao) {
  acaoPendenteSos = acao;

  modalConfirmSosInstancia = abrirModalDeTemplate('template-modal-confirm-sos', {
    modalId: 'modal-confirm-sos',
    empilhar: true,
    onMount: (modalEl, destroy) => {
      const confirmSosText = modalEl.querySelector('#confirm-sos-text');
      const btnExecutarSosCall = modalEl.querySelector('#btn-executar-sos-call');
      const btnCancelarSosCall = modalEl.querySelector('#btn-cancelar-sos-call');

      const pos = (typeof window !== 'undefined' && window.ultimaPosicaoUsuario) ? window.ultimaPosicaoUsuario : null;
      const temGps = pos && typeof pos.lat === 'number' && typeof pos.lng === 'number';

      if (confirmSosText) {
        if (acao.tipo === 'call') {
          confirmSosText.innerHTML = `Você está prestes a discar para <strong>${escapeHTML(acao.servico)} (${escapeHTML(acao.numero)})</strong>.<br><br>` +
            `<span style="color: #991b1b; font-weight: 700;">⚠️ Confirme apenas se estiver em situação real de risco à vida ou à navegação. Trote aos serviços de emergência é crime (Art. 340 do Código Penal).</span>`;
          if (btnExecutarSosCall) btnExecutarSosCall.textContent = `📞 Ligar para ${acao.numero}`;
        } else if (acao.tipo === 'copy') {
          confirmSosText.innerHTML = temGps
            ? `Deseja copiar o texto de emergência com as suas coordenadas GPS reais (${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}) e contatos para a área de transferência?`
            : `Deseja copiar o texto de emergência e lista de contatos para a área de transferência? (GPS do aparelho não ativado).`;
          if (btnExecutarSosCall) btnExecutarSosCall.textContent = `📋 Sim, Copiar Mensagem`;
        } else if (acao.tipo === 'wpp') {
          confirmSosText.innerHTML = temGps
            ? `Deseja abrir o WhatsApp com mensagem de socorro contendo suas coordenadas GPS reais pré-preenchidas para você enviar a um contato ou grupo de apoio?`
            : `Deseja abrir o WhatsApp com mensagem de emergência pré-formatada para enviar a um contato ou grupo de apoio?`;
          if (btnExecutarSosCall) btnExecutarSosCall.textContent = `💬 Sim, Abrir WhatsApp`;
        }
      }

      if (btnExecutarSosCall) {
        btnExecutarSosCall.addEventListener('click', () => {
          executarSosAcao();
          destroy();
        });
      }

      if (btnCancelarSosCall) {
        btnCancelarSosCall.addEventListener('click', () => {
          destroy();
        });
      }
    },
    onDestroy: () => {
      acaoPendenteSos = null;
      modalConfirmSosInstancia = null;
    }
  });
}

export function fecharConfirmacaoSos() {
  if (modalConfirmSosInstancia) {
    modalConfirmSosInstancia.destroy();
    modalConfirmSosInstancia = null;
    acaoPendenteSos = null;
  }
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
  const triggerBtns = document.querySelectorAll('#btn-sos, .btn-alerta-sos');
  triggerBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      vibrar(30);
      abrirModalSos();
    });
  });
}

// Retrocompatibilidade global
if (typeof window !== 'undefined') {
  window.abrirModalSos = abrirModalSos;
  window.fecharModalSos = fecharModalSos;
  window.abrirConfirmacaoSos = abrirConfirmacaoSos;
  window.fecharConfirmacaoSos = fecharConfirmacaoSos;
}
