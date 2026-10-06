# XXI Prêmio Sul-Mato-Grossense de Inovação na Gestão Pública
## Roteiro e Arquitetura Estratégica da Proposta: GeoFish MS

**Título do Projeto:** GeoFish MS: Plataforma WebGIS PWA para Governança Territorial, Turismo Sustentável e Inclusão Produtiva dos Pescadores Artesanais na Bacia do Rio Miranda (Pantanal MS)  
**Eixo Temático:** Inovação e Sustentabilidade  
**Modalidade:** Ideias Inovadoras  
**Autor e Desenvolvedor:** Peterson Martins da Costa  
**Repositório Oficial:** `https://github.com/petermar23/geofish-ms` (Branch: `feat/conexao-trecho-piloteiro-regras`)

---

## 🏛️ Resumo Executivo & Diagrama da Solução

O **GeoFish MS** é uma solução pública, cívica e de código aberto concebida para superar um duplo gargalo histórico no Pantanal de Mato Grosso do Sul: a exclusão digital e econômica dos piloteiros e pescadores artesanais ribeirinhos, e a vulnerabilidade do turista da pesca amadora, que frequentemente comete infrações ambientais involuntárias por desconhecimento das regras estaduais ou cai em plataformas intermediárias predatórias.

```text
                  ┌──────────────────────────────────────────────┐
                  │    XXI Prêmio de Inovação na Gestão Pública  │
                  └──────────────────────┬───────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │          GeoFish MS (WebGIS + IA Cívica)      │
                 └───────────┬───────────────────────┬───────────┘
                             │                       │
      ┌──────────────────────┴──────┐         ┌──────┴──────────────────────┐
      │  INCLUSÃO DO RIBEIRINHO     │         │   CONEXÃO COM O TURISTA     │
      │  (Supera a Barreira Digital)│         │   (Elimina Intermediários)  │
      ├─────────────────────────────┤         ├─────────────────────────────┤
      │ • Piloteiro fala por áudio  │         │ • Turista planeja viagem e  │
      │   ou mensagem no WhatsApp.  │         │   consulta cotas no WebGIS. │
      │ • Colônias Z-1, Z-7 e Z-11  │         │ • Contratação direta com o  │
      │   homologam o RGP do guia.  │         │   guia ribeirinho credenciado.│
      │ • Ponto gerado no GeoJSON!  │         │ • PWA 100% offline no barco!│
      └─────────────────────────────┘         └─────────────────────────────┘
```

---

## 1. 🛡️ Protocolo Institucional com as Colônias de Pescadores (Governança & Auditoria)

### Contexto e Desafio
A inserção de trabalhadores tradicionais em plataformas digitais muitas vezes falha por dois extremos: ou cria formulários web burocráticos que excluem o pescador analfabeto funcional, ou abre cadastros irrestritos na internet sujeitos a invasão de guias clandestinos, "piratas do rio" sem habilitação náutica e vandalismo de dados.

### A Estrutura de Homologação Social
Para garantir legitimidade pública, governança participativa e compliance com as normas da Capitania Fluvial e do Estado, o GeoFish MS estabelece um protocolo descentralizado com as entidades representativas locais:
* **Colônia de Pescadores Z-1** (Miranda / Corumbá / Passo do Lontra)
* **Colônia de Pescadores Z-7** (Aquidauana / Anastácio)
* **Colônia de Pescadores Z-11** (Bonito / Águas do Miranda)

### Como Funciona o Fluxo de Adesão e Auditoria:
1. **Cadastro Fechado e Auditado:** O cadastro de piloteiros e embarcações **NÃO é aberto publicamente a qualquer usuário anônimo na internet**. Não há formulário aberto suscetível a spams ou descaracterização do serviço.
2. **Porta de Entrada Acessível (WhatsApp ou Balcão):** O trabalhador ribeirinho procura a diretoria da sua respectiva Colônia (Z-1, Z-7 ou Z-11) ou envia um áudio no canal oficial de triagem (`+55 16 99266-7526`), relatando seus dados operacionais (nome, porto base, tipo de barco, motor e rios onde atua).
3. **Auditoria Documental do RGP:** A diretoria da Colônia confere o **RGP (Registro Geral da Atividade Pesqueira)** ativo ou comprovante de filiação profissional de pescador/guia artesanal, atestando que o candidato é efetivamente um trabalhador do território.
4. **Homologação e Inclusão no GeoJSON:** Uma vez auditada e homologada a condição do profissional, sua ficha é estruturada e inserida na base geoespacial auditável (`guias_credenciados.geojson`), passando a figurar no mapa oficial com o selo da respectiva Colônia.
5. **Combate a Clandestinos:** Esse modelo elimina atravessadores que retêm até 40% da diária do pescador e impede que guias piratas operem sem segurança nas águas pantaneiras.

