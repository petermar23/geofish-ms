# XXI Prêmio Sul-Mato-Grossense de Inovação na Gestão Pública
## Roteiro e Arquitetura da Proposta: GeoFish MS

**Título:** GeoFish MS: Plataforma WebGIS para Governança Territorial, Turismo Sustentável e Integração de Dados na Bacia do Rio Miranda (MS)  
**Eixo:** Inovação e Sustentabilidade  
**Modalidade:** Ideias Inovadoras  
**Autor:** Peterson Martins da Costa  

---

### Diagrama Arquitetural da Solução

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
      │ • Piloteiro fala por áudio  │         │ • Turista pede indicação em │
      │   ou mensagem simples.      │         │   linguagem natural no mapa.│
      │ • Gemini estrutura a ficha  │         │ • Gemini destaca o guia da  │
      │   para a Colônia Z-1/Z-7.   │         │   Colônia e o trecho legal. │
      │ • Ponto gerado no WebGIS!   │         │ • Contato direto via Whats! │
      └─────────────────────────────┘         └─────────────────────────────┘
```

---

### 1. Vertente A: Inclusão do Trabalhador Ribeirinho (Superando a Barreira Digital)
* **Diagnóstico (Ribeiro, 2018):** Os guias e piloteiros artesanais de Passo do Lontra, Porto Geral, Bonito/Águas do Miranda e Aquidauana enfrentam grave exclusão digital e barreiras de alfabetização tecnológica, ficando invisíveis perante agências de turismo.
* **Inovação Cívica com Gemini:** O pescador grava um simples áudio no WhatsApp (linguagem coloquial pantaneira). A IA Cívica (Gemini) interpreta, extrai entidades e formata automaticamente:
  * Nome operacional e dados pessoais
  * Colônia homologadora (Z-1 Miranda, Z-7 Aquidauana, Z-11 Bonito)
  * Embarcação e motorização (com verificação de conformidade motora)
  * Trechos de rios atendidos
  * Georreferenciamento do porto base em GeoJSON direto no WebGIS.

---

### 2. Vertente B: Conexão Direta com o Turista (Eliminação de Intermediários & Sustentabilidade)
* **Diagnóstico (FUNDTUR/MS, 2019; Catella et al., 2022):** 72% do fluxo de pesca de MS concentra-se na BHRM, movimentando R$ 600 mi/ano, mas o turista de fora frequentemente comete infrações involuntárias e recorre a plataformas predatórias.
* **Inovação:** O turista solicita indicações em linguagem natural (ex: *"Quero pescar dourado com motor elétrico no pesque e solte em águas limpas"*). O sistema destaca o trecho protegido (ex: Rio Salobra, Decreto Estadual 15.166/19), alerta sobre as regras da PMA/IMASUL e conecta diretamente ao piloteiro credenciado da Colônia via WhatsApp sem cobrança de taxas intermediárias.
