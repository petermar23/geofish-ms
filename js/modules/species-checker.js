/**
 * GeoFish MS - Módulo de Espécies e Régua de Medidas (IMASUL MS)
 * Decretos Estaduais nº 15.166/19 e 15.375/20 & Lei nº 5.321 (Dourado)
 */

import { escapeHTML, vibrar } from './utils.js';

export const ESPECIES_MS = [
  {
    id: 'pintado',
    nome: 'Pintado / Surubim',
    nomeCientifico: 'Pseudoplatystoma corruscans',
    status: 'cota-zero',
    statusTexto: 'Faixa 85 a 125 cm (1 Nativo)',
    min: 85,
    max: 125,
    regra: 'Permitida a captura e o transporte de 1 exemplar nativo por pescador licenciado, dentro da faixa de 85 a 125 cm (Decretos nº 15.166/19 e 15.375/20). Transporte EXCLUSIVO dentro de MS (proibido interestadual/internacional). O peixe deve estar inteiro no gelo, vistoriado e lacrado pela PMA com a GCP emitida em qualquer unidade da PMA antes de pegar a rodovia.'
  },
  {
    id: 'pacu',
    nome: 'Pacu',
    nomeCientifico: 'Piaractus mesopotamicus',
    status: 'cota-zero',
    statusTexto: 'Faixa 45 a 65 cm',
    min: 45,
    max: 65,
    regra: 'Permitida a captura e o transporte de 1 exemplar entre 45 e 65 cm. Exemplares acima de 65 cm são matrizes protegidas por lei e devem ser soltos vivos imediatamente (Art. 9º, § 3º).'
  },
  {
    id: 'cachara',
    nome: 'Cachara',
    nomeCientifico: 'Pseudoplatystoma reticulatum',
    status: 'cota-zero',
    statusTexto: 'Faixa 80 a 120 cm',
    min: 80,
    max: 120,
    regra: 'Faixa permitida de 80 a 120 cm. Fora dessa faixa (menor que 80 ou maior que 120 cm), a soltura é obrigatória (Art. 9º).'
  },
  {
    id: 'jau',
    nome: 'Jaú',
    nomeCientifico: 'Zungaro jahu',
    status: 'cota-zero',
    statusTexto: 'Faixa 95 a 130 cm',
    min: 95,
    max: 130,
    regra: 'Permitida a captura e o transporte de 1 exemplar entre 95 e 130 cm. Exemplares gigantes acima de 130 cm são reprodutores protegidos por lei (Art. 9º).'
  },
  {
    id: 'piraputanga',
    nome: 'Piraputanga',
    nomeCientifico: 'Brycon hilarii',
    status: 'cota-zero',
    statusTexto: 'Mínimo 30 cm',
    min: 30,
    max: null,
    regra: 'Tamanho mínimo de 30 cm (Art. 9º). Atenção: na calha do Rio Salobra e afluentes é modalidade exclusivamente Pesque e Solte.'
  },
  {
    id: 'curimbata',
    nome: 'Curimbatá / Curimba / Papaterra',
    nomeCientifico: 'Prochilodus lineatus',
    status: 'cota-zero',
    statusTexto: 'Mínimo 38 cm',
    min: 38,
    max: null,
    regra: 'Tamanho mínimo de 38 cm (Art. 9º). Comercialização expressamente proibida na Bacia do Rio Paraguai (Art. 5º, Parágrafo único).'
  },
  {
    id: 'piavucu',
    nome: 'Piavussu / Piauçu',
    nomeCientifico: 'Megaleporinus macrocephalus',
    status: 'cota-zero',
    statusTexto: 'Mínimo 38 cm',
    min: 38,
    max: null,
    regra: 'Tamanho mínimo de 38 cm (Art. 9º). Integrante da cota permitida de 1 exemplar nativo.'
  },
  {
    id: 'barbado',
    nome: 'Barbado',
    nomeCientifico: 'Pinirampus pirinampu',
    status: 'cota-zero',
    statusTexto: 'Mínimo 60 cm',
    min: 60,
    max: null,
    regra: 'Tamanho mínimo de 60 cm (Art. 9º).'
  },
  {
    id: 'pati',
    nome: 'Pati',
    nomeCientifico: 'Luciopimelodus pati',
    status: 'cota-zero',
    statusTexto: 'Mínimo 65 cm',
    min: 65,
    max: null,
    regra: 'Tamanho mínimo de 65 cm (Art. 9º).'
  },
  {
    id: 'jurupoca',
    nome: 'Jurupoca',
    nomeCientifico: 'Hemisorubim platyrhynchos',
    status: 'cota-zero',
    statusTexto: 'Mínimo 40 cm',
    min: 40,
    max: null,
    regra: 'Tamanho mínimo de 40 cm (Art. 9º).'
  },
  {
    id: 'jurupensem',
    nome: 'Jurupensém',
    nomeCientifico: 'Sorubim lima',
    status: 'cota-zero',
    statusTexto: 'Mínimo 35 cm',
    min: 35,
    max: null,
    regra: 'Tamanho mínimo de 35 cm (Art. 9º).'
  },
  {
    id: 'armao',
    nome: 'Armao / Armado / Abotoado',
    nomeCientifico: 'Pterodoras granulosus / Oxydoras kneri',
    status: 'cota-zero',
    statusTexto: 'Mínimo 35 cm',
    min: 35,
    max: null,
    regra: 'Tamanho mínimo de 35 cm (Art. 9º).'
  },
  {
    id: 'palmito',
    nome: 'Palmito',
    nomeCientifico: 'Ageneiosus spp.',
    status: 'cota-zero',
    statusTexto: 'Mínimo 35 cm',
    min: 35,
    max: null,
    regra: 'Tamanho mínimo de 35 cm (Art. 9º).'
  },
  {
    id: 'mandi',
    nome: 'Mandi / Mandi Amarelo',
    nomeCientifico: 'Pimelodus maculatus',
    status: 'cota-zero',
    statusTexto: 'Mínimo 25 cm',
    min: 25,
    max: null,
    regra: 'Tamanho mínimo de 25 cm (Art. 9º).'
  },
  {
    id: 'piau',
    nome: 'Piau / Piau Três Pintas',
    nomeCientifico: 'Leporinus spp. / Leporinus friderici',
    status: 'cota-zero',
    statusTexto: 'Mínimo 25 cm',
    min: 25,
    max: null,
    regra: 'Tamanho mínimo de 25 cm (Art. 9º).'
  },
  {
    id: 'pacupeva',
    nome: 'Pacupeva',
    nomeCientifico: 'Mylossoma paraguayensis',
    status: 'cota-zero',
    statusTexto: 'Mínimo 20 cm',
    min: 20,
    max: null,
    regra: 'Tamanho mínimo de 20 cm (Art. 9º).'
  },
  {
    id: 'piranha',
    nome: 'Piranha (Vermelha / Amarela)',
    nomeCientifico: 'Pygocentrus nattereri / Serrasalmus marginatus',
    status: 'cota-zero',
    statusTexto: 'Até 5 Exemplares',
    min: null,
    max: null,
    regra: 'Cota de até 5 (cinco) exemplares autorizada cumulativamente com o exemplar nativo (Art. 4º, II do Decreto nº 15.166/19).'
  },
  {
    id: 'tucunare',
    nome: 'Tucunaré',
    nomeCientifico: 'Cichla spp.',
    status: 'exotica',
    statusTexto: 'Captura e Cota Livre',
    min: null,
    max: null,
    regra: 'Espécie alóctone/exótica listada no Art. 7º, IX. Captura e transporte LIVRES de limite de cota em MS.'
  },
  {
    id: 'corvina',
    nome: 'Corvina / Pescada-do-Piauí',
    nomeCientifico: 'Plagioscion squamosissimus',
    status: 'exotica',
    statusTexto: 'Captura e Cota Livre',
    min: null,
    max: null,
    regra: 'Espécie alóctone listada no Art. 7º, V. Captura e transporte LIVRES de limite de cota.'
  },
  {
    id: 'tilapia',
    nome: 'Tilápia',
    nomeCientifico: 'Oreochromis spp. / Tilapia spp.',
    status: 'exotica',
    statusTexto: 'Captura e Cota Livre',
    min: null,
    max: null,
    regra: 'Espécie exótica listada no Art. 7º, VIII. Captura e transporte LIVRES de limite de cota.'
  },
  {
    id: 'tambaqui',
    nome: 'Tambaqui',
    nomeCientifico: 'Colossoma macropomum',
    status: 'exotica',
    statusTexto: 'Captura e Cota Livre',
    min: null,
    max: null,
    regra: 'Espécie alóctone listada no Art. 7º, XI (acrescentado pelo Decreto nº 15.375/20). Captura e transporte LIVRES de cota.'
  },
  {
    id: 'dourado',
    nome: 'Dourado',
    nomeCientifico: 'Salminus brasiliensis',
    status: 'proibido',
    statusTexto: 'PROIBIDO / Moratória',
    min: null,
    max: null,
    regra: 'PROIBIDA a captura, abate, transporte e comercialização em todo o MS (Art. 8º do Decreto nº 15.166 e Lei Estadual nº 5.321/19, prorrogada pela Lei nº 6.190/24 até 2029). Permitido exclusivamente Pesque e Solte esportivo.'
  }
];

