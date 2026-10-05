# 📱 Guia de Empacotamento para Google Play Store & Reconhecimento Visual

Este guia orienta como transformar o **GeoFish MS** em um aplicativo publicado na **Google Play Store** e como funciona a **Identificação de Espécies com Google Lens** de forma 100% gratuita para os pescadores.

---

## 1. 🔍 Reconhecimento Visual de Peixes com Google Lens

O GeoFish MS optou por integrar a busca visual nativa do **Google Lens**, eliminando a necessidade de chaves de API, cobranças ou cadastros em plataformas de desenvolvedores:

### Como funciona no aplicativo:
1. No menu inferior ou no mapa, o pescador abre o **📸 Meu Diário de Troféus** (`#modal-diario`).
2. Tira uma foto ou escolhe uma imagem da captura.
3. No card de identificação visual, tem duas opções:
   - **🔍 Abrir Google Lens:** Abre diretamente a ferramenta oficial do Google no navegador.
   - **📲 Enviar Foto p/ Lens:** Utiliza o compartilhamento nativo do smartphone (`navigator.share`) para enviar a foto ao Google Fotos / Pesquisa de Imagem do Google.
4. **No celular Android:** O pescador também pode abrir a foto na Galeria / Google Fotos e tocar no ícone **Lens** para reconhecer a espécie instantaneamente, sem consumir créditos nem exigir chave.

---

## 2. ⚡ Desenvolvimento Local com Vite

Para rodar o projeto localmente com recarregamento rápido (HMR):

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor local na porta 3000
npm run dev
```

Abra no navegador em `http://localhost:3000`.

---

## 3. 📦 Empacotamento para a Google Play Store

Você pode gerar um aplicativo Android de duas maneiras gratuitas:

### Opção A: Bubblewrap CLI (TWA - Trusted Web Activity) — *Recomendada e Rápida*
A tecnologia TWA permite publicar o PWA diretamente na Google Play Store sem precisar reescrever nenhuma linha de código. O app ganha ícone na gaveta de aplicativos do Android, abre em tela cheia e passa em todas as verificações do Google Play Console.

1. Instale o Bubblewrap:
   ```bash
   npm i -g @bubblewrap/cli
   ```
2. Inicialize apontando para a URL pública do seu GitHub Pages:
   ```bash
   bubblewrap init --manifest https://petermar23.github.io/geofish-ms/manifest.json
   ```
3. Gere o arquivo `.aab` (Android App Bundle) assinado:
   ```bash
   bubblewrap build
   ```
4. Envie o `.aab` gerado para o Google Play Console.

---

### Opção B: Capacitor (Shell Nativo Android)

Se preferir compilar um projeto Android Studio tradicional com SDK nativo:

1. Instale as dependências do Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```
2. Inicialize o Capacitor:
   ```bash
   npx cap init "GeoFish MS" "org.pantanal.geofishms" --web-dir "."
   ```
3. Adicione a plataforma Android:
   ```bash
   npx cap add android
   ```
4. Abra no Android Studio para gerar o APK/AAB:
   ```bash
   npx cap open android
   ```

---

## 4. 🤝 Central de Parcerias e Modelo Comunitário

O portal conta com um modelo duplo e equilibrado:
- **🏨 Pousadas, Ranchos e Marinas:** Anúncio comercial para sustentabilidade e manutenção do projeto, gerando propostas diretas sem comissões abusivas.
- **🚤 Piloteiros e Guias Locais (Colônias Z-1, Z-7 e Z-11):** 100% gratuito e livre de qualquer cobrança, cumprindo o papel social e cívico da iniciativa de Peterson Martins da Costa no Pantanal.
