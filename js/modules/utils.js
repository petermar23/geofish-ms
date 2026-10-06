/**
 * GeoFish MS - Módulo de Utilitários e Segurança
 * Funções puras de sanitização, formatação, háptica e notificações
 */

export function escapeHTML(str) {
  if (str === null || str === undefined || String(str).trim() === '') {
    return 'Não informado';
  }
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeDigits(val) {
  if (!val) return '';
  return String(val).replace(/\D/g, '');
}

export function sanitizeTel(tel) {
  if (!tel) return null;
  const clean = String(tel).trim().replace(/[^\d+]/g, '');
  if (!/^\+?[0-9]{3,15}$/.test(clean)) return null;
  return `tel:${clean}`;
}

export function normalizeWhatsApp(contato, nome = '') {
  if (!contato) return null;
  const digits = sanitizeDigits(contato);
  if (!digits) return null;
  const fullNumber = digits.startsWith('55') ? digits : '55' + digits;
  const textoMsg = encodeURIComponent(`Olá! Vi seu contato no aplicativo GeoFish MS (Bacia do Rio Miranda) e gostaria de informações sobre serviços e pesca.`);
  return `https://api.whatsapp.com/send?phone=${fullNumber}&text=${textoMsg}`;
}

export function formatPossuiRampa(val) {
  if (val === true || val === 1) return 'Sim (Possui rampa pública/apoio)';
  if (val === false || val === 0) return 'Não informado / Sem rampa';
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (lower === 'sim' || lower === 's' || lower === 'true') {
      return 'Sim (Possui rampa pública/apoio)';
    }
    if (lower === 'não' || lower === 'nao' || lower === 'n' || lower === 'false') {
      return 'Não';
    }
  }
  return 'Não informado';
}

export function obterCorPorRegra(regra) {
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

/**
 * Verifica se uma data está dentro do Período de Defeso da Piracema em MS (05/Nov até fim de Fev)
 * Cobre corretamente anos bissextos (29 de fevereiro).
 */
export function estaEmDefeso(data = new Date()) {
  const mes = data.getMonth() + 1; // 1 a 12
  const dia = data.getDate();
  return (mes === 11 && dia >= 5) || mes === 12 || mes === 1 || mes === 2;
}

// Utilitário de Vibração Háptica para Celulares Android (Samsung / Motorola)
export function vibrar(padrao = 35) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(padrao);
    } catch (_) {}
  }
}

// Utilitário Screen Wake Lock (mantém a tela acesa durante a navegação no barco)
let wakeLockAtivo = null;
export async function manterTelaAtiva() {
  if ('wakeLock' in navigator) {
    try {
      wakeLockAtivo = await navigator.wakeLock.request('screen');
      wakeLockAtivo.addEventListener('release', () => {
        wakeLockAtivo = null;
      });
    } catch (_) {}
  }
}

// Sistema de Notificações Toast Acessíveis
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 4000);
}

// Sistema de Compartilhamento de Posição GPS e Telemetria
let _posicaoUsuario = null; // { lat, lng, precisao, timestamp }

export function setPosicaoUsuario(pos) {
  if (pos && typeof pos.lat === 'number' && typeof pos.lng === 'number') {
    _posicaoUsuario = {
      lat: pos.lat,
      lng: pos.lng,
      precisao: typeof pos.precisao === 'number' ? pos.precisao : 10,
      timestamp: pos.timestamp || Date.now()
    };
  } else {
    _posicaoUsuario = null;
  }
  if (typeof window !== 'undefined') {
    window.ultimaPosicaoUsuario = _posicaoUsuario;
  }
  return _posicaoUsuario;
}

export function getPosicaoUsuario() {
  if (typeof window !== 'undefined' && window.ultimaPosicaoUsuario) {
    return window.ultimaPosicaoUsuario;
  }
  return _posicaoUsuario;
}

// Vincula ao window para retrocompatibilidade
if (typeof window !== 'undefined') {
  window.escapeHTML = escapeHTML;
  window.sanitizeDigits = sanitizeDigits;
  window.sanitizeTel = sanitizeTel;
  window.normalizeWhatsApp = normalizeWhatsApp;
  window.formatPossuiRampa = formatPossuiRampa;
  window.obterCorPorRegra = obterCorPorRegra;
  window.vibrar = vibrar;
  window.manterTelaAtiva = manterTelaAtiva;
  window.showToast = showToast;
  window.setPosicaoUsuario = setPosicaoUsuario;
  window.getPosicaoUsuario = getPosicaoUsuario;
}