import { abrirModalDeTemplate } from './modal-manager.js';

let modalEspeciesInstancia = null;

export function renderizarEspecies(termoBusca = '', containerEl = null) {
  const container = containerEl 
    ? (containerEl.querySelector('#species-grid') || containerEl.querySelector('#species-cards-container'))
    : (document.getElementById('species-grid') || document.getElementById('species-cards-container'));

  if (!container) return;

  const termo = termoBusca.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filtradas = ESPECIES_MS.filter((esp) => {
    if (!termo) return true;
    const n = esp.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const c = esp.nomeCientifico.toLowerCase();
    const s = esp.statusTexto.toLowerCase();
    return n.includes(termo) || c.includes(termo) || s.includes(termo);
  });

  if (filtradas.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 20px;">Nenhuma espécie encontrada com "${escapeHTML(termoBusca)}".</p>`;
    return;
  }

  container.innerHTML = filtradas.map((esp) => {
    let badgeClass = 'badge-cota-zero';
    if (esp.status === 'proibido') badgeClass = 'badge-proibido';
    else if (esp.status === 'pesque-solte') badgeClass = 'badge-pesque-solte';
    else if (esp.status === 'exotica') badgeClass = 'badge-exotica';

    let medidasTexto = '';
    if (esp.min && esp.max) {
      medidasTexto = `<span>Mín: <strong>${esp.min} cm</strong></span> <span>Máx: <strong>${esp.max} cm</strong></span>`;
    } else if (esp.min) {
      medidasTexto = `<span>Mínimo: <strong>${esp.min} cm</strong></span> <span>Sem limite máx.</span>`;
    } else if (esp.status === 'proibido') {
      medidasTexto = `<span style="color: #b91c1c; font-weight: 700;">Moratória: Captura 0 cm</span>`;
    } else {
      medidasTexto = `<span style="color: #15803d; font-weight: 700;">Cota Livre (Espécie Exótica)</span>`;
    }

    return `
      <div class="species-card ${esp.status === 'proibido' ? 'species-card-proibido' : ''}">
        <div class="species-header">
          <div>
            <div class="species-name">${escapeHTML(esp.nome)}</div>
            <div class="species-sci">${escapeHTML(esp.nomeCientifico)}</div>
          </div>
          <span class="species-badge ${badgeClass}">${escapeHTML(esp.statusTexto)}</span>
        </div>
        <div class="species-measures">
          ${medidasTexto}
        </div>
        <div class="species-desc">${escapeHTML(esp.regra)}</div>
      </div>
    `;
  }).join('');
}

