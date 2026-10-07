# 🌊 GeoFish MS — Bacia do Rio Miranda (Pantanal MS)

> **Plataforma WebGIS PWA Aberta e Independente para Navegação Náutica e Turismo Sustentável**  
> *"O turista encontra; o profissional local conversa diretamente."*

[![Licença MIT](https://img.shields.io/badge/licença-MIT-green.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-0284c7.svg)](manifest.json)
[![Cartografia](https://img.shields.io/badge/CRS-WGS84%20%2F%20EPSG%3A4326-0b4f6c.svg)](data/processed)
[![Pantanal MS](https://img.shields.io/badge/Regi%C3%A3o-Pantanal%20Sul--Mato--Grossense-15803d.svg)](https://github.com/petermar23/geofish-ms)
[![Iniciativa Independente](https://img.shields.io/badge/Iniciativa-100%25%20Independente-amber.svg)](https://github.com/petermar23/geofish-ms)

---

## 🧭 Sobre o Projeto

O **GeoFish MS** é uma aplicação WebGIS cívica, autônoma e 100% independente, idealizada e desenvolvida por **Peterson Martins da Costa**, com foco no turismo regenerativo, na orientação náutica e no apoio direto aos pescadores e piloteiros tradicionais da **Bacia Hidrográfica do Rio Miranda** (Mato Grosso do Sul).

> **Aviso de Independência:** O GeoFish MS é uma iniciativa 100% autônoma, voluntária e cidadã de código aberto, desenvolvida por Peterson Martins da Costa sem patrocínios ou apoios institucionais. As informações de zoneamento e regras de pesca baseiam-se em legislação pública aberta de livre consulta.

Com mais de **44.740 km²** de área de drenagem e 490 km de curso fluvial principal, a Bacia do Rio Miranda abriga um ecossistema aquático vital no Pantanal. O GeoFish MS atua em duas frentes fundamentais:
1. **Para o Turista e Navegante:** Disponibilizar um mapa fluvial confiável que funcione mesmo sem sinal de celular no rio, com compilação das regras vigentes de pesca amadora, localização de rampas náuticas e diretório de telefones úteis para emergências.
2. **Para os Piloteiros Tradicionais:** Oferecer um canal gratuito de contato direto entre visitantes e condutores ribeirinhos (Miranda, Passo do Lontra, Aquidauana, Anastácio, Bonito e Águas do Miranda), sem taxas, comissões ou intermediários.

---

## ✨ Principais Funcionalidades

### 🗺️ 1. WebGIS Náutico com Dados Abertos
* Mapas base alternáveis entre **Esri World Imagery (Satélite de Alta Resolução)** e **Esri World Topo (Relevo e Topografia)**.
* Projeção cartográfica nativa em **WGS 84 (EPSG:4326)** em coordenadas geográficas decimais.
* Visualização interativa de **8 camadas GeoJSON públicas otimizadas**:
  * 💧 **Rede Hidrográfica & Regras Fluviais (`hidrografia.geojson`):** 561 cursos d'água contínuos com regras categorizadas (Proibida, Pesque e Solte, Permitida com Cota).
  * 🌊 **Rios Principais (`rios_principais.geojson`):** Eixos troncais da bacia (Miranda, Aquidauana, Taquari, Negro e Paraguai).
  * 🚤 **Piloteiros & Guias Ribeirinhos (`guias_credenciados.geojson`):** Diretório de condutores locais para contato direto sem taxas.
  * ⚓ **Rampas Náuticas & Atracadouros (`pontos_emergencia.geojson`):** Pontos de descida de barcos, portos e apoio náutico.
  * ⚠️ **Unidades de Conservação (`uc_ms.geojson`):** Áreas protegidas com zoneamento e restrições legais.
  * 🗺️ **Delimitação da Bacia (`bacia_miranda.geojson`):** Polígono territorial da bacia hidrográfica do Miranda.
  * 🛡️ **Bacias dos Rios Cênicos (`bacias_especiais.geojson`):** Bacias de manejo especial (Salobra, Formoso, Prata, Betione).
  * 🏘️ **Aglomerados Rurais (`aglomerados_rurais.geojson`):** Vilas, comunidades tradicionais e portos ribeirinhos.

### 🚤 2. Conexão Direta com Profissionais Locais
* **Sem Intermediação ou Comissões:** O visitante localiza o profissional no mapa e conversa diretamente por WhatsApp ou chamada telefônica.
* **Sem Ranking Pago:** A exibição no mapa é orientada pela geografia fluvial, sem venda de anúncios ou privilégios comerciais.
* **Cadastro Livre e Comunitário:** Formulário de inclusão para que piloteiros e pousadas locais participem da plataforma sem custos.
* **Acessibilidade Inclusiva:** Suporte para cadastro assistido via envio de mensagem ou áudio para trabalhadores com pouca familiaridade digital.

### ⚡ 3. Modo Barco (100% Offline-First)
* Arquitetura **PWA (Progressive Web App)** instalável em celulares Android e iPhone.
* **Armazenamento no Dispositivo:** Utiliza **Service Worker** e **IndexedDB** para armazenar as 8 camadas GeoJSON e os recursos da aplicação, garantindo consulta em trechos de rio sem sinal de internet.

### 📞 4. Diretório de Telefones Úteis
* Discagem rápida direta para atendimento e socorro:
  * **Corpo de Bombeiros Militar (Resgate):** `193`
  * **SAMU (Atendimento Médico de Urgência):** `192`
  * **Marinha do Brasil (Emergência Náutica):** `185`
  * **Polícia Militar Ambiental — Miranda:** `(67) 3242-4344`
  * **Polícia Militar Ambiental — Aquidauana:** `(67) 3241-2029`
  * **BPMA Plantão Geral:** `(67) 3357-1500`
  * **Hospitais Regionais:** Aquidauana, Miranda e Corumbá.

### ⚖️ 5. Guia Educativo de Pesca Sustentável
* **Informações Didáticas:** Consulta sintetizada das medidas mínimas e máximas de captura permitidas pela legislação ambiental estadual (Decretos nº 15.166/19, 15.375/20 e Lei nº 6.190/24 - Cota Zero do Dourado).
* **Calculadora de Medidas:** Ferramenta interativa que auxilia o pescador a checar se o exemplar está dentro da faixa regulamentar permitida para abate ou se deve ser solto.
* **Alerta do Defeso (Piracema):** Sinalização visual automática entre novembro e fevereiro sobre o período reprodutivo da ictiofauna pantaneira.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Finalidade |
| :--- | :--- |
| **HTML5 & CSS3 Moderno** | Interface semântica, responsiva e acessível, com componentes glassmorphism e design fluído. |
| **Vanilla JavaScript (ES Modules)** | Código modular nativo sem dependências de frameworks pesados, garantindo carregamento rápido e leve. |
| **Leaflet.js (v1.9.4)** | Biblioteca cartográfica de alta performance com panes customizados e renderização vetorial. |
| **Service Worker & Cache API** | Estratégia de cache offline inteligente (`geofish-shell-v56`). |
| **IndexedDB (GeoFishDB)** | Armazenamento de dados espaciais no próprio navegador do usuário. |
| **SIRGAS 2000 / GeoJSON** | Dados geoespaciais abertos estruturados a partir de bases públicas de órgãos ambientais. |
| **Vite** | Ferramenta de build e servidor de desenvolvimento ágil. |

---

## 📁 Estrutura de Diretórios

```
geofish-ms/
├── css/
│   └── style.css                 # Design system WebGIS moderno e responsivo
├── data/
│   └── processed/                # Camadas vetoriais GeoJSON (WGS 84 / EPSG:4326)
│       ├── aglomerados_rurais.geojson
│       ├── bacias_especiais.geojson
│       ├── bacia_miranda.geojson
│       ├── guias_credenciados.geojson
│       ├── hidrografia.geojson
│       ├── pontos_emergencia.geojson
│       ├── rios_principais.geojson
│       └── uc_ms.geojson
├── docs/                         # Guias técnicos para PWA e Play Store
├── LICENSE                       # Licença MIT de código aberto
├── icons/                        # Ícones e favicons para PWA
├── images/                       # Fotografias da Bacia do Miranda e Pantanal
├── js/
│   ├── modules/                  # Módulos funcionais ES6
│   │   ├── cartilha-modal.js     # Guia digital de regras de pesca
│   │   ├── modal-manager.js      # Orquestrador acessível de modais
│   │   ├── pwa-offline.js        # Gestão de cache offline
│   │   ├── species-checker.js    # Verificador de medidas legais de espécies
│   │   ├── telefones-apoio.js    # Diretório de contatos e emergência
│   │   └── utils.js              # Funções de sanitização e formatação
│   ├── app.js                    # Orquestrador principal do mapa Leaflet
│   ├── db.js                     # Wrapper nativo de IndexedDB
│   └── geoFishImages.js          # Mapeamento de imagens e créditos
├── lib/
│   └── leaflet/                  # Biblioteca Leaflet vendorizada localmente
├── index.html                    # Ponto de entrada da aplicação
├── manifest.json                 # Manifesto PWA com atalhos de navegação
├── package.json                  # Scripts de build e dependências de desenvolvimento
├── sw.js                         # Service Worker PWA para cache offline
└── README.md                     # Documentação do projeto
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
   Abra `http://localhost:3000` (ou o endereço IP de rede exibido no terminal para testes no celular).

---

### Opção 2: Usando Python (Sem instalar dependências)

Se preferir rodar sem Node.js:

```bash
python -m http.server 3000
```
Em seguida, abra `http://localhost:3000`.

---

### Opção 3: Extensão Live Server (VS Code / Antigravity)

1. Abra a pasta do projeto no editor.
2. Clique com o botão direito no arquivo `index.html` e selecione **"Open with Live Server"**.

---

## 📱 Instalação PWA no Celular

1. Acesse o endereço da aplicação no **Google Chrome** (Android) ou **Safari** (iOS).
2. No Chrome Android, toque no menu `⋮` e escolha **"Adicionar à tela inicial"** ou utilize o botão de instalação na tela.
3. No Safari iOS, toque no botão de compartilhamento `⬆️` e selecione **"Adicionar à Tela de Início"**.

---

## 🤝 Rede Comunitária e Apoio aos Piloteiros Tradicionais

A inclusão de guias e condutores ribeirinhos na plataforma tem caráter comunitário e voluntário:
* **Foco Territorial:** Bacia do Rio Miranda, Passo do Lontra, Aquidauana, Anastácio, Bonito e Águas do Miranda.
* **Transparência e Gratuidade:** O condutor não paga mensalidade, taxa de intermediação ou comissão por diária contratada. Todo o valor combinado pelo serviço fica integralmente com o trabalhador e sua família.
* **Canal Comunitário:** Novos condutores podem solicitar sua inclusão enviando os dados de contato e área de atuação pelo canal de suporte comunitário.

---

## ⚠️ Isenção de Vínculo e Responsabilidade

* O **GeoFish MS** é uma iniciativa particular, autônoma e independente de **Peterson Martins da Costa**.
* **Iniciativa 100% Autônoma:** Aplicação independente para navegação e orientação cidadã, não substituindo a fiscalização ambiental nem os canais formais das autoridades competentes.
* As regras de pesca amadora e cotas reproduzidas nesta ferramenta refletem a legislação pública estadual para fins informativos e educacionais. O pescador deve sempre verificar a vigência das normas junto aos órgãos competentes antes de sua pescaria.

---

<div align="center">
  <sub>Desenvolvido de forma independente por <strong>Peterson Martins da Costa</strong> para a valorização sustentável do Pantanal de MS.</sub>
</div>
