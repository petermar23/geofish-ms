# 🎣 GeoFish MS — WebGIS Estadual da Pesca Esportiva (Mato Grosso do Sul)

> **WebGIS Desktop Comercial, Regulatório e Comunitário** cobrindo **todos os 79 municípios de Mato Grosso do Sul** (Bacia Hidrográfica do Rio Paraguai e Bacia Hidrográfica do Rio Paraná).

---

## 🎯 Visão do Projeto (Desktop-First)

O **GeoFish MS** é uma plataforma cartográfica Full-Screen em arquitetura **Desktop-First** (estilo DataGeo / Portal SIG), projetada para:
1. **Pescadores Esportivos:** Consulta espacial interativa dos rios navegáveis, regras de pesca (IMASUL / Decreto Estadual nº 15.166/2020 / Lei nº 6.160/2023), zonas de restrição (Unidades de Conservação e Terras Indígenas), malha rodoviária (BR/MS) e rede de apoio/emergência (hospitais, delegacias, bombeiros e rampas náuticas).
2. **Anunciantes Comerciais (Pousadas, Hotéis, Ranchos e Lojas Náuticas):** Pins de destaque geolocalizados no mapa, vitrine lateral filtrável por bacia/município e roteamento rodoviário direto no Google Maps (**Custo Zero de API**).
3. **Comunidade Ribeirinha e Piloteiros Locais:** Diretório de guias de pesca, piloteiros e colônias/assentamentos rurais tradicionais, conectando o pescador esportivo diretamente via WhatsApp (100% da renda para o trabalhador local).

---

## 🗺️ Camadas Geoespaciais Oficiais (`public/data/processed/`)

Todos os dados geográficos do repositório provêm **exclusivamente de bases oficiais governamentais e OpenStreetMap** (zero dados fictícios):

| Arquivo GeoJSON | Feições | Fonte Oficial | Descrição |
| :--- | :---: | :--- | :--- |
| `municipios_ms.geojson` | **79** | IBGE | Malha completa dos 79 municípios de MS com população, área e PIB |
| `bacias_ms.geojson` | **15** | IMASUL / PERH-MS | Unidades de Planejamento e Gerenciamento (UPGs Paraguai e Paraná) |
| `bacias_especiais.geojson` | **4** | IMASUL / SEMADESC | Bacias de Rios Cênicos de Proteção Especial |
| `uc_ms.geojson` | **176** | IMASUL / MMA / FUNAI | Unidades de Conservação (Proteção Integral / Uso Sustentável) e Terras Indígenas |
| `hidrografia.geojson` | **105** | ANA / IMASUL | Rede hidrográfica estadual com classificação de regras de pesca |
| `rios_principais.geojson` | **29** | ANA | Calhas principais dos grandes rios navegáveis de MS |
| `rodovias_ms.geojson` | **55** | AGESUL / DNIT | Eixos rodoviários federais (BR) e estaduais (MS) |
| `pontos_emergencia.geojson` | **332** | OpenStreetMap / CNES / Sejusp | Hospitais, Prontos-Socorros, Polícia, Bombeiros, Marinas e Rampas |
| `anunciantes_ms.geojson` | **352** | OpenStreetMap + Parceiros | Hotéis, Pousadas, Ranchos Pesqueiros, Campings e Operações Náuticas |
| `aglomerados_rurais.geojson` | **22** | AGRAER / INCRA | Comunidades ribeirinhas e assentamentos rurais tradicionais |
| `guias_credenciados.geojson` | *Dinâmico* | `cadastros_geofish.csv` | Piloteiros e guias de pesca cadastrados diretamente pela planilha |

---

## 📝 Como Cadastrar Novos Guias, Pousadas, Ranchos e Lojas (Sem Programar)

A inclusão de novos parceiros comerciais ou comunitários é feita em **2 passos simples**:

