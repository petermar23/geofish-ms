/**
 * GeoFish MS - Módulo do Guia de Regras de Pesca
 * Apresenta compilação didática da legislação de pesca de MS.
 * Decretos Estaduais nº 15.166/19, 15.375/20 e Lei nº 6.190/24.
 */

import { abrirModalDeTemplate } from './modal-manager.js';
import { vibrar } from './utils.js';

let modalInstancia = null;

const CONTEUDO_CARTILHA = {
  regras: `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
      <h3 style="color: #166534; font-size: 0.95rem; margin-top: 0; margin-bottom: 6px;">🎣 Cota de Captura e Transporte (Bacia do Paraguai)</h3>
      <p style="margin: 0; font-size: 0.84rem; color: #14532d; line-height: 1.45;">
        Conforme os <strong>Decretos Estaduais nº 15.166/2019 e nº 15.375/2020</strong>, o pescador amador/esportivo devidamente licenciado pode capturar e transportar:
      </p>
      <ul style="margin: 6px 0 0 0; padding-left: 20px; font-size: 0.84rem; color: #14532d; line-height: 1.45;">
        <li><strong>Apenas 1 (um) exemplar</strong> de peixe nativo de espécie permitida, rigorosamente dentro da faixa de tamanho mínimo e máximo.</li>
        <li><strong>Até 5 (cinco) exemplares</strong> de piranha (<em>Pygocentrus nattereri / Serrasalmus marginatus</em>).</li>
        <li><strong>Consumo no barco/rancho:</strong> É permitido o consumo de pescado no local da pescaria respeitando tamanhos mínimos. O que for consumido no local não conta na cota de transporte rodoviário.</li>
      </ul>
    </div>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
      <h3 style="color: #991b1b; font-size: 0.95rem; margin-top: 0; margin-bottom: 6px;">🚫 Proibições Expressas e Rigorosas</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 0.84rem; color: #7f1d1d; line-height: 1.45;">
        <li><strong>Dourado (<em>Salminus brasiliensis</em>):</strong> Captura, abate e transporte PROIBIDOS até 2029 (Lei Estadual nº 6.190/2024). Prática EXCLUSIVA de Pesque e Solte.</li>
        <li><strong>Transporte Interestadual:</strong> É expressamente PROIBIDO retirar pescado nativo para fora do território de Mato Grosso do Sul. Todo o peixe transportado deve ter como destino o consumo interno no estado.</li>
        <li><strong>Filetagem na margem/barco:</strong> O peixe deve ser transportado inteiro, com cabeça, escamas ou couro, para permitir medição precisa da fiscalização.</li>
      </ul>
    </div>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 0.82rem; color: #475569; line-height: 1.45;">
      📄 <strong>Licença Obrigatória:</strong> Todo pescador amador a bordo deve portar a Licença Digital de Pesca emitida pelo IMASUL (impressa ou salva no celular com comprovante de pagamento quitado).
    </div>
  `,

  iscas: `
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
      <h3 style="color: #1e40af; font-size: 0.95rem; margin-top: 0; margin-bottom: 6px;">🪱 Normas para Iscas Vivas Nativas</h3>
      <p style="margin: 0; font-size: 0.84rem; color: #1e3a8a; line-height: 1.45;">
        O uso de iscas vivas para pesca esportiva na Bacia do Rio Miranda segue regulamentação específica do IMASUL:
      </p>
      <ul style="margin: 6px 0 0 0; padding-left: 20px; font-size: 0.84rem; color: #1e3a8a; line-height: 1.45;">
        <li><strong>Iscas Permitidas:</strong> Tuvira/Sarapó (<em>Gymnotus spp.</em>), caranguejo do pantanal, minhocuçu e pequenos lambaris nativos.</li>
        <li><strong>Origem Comprovada:</strong> As iscas compradas devem ter comprovação de origem (nota de produtor de iscas credenciado junto ao IMASUL/PMA).</li>
        <li><strong>Limite por Pescador:</strong> Máximo de iscas vivas por amador de acordo com a portaria anual vigente.</li>
      </ul>
    </div>
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; font-size: 0.84rem; color: #92400e; line-height: 1.45;">
      ⚠️ <strong>Proibição de Espécies Exóticas:</strong> É terminantemente proibido utilizar peixes exóticos vivos como isca (ex: tilápia, tucunaré, bagre-africano, carpa). O escape ou descarte dessas espécies nas bacias pantaneiras constitui grave desequilíbrio ecológico e crime ambiental.
    </div>
  `,

  rios: `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
      <h3 style="color: #991b1b; font-size: 0.95rem; margin-top: 0; margin-bottom: 6px;">🌊 Santuários e Rios de Pesca Proibida em MS</h3>
      <p style="margin: 0 0 8px 0; font-size: 0.84rem; color: #7f1d1d; line-height: 1.45;">
        Nos rios e trechos abaixo, a pesca é permanentemente proibida ou estritamente restrita pela legislação estadual:
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 0.84rem; color: #7f1d1d; line-height: 1.45;">
        <li><strong>Rio Salobra:</strong> Totalmente proibida qualquer modalidade de pesca extrativa. Permitido exclusivamente o ecoturismo e observação em pontos autorizados.</li>
        <li><strong>Rio da Prata e Rio Formoso (Bonito/Jardim):</strong> Pesca proibida em toda a extensão cênica e turística.</li>
        <li><strong>Distâncias de Estruturas:</strong> Proibida a pesca a menos de 200 metros a montante e a jusante de cachoeiras, corredeiras, barragens e escadas de peixes.</li>
        <li><strong>Confluências Náuticas:</strong> Proibida pesca predatória nas barras e desembocaduras de tributários durante períodos de concentração de peixes.</li>
      </ul>
    </div>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 0.82rem; color: #475569; line-height: 1.45;">
      💡 <strong>No GeoFish MS:</strong> A camada <em>"⚠️ Áreas Restritas"</em> destaca no mapa esses polígonos em vermelho translúcido para evitar infrações por desconhecimento náutico.
    </div>
  `,

  gcp: `
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
      <h3 style="color: #1e40af; font-size: 0.95rem; margin-top: 0; margin-bottom: 6px;">🏷️ Vistoria, Lacre e Emissão da GCP</h3>
      <p style="margin: 0 0 8px 0; font-size: 0.84rem; color: #1e3a8a; line-height: 1.45;">
        Para transportar legalmente o exemplar nativo da cota na rodovia, siga as orientações recomendadas:
      </p>
      <ol style="margin: 0; padding-left: 20px; font-size: 0.84rem; color: #1e3a8a; line-height: 1.5;">
        <li><strong>Não filete o peixe:</strong> O exemplar deve estar inteiro, eviscerado e com cabeça no gelo.</li>
        <li><strong>Compareça a um Posto da PMA:</strong> Em Miranda (BR-262), Aquidauana, Corumbá ou Bonito.</li>
        <li><strong>Medição no Posto:</strong> O policial ambiental afere o comprimento com régua padrão.</li>
        <li><strong>Colocação do Lacre:</strong> O peixe recebe o lacre numerado inviolável da PMA.</li>
        <li><strong>Emissão da GCP:</strong> É emitida a Guia de Controle de Pescado vinculada à sua licença estadual.</li>
      </ol>
    </div>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; font-size: 0.84rem; color: #991b1b; line-height: 1.45;">
      🚨 <strong>Atenção:</strong> Transportar peixe nativo na rodovia sem o lacre e sem a GCP caracteriza transporte irregular de produto da pesca, sujeito a apreensão do pescado, do veículo e multa ambiental.
    </div>
  `
};

export function alternarAbaCartilha(aba = 'regras', container = document) {
  const tabBtns = container.querySelectorAll('.cartilha-tab-btn');
  tabBtns.forEach((btn) => {
    const key = btn.getAttribute('data-tab-cartilha');
    if (key === aba) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const conteudoEl = container.querySelector('#conteudo-cartilha-tab');
  if (conteudoEl && CONTEUDO_CARTILHA[aba]) {
    conteudoEl.innerHTML = CONTEUDO_CARTILHA[aba];
  }
}

export function abrirModalCartilha(abaInicial = 'regras') {
  modalInstancia = abrirModalDeTemplate('template-modal-cartilha', {
    modalId: 'modal-cartilha',
    onMount: (modalEl) => {
      const tabBtns = modalEl.querySelectorAll('.cartilha-tab-btn');
      tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          vibrar(20);
          const tab = btn.getAttribute('data-tab-cartilha') || 'regras';
          alternarAbaCartilha(tab, modalEl);
        });
      });

      const btnFecharRodape = modalEl.querySelector('#btn-fechar-cartilha-rodape');
      if (btnFecharRodape) {
        btnFecharRodape.addEventListener('click', () => {
          vibrar(15);
          fecharModalCartilha();
        });
      }

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