---

## 2. 🎣 A Jornada Completa do Turista (Antes, Durante e Depois da Pescaria)

O GeoFish MS acompanha o turista esportivo nos 3 momentos cruciais de sua experiência, promovendo turismo regenerativo e conformidade preventiva:

### Momento 1: Antes da Viagem (Planejamento Conectado — SP, PR, MG, etc.)
* **Acesso pelo Navegador:** O visitante acessa o portal WebGIS ainda em sua cidade de origem com internet de alta velocidade.
* **Planejamento Territorial:** Visualiza os trechos de pesca abertos, os portos de descida com rampas náuticas e pousadas credenciadas na Bacia do Miranda.
* **Emissão da Licença Digital:** É direcionado ao portal do **IMASUL** para emissão da Autorização Ambiental para Pesca Amadora obrigatória (esclarecendo que no MS não existe "selo turismo").
* **Contratação Direta sem Taxas:** Encontra os piloteiros locais credenciados por porto/trecho e aciona diretamente o WhatsApp do barqueiro para fechar a diária, sem cobrança de comissões.

### Momento 2: Durante a Pescaria no Rio (No Barco — Modo 100% Offline-First)
* **Operação sem Internet 4G:** No meio da calha dos rios Miranda, Aquidauana ou Vermelho, onde não há torre de telefonia móvel, o pescador abre o aplicativo salvo no celular (PWA e IndexedDB).
* **Navegação com GPS Náutico:** Acompanha sua geolocalização náutica em tempo real sobre a cartografia base vetorial e limites hidrográficos.
* **Alerta de Zonas Restritas:** Verifica imediatamente se está adentrando trechos com proteção especial, como o **Rio Salobra (Decreto Estadual nº 15.166/2019)**, onde vigora regime exclusivo de Pesque e Solte com motores elétricos ou de 4 tempos de baixa emissão.
* **Régua Digital de Espécies:** Consulta a tabela oficial biométrica do MS para aferir medidas mínimas e máximas de abate (ex.: Pintado entre 85 e 125 cm; Pacu entre 45 e 65 cm; Dourado com abate proibido pela Lei nº 6.190/2024).
* **Botão SOS Fluvial:** Em caso de emergência médica ou pane mecânica, formata as coordenadas exatas do GPS náutico com link direto para socorro junto à PMA (`(67) 3242-4344` / `(67) 3357-1500`), Bombeiros (`193`) ou Marinha (`185`).

### Momento 3: No Retorno à Rodovia (BR-262 / MS-184 Estrada Parque / MS-345)
* **Localização de Postos da PMA:** Ao encerrar a pescaria e sair do porto para as rodovias pantaneiras, o mapa guia o condutor ao Posto ou Pelotão da **Polícia Militar Ambiental (PMA)** mais próximo (Pelotão de Miranda, Pelotão de Aquidauana, Corumbá, Bonito ou Buraco das Piranhas).
* **Exemplar Inteiro no Gelo:** Orienta o pescador a manter o exemplar nativo permitido (cota de 1 exemplar regulamentar + 5 piranhas) rigorosamente inteiro (com cabeça, cauda e vísceras), sendo proibido o transporte em filés na estrada.
* **Lacre Oficial e Emissão da GCP:** A PMA confere as medidas na régua oficial, afixa o lacre plástico numerado e emite a **Guia de Controle de Pescado (GCP)** gratuitamente.
* **Trânsito Legalizado:** Com a GCP e o peixe lacrado, o turista viaja com total segurança jurídica pelas rodovias estaduais, com risco zero de apreensão, multas ou constrangimento policial.

---

## 3. 📊 Matriz de Indicadores de Impacto na Gestão Pública

