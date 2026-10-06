# 🌊 GeoFish MS — Bacia do Rio Miranda (Pantanal MS)

> **Plataforma WebGIS PWA, Navegação Náutica e Governança Territorial da Pesca Sustentável**  
> *"O turista encontra; o profissional local conversa diretamente."*

[![Licença MIT](https://img.shields.io/badge/licença-MIT-green.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-0284c7.svg)](manifest.json)
[![Cartografia](https://img.shields.io/badge/CRS-SIRGAS%202000%20%2F%20UTM%2021S-0b4f6c.svg)](data/processed)
[![Pantanal MS](https://img.shields.io/badge/Regi%C3%A3o-Pantanal%20Sul--Mato--Grossense-15803d.svg)](https://github.com/petermar23/geofish-ms)
[![Iniciativa Cidadã](https://img.shields.io/badge/Iniciativa-Cidad%C3%A3%20Independente-amber.svg)](https://github.com/petermar23/geofish-ms)

---

## 🧭 Sobre o Projeto

O **GeoFish MS** é uma aplicação WebGIS cívica e independente, idealizada e desenvolvida por **Peterson Martins da Costa**, com foco na governança territorial, turismo sustentável e apoio comunitário aos pescadores e piloteiros tradicionais da **Bacia Hidrográfica do Rio Miranda** (Mato Grosso do Sul).

Com mais de **44.740 km²** de área de drenagem e 490 km de curso fluvial principal, a Bacia do Rio Miranda abriga um dos ecossistemas de peixes migradores mais produtivos do planeta. O GeoFish MS nasce para resolver dois desafios fundamentais:
1. **Para o Turista e Pescador:** Oferecer um mapa confiável que funcione mesmo sem sinal de celular no meio do rio, com regras de pesca atualizadas, cotas oficiais, localização de rampas náuticas e canais diretos de emergência (SOS).
2. **Para as Comunidades Ribeirinhas:** Dar visibilidade digna aos piloteiros e guias nativos das **Colônias de Pescadores Z-1 (Miranda/Corumbá)**, **Z-7 (Aquidauana/Anastácio)** e **Z-11 (Bonito/Águas do Miranda)**, permitindo que os visitantes entrem em contato direto com eles pelo WhatsApp, sem taxas, comissões ou intermediários.

---

## ✨ Principais Funcionalidades

### 🗺️ 1. WebGIS Náutico de Alta Resolução
* Mapas base alternáveis entre **Esri World Imagery (Satélite de Alta Resolução)** e **Esri World Topo (Relevo e Topografia)**.
* Projeção cartográfica oficial em **SIRGAS 2000 / UTM 21S**.
* Visualização interativa de **8 camadas GeoJSON**:
  * 🚤 **Piloteiros & Guias Nativos:** Localização e contato das Colônias Z-1, Z-7 e Z-11.
  * ⚓ **Rampas Náuticas & Atracadouros:** Pontos de descida de barcos e marinas.
  * 🚨 **Postos de Fiscalização & Apoio:** Pelotões da PMA, bombeiros e pronto atendimento.
  * 🎣 **Trechos de Pesca com Cotas:** Calhas fluviais coloridas pelas normas vigentes.
  * ⚠️ **Áreas de Proteção & UCs:** Parques, RPPNs e zonas de restrição ecológica.
  * 🌊 **Hidrografia Detalhada:** Rios Miranda, Aquidauana, Salobra, Vermelho e afluentes.
  * 🏘️ **Aglomerados Rurais:** Comunidades, portos e vilas ribeirinhas.
  * 🗺️ **Unidades Hidrográficas (UEPGRH) e Bacias Especiais:** Zoneamento ambiental do IMASUL.

### 🚤 2. Contato Direto com Profissionais Locais
* **Sem Intermediação:** O turista localiza o profissional no mapa ou na lista e conversa diretamente por WhatsApp ou telefone.
* **Sem Ranking Pago:** A ordenação no mapa é puramente geográfica. O GeoFish MS não vende posições de destaque.
* **Cadastro 100% Gratuito:** Formulário simples para piloteiros ribeirinhos divulgarem seus barcos sem qualquer mensalidade.
* **Acessibilidade Inclusiva:** Opção de *Cadastro Assistido por Áudio* no WhatsApp para pescadores tradicionais com pouca familiaridade técnica.

### ⚡ 3. Modo Barco (100% Offline-First)
* Arquitetura **PWA (Progressive Web App)** instalável em celulares Android e iPhone.
* **Verificação de Carga Completa:** O botão *"Salvar para o Barco"* armazena em cache e no **IndexedDB** todos os arquivos essenciais e as **8 camadas GeoJSON**, informando o status verificado (ex: *8/8 Salvas*).
* Funciona sem sinal de internet em locais remotos da calha pantaneira.

### 🚨 4. SOS Fluvial & Resgate Integrado
* Telefones oficiais harmonizados:
  * **Pelotão PMA Miranda (Atendimento Local):** `(67) 3242-4344`
  * **Comando Geral PMA-MS (Plantão Estadual):** `(67) 3357-1500`
  * **Emergência Policial:** `190`
  * **Corpo de Bombeiros:** `193`
  * **Marinha do Brasil (Emergência Fluvial):** `185`
* **Transmissão de Coordenadas Náuticas:** Formata automaticamente a latitude, longitude e precisão do GPS do celular em uma mensagem de socorro pronta para compartilhamento via WhatsApp.

### 📸 5. Diário de Bordo & Google Lens
* Registro fotográfico e medição de peixes salvos localmente no dispositivo.
* Botão integrado para envio ou pesquisa direta no **Google Lens** para identificação de espécies, sem custos de API e sem envio de dados para servidores externos.
* **Privacidade LGPD:** Botões de exclusão individual de troféus e limpeza total dos dados locais.

### ⚖️ 6. Conformidade Legal & Cartilha do Pescador
* **Cota Zero do Dourado:** Diretrizes estaduais de soltura obrigatória.
* **Régua de Espécies:** Medidas mínimas e máximas de abate (Pintado, Pacu, Cachara, Jaú, etc.).
* **Passo a Passo do Transporte:** 4 passos essenciais para emitir a Licença IMASUL e obter a **Guia de Controle de Pescado (GCP)** com lacre numerado da PMA.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Finalidade |
| :--- | :--- |
| **HTML5 & CSS3 Moderno** | Interface semântica, responsiva e acessível, com suporte ao Safari iOS e One UI / Chrome Android. |
| **Vanilla JavaScript (ES Modules)** | Arquitetura modular limpa sem dependências pesadas de frameworks, garantindo carregamento instantâneo. |
| **Leaflet.js (v1.9.4)** | Biblioteca cartográfica de alta performance com panes personalizados e renderização via Canvas. |
| **Service Worker & Cache API** | Estratégia de cache offline inteligente com versionamento contínuo (`geofish-shell-v44`). |
| **IndexedDB (GeoFishDB)** | Banco de dados local no navegador para persistência de GeoJSON, diário de bordo e evidências. |
| **SIRGAS 2000 / GeoJSON** | Formato de dados geoespaciais abertos compilados a partir de bases públicas do IMASUL e SEMADESC. |
| **Vite** | Ferramenta de build e servidor de desenvolvimento ultrarrápido. |

---

## 📁 Estrutura de Diretórios

```
geofish-ms/
├── css/
│   └── style.css                 # Folha de estilos unificada (design system náutico)
├── data/
│   └── processed/                # Camadas vetoriais GeoJSON oficiais (SIRGAS 2000)
│       ├── aglomerados_rurais.geojson
│       ├── areas_restritas.geojson
│       ├── bacias_especiais.geojson
│       ├── bacias_uepgrh.geojson
│       ├── guias_credenciados.geojson
│       ├── pontos_emergencia.geojson
│       ├── rios_principais.geojson
│       └── trechos_pesca.geojson
├── docs/                         # Documentação técnica e PDFs normativos da PMA
├── icons/                        # Ícones para PWA e favicons em múltiplas resoluções
├── images/                       # Fotografias autorais do Pantanal e Bacia do Miranda
├── js/
│   ├── modules/                  # Módulos funcionais ES6
│   │   ├── cartilha-modal.js     # Gerenciamento da cartilha digital da PMA
│   │   ├── modal-manager.js      # Orquestrador acessível de modais e foco
│   │   ├── pwa-offline.js        # Gestão de Service Worker e preparo do barco
│   │   ├── sos-emergency.js      # Rotinas de SOS, coordenadas e discagem
│   │   ├── species-checker.js    # Verificador de espécies e medidas legais
│   │   └── utils.js              # Funções de sanitização, formatação e vibração
│   ├── app.js                    # Orquestrador principal do mapa Leaflet
│   ├── db.js                     # Wrapper nativo de IndexedDB (GeoFishDB)
│   ├── firebase-service.js       # Conexão transparente com Firestore
│   └── geoFishImages.js          # Mapeamento de imagens e créditos fotográficos
├── lib/
│   └── leaflet/                  # Biblioteca Leaflet vendorizada localmente
├── index.html                    # Ponto de entrada da aplicação
├── manifest.json                 # Manifesto PWA com atalhos de GPS e espécies
├── package.json                  # Scripts e dependências de desenvolvimento
├── sw.js                         # Service Worker PWA para governança de cache
└── README.md                     # Documentação oficial do projeto
```

---

## 🚀 Como Rodar o Projeto Localmente

### Opção 1: Usando Node.js e Vite (Recomendado)

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/petermar23/geofish-ms.git
   cd geofish-ms
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Acesse no navegador:**
   Abra `http://localhost:3000` (ou o IP local exibido no terminal para testar no celular conectado à mesma rede Wi-Fi).

---

### Opção 2: Usando Python (Sem instalar dependências)

Se preferir não usar Node.js, você pode subir um servidor HTTP estático com Python:

```bash
# Python 3
python -m http.server 3000
```
Em seguida, acesse `http://localhost:3000`.

---

### Opção 3: Extensão Live Server (VS Code / Antigravity)

1. Abra a pasta do projeto no seu editor de código.
2. Clique com o botão direito no arquivo `index.html` e selecione **"Open with Live Server"**.

---

## 📱 Testando o PWA no Celular

1. Certifique-se de que o computador e o smartphone estão conectados à mesma rede Wi-Fi.
2. Ao rodar `npm run dev`, o Vite exibirá o endereço de rede (exemplo: `http://192.168.1.15:3000`).
3. Abra esse endereço no **Google Chrome** (Android) ou **Safari** (iOS).
4. No Chrome Android, toque no menu `⋮` e escolha **"Adicionar à tela inicial"** ou toque no botão **📲 Instalar** no banner do aplicativo.
5. No Safari iOS, toque no botão de compartilhamento `⬆️` e selecione **"Adicionar à Tela de Início"**.

---

## 🏛️ Governança, Inovação Cívica & Gestão Pública

### 🤝 Protocolo Institucional com as Colônias de Pescadores
A inserção dos guias ribeirinhos segue um modelo de governança social auditada em parceria com as entidades tradicionais:
* **Colônia Z-1** (Miranda / Corumbá / Passo do Lontra)
* **Colônia Z-7** (Aquidauana / Anastácio)
* **Colônia Z-11** (Bonito / Águas do Miranda)

> **Auditoria e Combate a Clandestinos:** O cadastro **não é aberto a qualquer usuário anônimo na internet**. A adesão ocorre no balcão da Colônia ou pelo canal assistido via WhatsApp (`+55 16 99266-7526`). A diretoria da Colônia valida o **RGP (Registro Geral da Atividade Pesqueira)** ou a filiação profissional do barqueiro antes da inclusão no arquivo auditável `guias_credenciados.geojson`, garantindo segurança ao turista e protegendo o território de piratas do rio.

---

### 🎣 A Jornada Completa do Turista (Antes, Durante e Depois)
1. **Antes da Viagem (Planejamento Conectado em SP, PR, MG):**
   * Consulta os trechos náuticos, portos e limites legais no WebGIS.
   * Emite a Licença Digital de Pesca Amadora no portal do IMASUL.
   * Agenda a diária de guiamento diretamente com o piloteiro credenciado via WhatsApp, sem taxas ou comissões de intermediários.
2. **Durante a Pescaria no Rio (No Barco — Modo 100% Offline):**
   * Navega com GPS e mapa vetorial em cache no PWA sem precisar de sinal de 4G.
   * Checa imediatamente limites de zonas protegidas (ex.: Rio Salobra — Decreto Estadual nº 15.166/19, apenas Pesque e Solte com motor elétrico/4 tempos).
   * Afere peixes na régua digital oficial de medidas mínimas e máximas de abate.
   * Aciona botão de SOS Fluvial com coordenadas formatadas para resgate em caso de pane.
3. **No Retorno à Rodovia (BR-262 / MS-184 Estrada Parque / MS-345):**
   * O mapa localiza o Posto da Polícia Militar Ambiental (PMA) mais próximo.
   * Apresenta o exemplar nativo inteiro no gelo para medição e colocação do lacre oficial numerado.
   * Recebe a Guia de Controle de Pescado (GCP) gratuita, viajando nas rodovias estaduais em total segurança jurídica.

---

### 📊 Matriz de Indicadores de Impacto na Gestão Pública
* **Indicador 1 (Renda Local Direta & Justiça Social):** Meta de 40 a 60 guias e piloteiros tradicionais cadastrados no 1º ciclo, revertendo 100% do valor da diária para a economia familiar da bacia do Miranda.
* **Indicador 2 (Conformidade Ambiental Preventiva):** Mais de 5.000 consultas cidadãs às regras do Rio Salobra (Dec. 15.166/19) e da Cota Zero do Dourado (Lei 5.321/19 e Lei 6.190/24), reduzindo autuações involuntárias da PMA.
* **Indicador 3 (Eficiência do Gasto Público):** Custo de licenciamento de software para o Estado: **R$ 0,00** (código 100% aberto, hospedagem estática gratuita de alta disponibilidade no GitHub Pages).

---

### 📅 Calendário Automático do Defeso da Piracema
O sistema avalia dinamicamente o período reprodutivo da bacia pantaneira (05 de Novembro até o fim de Fevereiro) via função matemática nativa no cliente (`estaEmDefeso()`). Em período de defeso, um banner de alerta oficial suspende as orientações de abate e instrui sobre o defeso e a pesca de subsistência ribeirinha. Fora do defeso, sinaliza a temporada regular com as cotas vigentes.

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para obter mais detalhes.

---

<div align="center">
  <sub>Desenvolvido com carinho e respeito pelo Pantanal de Mato Grosso do Sul por <strong>Peterson Martins da Costa</strong>.</sub>
</div>