1. Abra a planilha **[`cadastros_geofish.csv`](cadastros_geofish.csv)** na raiz do projeto (no Excel, LibreOffice ou Bloco de Notas) e adicione uma nova linha:
   - **`tipo_cadastro`**: `GUIA`, `POUSADA`, `RANCHO` ou `LOJA_NAUTICA`
   - **`plano`**: `DESTAQUE_OURO`, `PARCEIRO` ou `COMUNIDADE_GRATUITO`
   - **`nome`**, **`subtitulo`**, **`municipio`**, **`bacia`** (`Paraguai` ou `Paraná`), **`rio_principal`**
   - **`latitude`** e **`longitude`** (copiadas com botão direito no Google Maps, ex: `-20.2425, -56.3831`)
   - **`whatsapp`**, **`telefone`**, **`instagram`**, **`site`**, **`possui_rampa`**, **`diaria_media`** e **`servicos`**
2. Dê **duplo-clique** em **[`ATUALIZAR_GEOFISH.bat`](ATUALIZAR_GEOFISH.bat)**:
   - O script [`ferramentas/sincronizar_cadastros.py`](ferramentas/sincronizar_cadastros.py) valida as coordenadas em MS, gera automaticamente o link de rota do Google Maps (`rota_gmaps`) e atualiza os arquivos GeoJSON do WebGIS.

---

## 📂 Estrutura Minimalista do Repositório

```text
geofish-ms/
├── index.html                           # Interface Desktop Full-Screen (Topbar + Sidebar 380px + Mapa)
├── cadastros_geofish.csv                # Planilha Mestre de entrada de Guias, Pousadas, Ranchos e Lojas
├── ATUALIZAR_GEOFISH.bat                # Atualizador de 1 clique (CSV -> GeoJSON)
├── package.json                         # Configuração enxuta Vite
├── vite.config.js                       # Bundler estático para produção (dist/)
├── css/
│   └── style.css                        # Design System Desktop WebGIS (Dark/Slate + Controles GIS)
├── js/
│   ├── app.js                           # Orquestrador WebGIS (Leaflet, Camadas, Filtros, Busca e Popups)
│   └── modules/
│       ├── cartilha-modal.js            # Modal da Cartilha do Pescador (Cota Zero / Piracema)
│       ├── modal-manager.js             # Gerenciador de modais acessíveis
│       ├── species-checker.js           # Consulta rápida de espécies e medidas (IMASUL)
│       ├── telefones-apoio.js           # Diretório de telefones úteis (PMA, Bombeiros, Marinha)
│       └── utils.js                     # Utilitários, sanitização e regras de período de defeso
├── ferramentas/
│   ├── gerar_bases_estaduais_ms.py      # Pipeline GDAL/OGR que gera as 10 camadas estaduais de MS
│   └── sincronizar_cadastros.py         # Sincronizador da planilha cadastros_geofish.csv para GeoJSON
└── public/
    ├── data/processed/                  # 11 camadas GeoJSON estaduais prontas para consumo
    ├── docs/                            # Cartilha oficial de pesca (PDF)
    └── icons/favicon-32.png             # Ícone da aplicação
```

---

## 🚀 Como Executar no Desktop (Desenvolvimento e Produção)

```bash
# 1. Instalar dependências (apenas na primeira vez)
npm install

# 2. Iniciar servidor Desktop em modo desenvolvimento (http://localhost:5173)
npm run dev

# 3. Gerar pacote estático otimizado para hospedagem (pasta dist/)
npm run build
```

---

## ⚖️ Fontes e Conformidade Legal
- **IMASUL / SEMADESC-MS** — Decreto Estadual nº 15.166/2020 e Lei Estadual nº 6.160/2023 (Regras de Pesca, Cota Zero e Período de Defeso / Piracema).
- **IBGE / ANA / AGESUL / DNIT / FUNAI / INCRA / AGRAER** — Bases cartográficas oficiais do Estado de Mato Grosso do Sul.
- **OpenStreetMap (ODbL)** — Pontos de apoio, saúde, segurança e hotelaria.
