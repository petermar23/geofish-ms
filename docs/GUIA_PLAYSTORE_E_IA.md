# 📱 Guia de Empacotamento para Google Play Store & IA Gemini

Este guia orienta como transformar o **GeoFish MS** em um aplicativo publicado na **Google Play Store** e como utilizar a **Inteligência Artificial Nativa com Gemini** para identificação morfológica de peixes no barco.

---

## 1. 🤖 Ictiólogo Virtual com IA Gemini (Visão Multimodal)

### Como funciona no aplicativo:
1. No menu inferior ou no mapa, o pescador abre o **📸 Meu Diário de Troféus** (`#modal-diario`).
2. Tira uma foto ou escolhe uma imagem da captura.
3. Clica no botão **✨ Identificar Peixe com IA (Gemini)**.
4. O app otimiza e redimensiona a imagem no canvas local (máximo 1024px) para economizar o pacote de dados móveis do pescador.
5. Consulta o modelo `gemini-2.5-flash` do Google com conhecimento ictiológico da Bacia do Rio Miranda (Pantanal de Mato Grosso do Sul).
6. O retorno traz:
   - Nome comum e nome científico da espécie (ex: *Pintado / Pseudoplatystoma corruscans*);
   - Grau de confiança da identificação morfológica;
   - Características anatômicas visuais observadas (pintas, barbilhões, nadadeiras);
   - Nota biológica/ecológica de manuseio seguro e preservação da espécie;
   - Alerta educativo de que a IA não substitui a régua oficial de medição nem a fiscalização ambiental (SEMADESC / IMASUL / PMA).

### Configuração da Chave da API:
- Na engrenagem ⚙️ ao lado do botão de IA, o usuário pode inserir sua chave gratuita do [Google AI Studio](https://aistudio.google.com/app/apikey).
- A chave é salva apenas no armazenamento local (`localStorage`) do dispositivo, enviada em cabeçalho seguro (`x-goog-api-key`) e com custo R$ 0,00.

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