export function verificarMedidaPescado(modalEl = null) {
  const ctx = modalEl || document;
  const selectSpecies = ctx.querySelector('#checker-species') || document.getElementById('checker-species');
  const inputSize = ctx.querySelector('#checker-length') || ctx.querySelector('#checker-size') || document.getElementById('checker-length');
  const measureResult = ctx.querySelector('#measure-result') || document.getElementById('measure-result');

  if (!selectSpecies || !inputSize || !measureResult) return;

  const espId = selectSpecies.value;
  const valor = parseFloat(inputSize.value);

  if (isNaN(valor) || valor <= 0) {
    measureResult.className = 'measure-result-box forbidden';
    measureResult.textContent = 'Por favor, informe o tamanho do peixe em centímetros (ex: 88).';
    return;
  }

  const esp = ESPECIES_MS.find((e) => e.id === espId);
  if (!esp) return;

  vibrar(20);

  if (esp.status === 'proibido') {
    measureResult.className = 'measure-result-box forbidden';
    measureResult.innerHTML = `🚫 <strong>Dourado Proibido!</strong> Em Mato Grosso do Sul, a captura e o abate do Dourado são proibidos por lei (Lei Estadual nº 5.321/19 prorrogada até 2029). <strong>Soltura imediata e obrigatória!</strong>`;
    return;
  }

  if (esp.status === 'exotica') {
    measureResult.className = 'measure-result-box allowed';
    measureResult.innerHTML = `✅ <strong>Espécie Exótica / Alóctone!</strong> Captura e transporte <strong>totalmente livres de limite de cota</strong> (Decreto Estadual nº 15.166/19, Art. 7º). Ajude a controlar as espécies invasoras!`;
    return;
  }

  if (esp.min && esp.max) {
    if (valor >= esp.min && valor <= esp.max) {
      measureResult.className = 'measure-result-box allowed';
      measureResult.innerHTML = `✅ <strong>Dentro da Faixa Permitida!</strong> (${esp.min} a ${esp.max} cm). Permitido para captura e transporte (integrante da cota de 1 exemplar nativo por pescador com carteirinha do IMASUL) ou consumo no local. O peixe transportado deve estar inteiro com cabeça e escamas/couro!`;
    } else if (valor < esp.min) {
      measureResult.className = 'measure-result-box forbidden';
      measureResult.innerHTML = `❌ <strong>Abaixo da Medida Mínima!</strong> O peixe tem ${valor} cm e o mínimo legal é <strong>${esp.min} cm</strong>. Infração ambiental grave. <strong>Solte imediatamente no local de captura (Art. 9º, § 3º)!</strong>`;
    } else {
      measureResult.className = 'measure-result-box forbidden';
      measureResult.innerHTML = `❌ <strong>Acima da Medida Máxima!</strong> O exemplar tem ${valor} cm e o teto máximo de proteção de matrizes reprodutoras é <strong>${esp.max} cm</strong>. <strong>Solte vivo imediatamente no local de captura (Art. 9º, § 3º)!</strong>`;
    }
  } else if (esp.min) {
    if (valor >= esp.min) {
      measureResult.className = 'measure-result-box allowed';
      measureResult.innerHTML = `✅ <strong>Acima do Tamanho Mínimo!</strong> (Mínimo: ${esp.min} cm). Permitido para captura e transporte (1 exemplar nativo) ou consumo local.`;
    } else {
      measureResult.className = 'measure-result-box forbidden';
      measureResult.innerHTML = `❌ <strong>Abaixo do Mínimo Legal!</strong> (${valor} cm &lt; ${esp.min} cm). Proibido o abate ou transporte. <strong>Solte o peixe na água com cuidado (Art. 9º, § 3º)!</strong>`;
    }
  } else {
    measureResult.className = 'measure-result-box allowed';
    measureResult.innerHTML = `ℹ️ ${esp.regra}`;
  }
}

