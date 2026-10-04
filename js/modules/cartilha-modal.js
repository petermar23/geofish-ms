/**
 * GeoFish MS - Módulo do Leitor da Cartilha Oficial PMA-MS
 * Template Dinâmico de Modal: carregamento sob demanda para alívio do DOM inicial
 */

import { vibrar } from './utils.js';

let modalCartilhaInstancia = null;

function renderizarTemplateCartilha() {
  const wrapper = document.createElement('div');
  wrapper.id = 'modal-cartilha';
  wrapper.className = 'modal-backdrop hidden';
  wrapper.setAttribute('role', 'dialog');
  wrapper.setAttribute('aria-modal', 'true');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.setAttribute('aria-label', 'Cartilha Oficial do Pescador PMA-MS');
  wrapper.style.zIndex = '2650';

  wrapper.innerHTML = `
    <div class="modal-dialog modal-dialog-lg">
      <div class="modal-header cartilha-modal-header" style="background-color: #14532d;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <svg class="icon-svg" style="stroke: #86efac; width: 28px; height: 28px; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <div>
            <h2 style="margin: 0; font-size: 1.15rem; color: #ffffff;">Cartilha Oficial do Pescador — PMA/MS</h2>
            <span style="font-size: 0.78rem; color: #86efac;">Batalhão de Polícia Militar Ambiental (BPMA/MS)</span>
          </div>
        </div>
        <button id="btn-fechar-cartilha" class="modal-close-btn" aria-label="Fechar cartilha">&times;</button>
      </div>

      <!-- Abas de Navegação pelos Capítulos da Cartilha -->
      <div class="cartilha-tabs-nav" role="tablist">
        <button id="tab-btn-rios-proibidos" class="cartilha-tab-btn active" data-tab="rios">
          🚫 Rios Proibidos &amp; Reservas
        </button>
        <button id="tab-btn-iscas" class="cartilha-tab-btn" data-tab="iscas">
          🐛 Iscas Vivas (Medidas)
        </button>
        <button id="tab-btn-transporte" class="cartilha-tab-btn" data-tab="transporte">
          📋 Guia (GCP) &amp; Fiscalização
        </button>
        <button id="tab-btn-petrechos" class="cartilha-tab-btn" data-tab="petrechos">
          ⚠️ Petrechos &amp; Ceva
        </button>
        <button id="tab-btn-contatos" class="cartilha-tab-btn" data-tab="contatos">
          📞 Telefones da PMA
        </button>
      </div>

      <div class="modal-body cartilha-modal-body">
        <!-- PAINEL 1: RIOS PROIBIDOS, PESQUE E SOLTE E RESERVAS -->
        <div id="panel-cartilha-rios" class="cartilha-tab-panel active">
          <div class="cartilha-box alert-red-box">
            <h4>🚫 Rios Onde a Pesca é Proibida em Qualquer Período (Pág. 16)</h4>
            <p><strong>A pesca nestes rios é CRIME AMBIENTAL com detenção de 1 a 3 anos e apreensão do barco e motor:</strong></p>
            <ul class="cartilha-list">
              <li><strong>Rio Salobra (Miranda e Bodoquena):</strong> Proibida qualquer pesca. Navegação permitida <strong>exclusivamente com motor de 4 tempos de potência até 15hp</strong>.</li>
              <li><strong>Córrego Azul:</strong> Município de Bodoquena.</li>
              <li><strong>Rio da Prata:</strong> Municípios de Bonito e Jardim.</li>
              <li><strong>Rio Nioaque:</strong> Municípios de Nioaque e Anastácio.</li>
              <li><strong>Rio Formoso e Rio Mimoso:</strong> Município de Bonito.</li>
              <li><strong>Unidades de Conservação de Proteção Integral:</strong> Parque Estadual das Várzeas do Rio Ivinhema e demais parques estaduais/nacionais.</li>
            </ul>
          </div>

          <div class="cartilha-box notice-blue-box" style="margin-top: 14px;">
            <h4>🎣 Áreas de Pesque e Solte Exclusivo Obrigatório (Pág. 9)</h4>
            <ul class="cartilha-list">
              <li><strong>Rio Negro:</strong> Trecho da confluência com o córrego Lajeado (Rio Negro) até o brejo no limite oeste da fazenda Fazendinha (Aquidauana).</li>
              <li><strong>Rio Perdido:</strong> Em toda sua extensão (Bonito, Jardim, Caracol e Porto Murtinho).</li>
              <li><strong>Rio Abobral:</strong> Em toda sua extensão (Aquidauana e Corumbá).</li>
              <li><strong>Rio Vermelho:</strong> Em toda sua extensão no município de Corumbá.</li>
            </ul>
          </div>

          <div class="cartilha-box notice-yellow-box" style="margin-top: 14px;">
            <h4>🛑 Reservas de Pesca &amp; Pontes Históricas (Págs. 10 e 11)</h4>
            <ul class="cartilha-list">
              <li><strong>Bacia do Rio Miranda:</strong> Proibida a pesca acima da <strong>Ponte Velha de Miranda</strong> (acesso a Bodoquena) e seus afluentes.</li>
              <li><strong>Bacia do Rio Aquidauana:</strong> Proibida a pesca acima da <strong>Ponte Velha</strong> que liga Aquidauana a Anastácio.</li>
              <li><strong>Distâncias Permanentes:</strong> 200m de cachoeiras, corredeiras, embocaduras de baías e escadas de peixes; 1.000m de barragens e ninhais.</li>
            </ul>
          </div>
        </div>

        <!-- PAINEL 2: ISCAS VIVAS & MEDIDAS MÍNIMAS -->
        <div id="panel-cartilha-iscas" class="cartilha-tab-panel">
          <div class="cartilha-box notice-green-box">
            <h4>🐛 Tamanhos Mínimos Oficiais de Captura de Iscas Vivas (Pág. 8)</h4>
            <p>A captura de iscas vivas só pode ser realizada por <strong>pescadores profissionais habilitados</strong>. No período de defeso da piracema, a captura de iscas só é permitida <strong>a partir de 20 de fevereiro</strong>. A captura desrespeitando essas medidas é crime punível com <strong>prisão de até 3 anos</strong>.</p>
          </div>

          <div class="species-table-wrapper" style="margin-top: 12px; overflow-x: auto;">
            <table class="portal-species-table" style="width: 100%; font-size: 0.8rem; border-collapse: collapse;">
              <thead>
                <tr style="background: #f1f5f9; text-align: left;">
                  <th style="padding: 8px;">Espécie de Isca</th>
                  <th style="padding: 8px;">Nome Científico</th>
                  <th style="padding: 8px;">Medida Mínima Permitida</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 8px;"><strong>Tuvira (Bacia do Rio Paraguai)</strong></td>
                  <td style="padding: 6px 8px;"><em>Gymnotus inaequilabiatus / paraguaiensis</em></td>
                  <td style="padding: 6px 8px;"><span class="measure-pill min" style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold;">17 cm</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 8px;"><strong>Tuvira (Bacia do Rio Paraná)</strong></td>
                  <td style="padding: 6px 8px;"><em>Gymnotus carapo</em></td>
                  <td style="padding: 6px 8px;"><span class="measure-pill min" style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold;">20 cm</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 8px;"><strong>Mussum</strong></td>
                  <td style="padding: 6px 8px;"><em>Synbranchus marmoratus</em></td>
                  <td style="padding: 6px 8px;"><span class="measure-pill min" style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold;">20 cm</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 8px;"><strong>Pirambóia</strong></td>
                  <td style="padding: 6px 8px;"><em>Lepidosiren paradoxa</em></td>
                  <td style="padding: 6px 8px;"><span class="measure-pill min" style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold;">20 cm</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 8px;"><strong>Chimboré / Timboré / Taguara</strong></td>
                  <td style="padding: 6px 8px;"><em>Schizodon spp</em></td>
                  <td style="padding: 6px 8px;"><span class="measure-pill min" style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold;">15 cm</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 8px;"><strong>Cambota / Camboatá</strong></td>
                  <td style="padding: 6px 8px;"><em>Callichthys callichthys</em></td>
                  <td style="padding: 6px 8px;"><span class="measure-pill min" style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold;">13 cm</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 8px;"><strong>Jejum / Jeju</strong></td>
                  <td style="padding: 6px 8px;"><em>Hoplerythrinus unitaeniatus</em></td>
                  <td style="padding: 6px 8px;"><span class="measure-pill min" style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold;">10 cm</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 8px;"><strong>Lambari</strong></td>
                  <td style="padding: 6px 8px;"><em>Astyanax spp</em></td>
                  <td style="padding: 6px 8px;"><span class="measure-pill min" style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold;">5 cm</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 8px;"><strong>Caramujo</strong></td>
                  <td style="padding: 6px 8px;"><em>Pomacea spp</em></td>
                  <td style="padding: 6px 8px;"><span class="measure-pill min" style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold;">4 cm</span></td>
                </tr>
                <tr>
                  <td style="padding: 6px 8px;"><strong>Caranguejo</strong></td>
                  <td style="padding: 6px 8px;"><em>Dilocarcinus pagel</em></td>
                  <td style="padding: 6px 8px;"><span class="measure-pill min" style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold;">3 cm</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- PAINEL 3: GUIA (GCP), TRANSPORTE E FISCALIZAÇÃO -->
        <div id="panel-cartilha-transporte" class="cartilha-tab-panel">
          <div class="cartilha-box notice-blue-box">
            <h4>📋 Guia de Controle de Pescado (GCP) &amp; Lacre Oficial da PMA (Pág. 6 e 15)</h4>
            <p>O transporte é <strong>permitido EXCLUSIVAMENTE dentro do território de Mato Grosso do Sul</strong> (sendo estritamente proibido o transporte interestadual ou internacional). O pescador licenciado deve se dirigir a <strong>qualquer Quartel, Pelotão ou Posto da Polícia Militar Ambiental (PMA)</strong> em MS para <strong>vistoriar, colocar o lacre plástico numerado e declarar seu pescado</strong>, onde receberá gratuitamente a <strong>Guia de Controle de Pescado (GCP)</strong> (o IMASUL emite apenas a carteira de pesca; não existe taxa ou selo turismo).</p>
            <p style="color: #b91c1c; font-weight: 700; margin-top: 6px;">⚠️ A falta da Guia (GCP) ou do lacre da PMA implica em autuação por crime ambiental, multa e apreensão de veículos e materiais!</p>
          </div>

          <div class="cartilha-box alert-red-box" style="margin-top: 14px;">
            <h4>🐟 Exigência Obrigatória: Peixe Inteiro na Fiscalização</h4>
            <p>O pescado <strong>NÃO PODE</strong> estar com as características descaracterizadas:</p>
            <ul class="cartilha-list">
              <li>❌ <strong>PROIBIDO:</strong> Peixe sem cabeça, descamado, filetado ou em postas nas caixas térmicas sem documento comprobatório.</li>
              <li>✅ <strong>OBRIGATÓRIO:</strong> O peixe deve ser mantido <strong>INTEIRO</strong> com cabeça, nadadeira caudal e escamas ou couro em local de fácil acesso para os policiais da PMA realizarem a medição.</li>
            </ul>
          </div>

          <div class="cartilha-box notice-yellow-box" style="margin-top: 14px;">
            <h4>📦 Declaração Obrigatória de Estoque na Piracema (Pág. 5)</h4>
            <p>Nos frigoríficos, pousadas, peixarias, hotéis e restaurantes, os estoques de pescado <em>in natura</em> ou congelados devem ser declarados ao IMASUL em até <strong>48 horas após o início da piracema</strong>. A falta de declaração, mesmo com nota fiscal, acarreta apreensão de todo o estoque e multa pesada.</p>
          </div>
        </div>

        <!-- PAINEL 4: PETRECHOS PROIBIDOS & CEVA -->
        <div id="panel-cartilha-petrechos" class="cartilha-tab-panel">
          <div class="cartilha-box alert-red-box">
            <h4>🚫 Petrechos e Métodos Proibidos ao Pescador Amador (Pág. 12)</h4>
            <p>A utilização destes métodos é <strong>CRIME AMBIENTAL</strong> inafiançável com perda imediata do barco e tralhas:</p>
            <ul class="cartilha-list">
              <li>❌ <strong>CEVA:</strong> É proibido o emprego de qualquer processo que facilite a concentração artificial de cardumes (como a "ceva").</li>
              <li>❌ <strong>CAVALO-DE-PAU:</strong> É proibida a prática de pesca embarcada com motor ligado em movimento circular ("cavalo-de-pau").</li>
              <li>❌ <strong>PETRECHOS PROIBIDOS:</strong> Cercado, pari, anzol de galho, boia fixa (cavalinho), joão-bobo, garateia/fisga por lambada ou chasco, arpão, flecha, covo, espinhel, tarrafão e qualquer rede de malha.</li>
            </ul>
          </div>

          <div class="cartilha-box notice-green-box" style="margin-top: 14px;">
            <h4>✅ O que é Permitido ao Pescador Amador (Pág. 17)</h4>
            <p>Ao pescador amador/desportista licenciado é permitido <strong>exclusivamente</strong> o uso de:</p>
            <ul class="cartilha-list">
              <li>🎣 Linha de mão simples;</li>
              <li>🎣 Caniço simples (vara caipira);</li>
              <li>🎣 Caniço com molinete ou carretilha (pesca de arremesso ou rodada).</li>
            </ul>
          </div>
        </div>

        <!-- PAINEL 5: TELEFONES E E-MAILS DE TODOS OS PELOTÕES DA PMA -->
        <div id="panel-cartilha-contatos" class="cartilha-tab-panel">
          <div class="cartilha-box notice-blue-box">
            <h4>📞 Telefones e E-mails do Batalhão de Polícia Militar Ambiental (BPMA/MS)</h4>
            <p>Toque no botão para ligar diretamente em caso de dúvidas, denúncias ou emergências na calha do rio:</p>
          </div>

          <div class="pma-contacts-grid" style="margin-top: 14px;">
            <div class="pma-unit-card">
              <div class="unit-name">Pelotão PMA de Miranda</div>
              <div class="unit-river">Bacia do Rio Miranda &bull; Salobra</div>
              <a href="tel:6732424344" class="btn-pma-tel">📞 (67) 3242-4344</a>
              <span class="unit-email">ambientalpantanal@hotmail.com</span>
            </div>

            <div class="pma-unit-card">
              <div class="unit-name">Pelotão PMA de Aquidauana</div>
              <div class="unit-river">Bacia do Rio Aquidauana</div>
              <a href="tel:6739042070" class="btn-pma-tel">📞 (67) 3904-2070</a>
              <span class="unit-email">ppma_aquidauana@yahoo.com.br</span>
            </div>

            <div class="pma-unit-card">
              <div class="unit-name">Posto Buraco das Piranhas</div>
              <div class="unit-river">Passo do Lontra &bull; Estrada Parque</div>
              <a href="tel:6732314444" class="btn-pma-tel">📞 (67) 3231-4444</a>
              <span class="unit-email">Fiscalização 24h na BR-262</span>
            </div>

            <div class="pma-unit-card">
              <div class="unit-name">Posto GPMA Anastácio</div>
              <div class="unit-river">BR-262, Km 482</div>
              <a href="tel:67999946477" class="btn-pma-tel">📞 (67) 99994-6477</a>
              <span class="unit-email">Posto Rodoviário de Controle</span>
            </div>

            <div class="pma-unit-card">
              <div class="unit-name">2ª Cia / 15º BPMA Corumbá</div>
              <div class="unit-river">Rio Paraguai &bull; Porto Geral</div>
              <a href="tel:6739075461" class="btn-pma-tel">📞 (67) 3907-5461</a>
              <span class="unit-email">2cia15bpma@gmail.com</span>
            </div>

            <div class="pma-unit-card">
              <div class="unit-name">Pelotão PMA de Bonito</div>
              <div class="unit-river">Rio Formoso &bull; Peixe Vivo</div>
              <a href="tel:6732551247" class="btn-pma-tel">📞 (67) 3255-1247</a>
              <span class="unit-email">bonito4cpma@hotmail.com</span>
            </div>

            <div class="pma-unit-card">
              <div class="unit-name">Comando Geral BPMA</div>
              <div class="unit-river">Campo Grande &bull; Central Geral</div>
              <a href="tel:6733571500" class="btn-pma-tel">📞 (67) 3357-1500</a>
              <span class="unit-email">pma_ms@yahoo.com.br</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer cartilha-modal-footer" style="padding: 14px 20px; background: #f8fafc; border-top: 1px solid #cbd5e1; text-align: center;">
        <a href="docs/cartilha_do_pescador_pma_ms.pdf" download="Cartilha_do_Pescador_PMA_MS.pdf" class="btn-cta" style="background: #15803d; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.9rem;" target="_blank" rel="noopener noreferrer">
          <svg class="icon-svg" style="stroke: currentColor; width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Baixar Cartilha Oficial Completa em PDF (PMA-MS)</span>
        </a>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);
  modalCartilhaInstancia = wrapper;

  // Event Listeners
  const btnFechar = wrapper.querySelector('#btn-fechar-cartilha');
  if (btnFechar) {
    btnFechar.addEventListener('click', fecharModalCartilha);
  }

  const tabButtons = wrapper.querySelectorAll('.cartilha-tab-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId) alternarAbaCartilha(tabId);
    });
  });

  wrapper.addEventListener('click', (e) => {
    if (e.target === wrapper) {
      fecharModalCartilha();
    }
  });

  return wrapper;
}

export function abrirModalCartilha(abaInicial = 'rios') {
  if (!modalCartilhaInstancia) {
    modalCartilhaInstancia = renderizarTemplateCartilha();
  }
  modalCartilhaInstancia.classList.remove('hidden');
  modalCartilhaInstancia.setAttribute('aria-hidden', 'false');
  vibrar(25);
  alternarAbaCartilha(abaInicial);
  try {
    history.pushState({ modal: 'cartilha' }, '');
  } catch (_) {}
}

export function fecharModalCartilha() {
  if (!modalCartilhaInstancia) return;
  modalCartilhaInstancia.classList.add('hidden');
  modalCartilhaInstancia.setAttribute('aria-hidden', 'true');
}

export function alternarAbaCartilha(tipo) {
  if (!modalCartilhaInstancia) return;

  const abas = {
    rios: { btn: 'tab-btn-rios-proibidos', panel: 'panel-cartilha-rios' },
    iscas: { btn: 'tab-btn-iscas', panel: 'panel-cartilha-iscas' },
    transporte: { btn: 'tab-btn-transporte', panel: 'panel-cartilha-transporte' },
    petrechos: { btn: 'tab-btn-petrechos', panel: 'panel-cartilha-petrechos' },
    contatos: { btn: 'tab-btn-contatos', panel: 'panel-cartilha-contatos' }
  };

  const alvo = abas[tipo];
  if (!alvo) return;

  modalCartilhaInstancia.querySelectorAll('.cartilha-tab-btn').forEach((b) => b.classList.remove('active'));
  modalCartilhaInstancia.querySelectorAll('.cartilha-tab-panel').forEach((p) => p.classList.remove('active'));

  const btnAtivo = modalCartilhaInstancia.querySelector(`#${alvo.btn}`);
  const panelAtivo = modalCartilhaInstancia.querySelector(`#${alvo.panel}`);

  if (btnAtivo) btnAtivo.classList.add('active');
  if (panelAtivo) panelAtivo.classList.add('active');
  vibrar(15);
}

// Fechamento via Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalCartilhaInstancia && !modalCartilhaInstancia.classList.contains('hidden')) {
    fecharModalCartilha();
  }
});

// Retrocompatibilidade global
if (typeof window !== 'undefined') {
  window.abrirModalCartilha = abrirModalCartilha;
  window.fecharModalCartilha = fecharModalCartilha;
  window.alternarAbaCartilha = alternarAbaCartilha;
}