O GeoFish MS estabelece metas quantitativas e métricas auditáveis para que a gestão pública estadual (SEMADESC, IMASUL, FUNDTUR e PMA) mensure o retorno do projeto:

| Indicador | Dimensão de Avaliação | Meta no 1º Ciclo Piloto | Métrica & Fonte de Verificação |
| :--- | :--- | :--- | :--- |
| **Indicador 1: Renda Local Direta & Justiça Social** | Inclusão socioeconômica e eliminação de intermediários predatórios | **40 a 60 guias e piloteiros artesanais** formalizados nas Colônias Z-1, Z-7 e Z-11 | **100%** do valor da diária de guiamento pago diretamente na conta/família do ribeirinho (verificado via relatórios semestrais das Colônias). |
| **Indicador 2: Conformidade Ambiental Preventiva** | Educação ambiental cidadã e redução de crimes ambientais | Mais de **5.000 consultas cidadãs** às regras protetivas da Bacia do Miranda | Redução do número de autuações involuntárias lavradas pela PMA por desconhecimento do Decreto nº 15.166/19 (Salobra) e da Cota Zero do Dourado (Lei nº 5.321/19). Aumento na emissão regular de GCPs nos postos rodoviários. |
| **Indicador 3: Eficiência do Gasto Público & Soberania Tecnológica** | Economicidade, sustentabilidade fiscal e software livre | Custo de licenciamento de software para os cofres do Estado: **R$ 0,00** | Custo operacional mensal de infraestrutura: **R$ 0,00** (hospedagem estática distribuída no GitHub Pages, sem dependência de licenças proprietárias de SIG comercial como ArcGIS Server). |

---

## 4. 📅 O Calendário Automático do Defeso (Piracema) no Código

A proteção ao ciclo reprodutivo dos peixes migradores do Pantanal é implementada por uma lógica algorítmica autônoma no frontend (`js/modules/utils.js` e `js/app.js`), que roda no próprio dispositivo do usuário sem depender de chamadas a servidores de nuvem:

### Regra Temporal da Piracema no MS
O período de defeso da bacia do Rio Paraguai (onde se insere o Rio Miranda) ocorre anualmente de **05 de Novembro a 28 (ou 29) de Fevereiro**, conforme resoluções conjuntas SEMADESC/IMASUL.

### Implementação Técnica
* **Função Determinística:** `estaEmDefeso()` calcula a data local do dispositivo (`mes === 11 && dia >= 5 || mes === 12 || mes === 1 || mes === 2`).
* **Sinalização Dinâmica no WebGIS:**
  * **Quando em Defeso:** O banner superior ativa o estado crítico (`.banner-defeso.defeso-ativo`), alertando em vermelho e âmbar sobre a suspensão da captura e informando que apenas ecoturismo de observação ou subsistência ribeirinha comprovada são tolerados.
  * **Fora do Defeso (Temporada Aberta):** O banner assume a tonalidade verde e neutra (`.banner-defeso.temporada-aberta`), recordando ativamente a cota máxima permitida (1 exemplar nativo + 5 piranhas, Dourado com soltura obrigatória) e o dever de emitir a GCP na PMA antes de ingressar na rodovia.
* **Acessibilidade e Usabilidade:** O banner possui atributos ARIA para leitores de tela (`role="region"` / `aria-label`), ícones semânticos e botão intuitivo de recolhimento (`#btn-fechar-banner-defeso`), garantindo que o mapa nunca fique obstruído durante a navegação prática no barco.

---

## 5. 🎯 Conclusão: Uma Inovação Pública com Pés no Chão Pantaneiro

O GeoFish MS comprova que a verdadeira inovação na gestão pública não reside na compra de softwares caros ou na imposição de barreiras tecnológicas sofisticadas, mas em desenhar soluções simples, robustas e cidadãs:
1. **Dá voz a quem conhece cada curva do rio:** o piloteiro tradicional da Colônia.
2. **Protege a biodiversidade aquática:** prevenindo infrações ambientais antes que a viatura da PMA precise autuar.
3. **Respeita o dinheiro do contribuinte:** custo zero de software, 100% aberto e pronto para escalabilidade em todas as bacias hidrográficas de Mato Grosso do Sul.