export function abrirModalEspecies() {
  modalEspeciesInstancia = abrirModalDeTemplate('template-modal-especies', {
    modalId: 'modal-especies',
    onMount: (modalEl) => {
      renderizarEspecies('', modalEl);

      const btnRunCheck = modalEl.querySelector('#btn-run-check') || modalEl.querySelector('#checker-btn');
      if (btnRunCheck) {
        btnRunCheck.addEventListener('click', () => verificarMedidaPescado(modalEl));
      }

      const speciesSearchInput = modalEl.querySelector('#species-search-input');
      if (speciesSearchInput) {
        speciesSearchInput.addEventListener('input', (e) => {
          renderizarEspecies(e.target.value, modalEl);
        });
      }
    },
    onDestroy: () => {
      modalEspeciesInstancia = null;
    }
  });
}

export function fecharModalEspecies() {
  if (modalEspeciesInstancia) {
    modalEspeciesInstancia.destroy();
    modalEspeciesInstancia = null;
  }
}

export function initSpeciesChecker() {
  const triggerBtns = document.querySelectorAll('#btn-especies, #btn-especies-modal, #btn-hero-species, #nav-btn-especies');
  triggerBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      vibrar(25);
      abrirModalEspecies();
    });
  });
}

// Retrocompatibilidade global
if (typeof window !== 'undefined') {
  window.abrirModalEspecies = abrirModalEspecies;
  window.fecharModalEspecies = fecharModalEspecies;
  window.verificarMedidaPescado = verificarMedidaPescado;
  window.renderizarEspecies = renderizarEspecies;
}
