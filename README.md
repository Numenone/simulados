# Simulado UFPR

Simulado interativo com **questões reais** dos vestibulares da UFPR, montado no formato
de **fase única** que passou a valer a partir de 2026.

Tudo é client-side: o banco de questões é um JSON estático e o histórico de respostas
fica no `localStorage` do navegador. Não há backend, banco de dados nem login.

## O que tem dentro

| Conteúdo | Quantidade | Origem |
|---|---|---|
| Questões objetivas com gabarito oficial | **1.303** | cadernos de 2012–2017 e 2022–2026 |
| Questões discursivas da 2.ª fase | **628** | provas específicas de 2014–2017 e 2023–2026 |
| Provas de redação (CPT) | **7** | 2015–2017, 2023–2026 |
| Textos de apoio compartilhados | 87 (325 questões) | extraídos junto das questões |
| Recortes de figura/gráfico | 252 questões | renderizados da página original |

Os PDFs publicados pelo Núcleo de Concursos marcam a alternativa correta com "►",
então **todo gabarito aqui é o oficial da UFPR** — nada foi respondido por chute.

## Modos

- **Treino** — uma questão por vez. Filtra por matéria, dificuldade, ano e idioma;
  ao responder mostra o gabarito e já pula para a próxima (tempo de avanço configurável).
- **Simulado** — prova fechada, sem gabarito durante a execução, com cronômetro
  opcional (5h30 é o tempo oficial). A distribuição por matéria segue o blueprint
  da fase única: Português 10, Literatura 5, Língua Estrangeira 7, Matemática/Física/
  Química/Biologia/História/Geografia 8 cada, Filosofia 5, Sociologia 5.
- **Discursivas** — questões abertas da 2.ª fase com o enunciado original em imagem;
  você escreve a resposta e o rascunho fica salvo.
- **Redação** — caderno CPT completo + editor com contagem de linhas.
- **Explorar** — busca em enunciados, alternativas e textos de apoio.
- **Desempenho** — acertos por matéria e por dificuldade, evolução por dia,
  lista de erros e questões marcadas.

Extras: calculadora científica (aparece em Matemática, Física, Química, Biologia e
Geografia — tecla `K`), atalhos `A`–`E` para responder e `←`/`→` para navegar,
questões do mesmo texto de apoio e questões parecidas.

## Rodando localmente

```bash
npm install
npm run dev     # http://localhost:3000
```

Build de produção:

```bash
npm run build && npm start
```

## Deploy

### Vercel (recomendado)

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # produção
```

Ou conecte o repositório em vercel.com — o preset Next.js é detectado sozinho,
sem variáveis de ambiente.

### Render

Crie um **Web Service** apontando para o repositório:

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: Node

O `render.yaml` já está no repositório, então o Render também aceita via Blueprint.

> O repositório inclui ~38 MB de imagens em `public/` (recortes de figuras e páginas
> de prova). É o que garante que gráficos, mapas e fórmulas apareçam exatamente como
> na prova, mas conte com isso no tamanho do deploy.

## Como o banco foi construído

O pipeline fica em `data/` e é reproduzível:

```
fetch.py             baixa os PDFs do nc.ufpr.br / servicos.nc.ufpr.br
extract_lines.py     extrai texto com coordenadas (PyMuPDF)
parse_coords.py      questões, alternativas, gabarito (►), matéria, idioma
render_figs.py       recorta enunciado e alternativas gráficas (sem revelar a resposta)
parse_discursivas.py questões discursivas da 2.ª fase
parse_redacoes.py    provas de redação (CPT)
build_dataset.py     classificação, textos de apoio, dificuldade, similaridade
audit.py             procura contradições entre conteúdo e matéria
eval_classifier.py   avalia a classificação (leave-one-year-out)
smoke.js             teste ponta a ponta do site em navegador headless
```

Rode `npm run build` depois de regerar o JSON (`data/questions.json` é copiado
para `public/data/`).

### O que é oficial e o que é estimado

Duas coisas **não** vêm da UFPR e estão marcadas como tal na interface:

1. **Dificuldade** — a UFPR não publica índice de acerto por questão. O rótulo
   (Fácil/Média/Difícil) é uma heurística baseada em tamanho do enunciado,
   estrutura de afirmativas, carga numérica e dependência de texto/figura.
   Aparece sempre como "(est.)".

2. **Matéria em parte das provas** — os cadernos de 2023 em diante trazem cabeçalho
   por disciplina, e esses rótulos são usados como estão. Os de 2012–2017 e 2022 não
   traziam, então a matéria é inferida (Naive Bayes treinado nas provas rotuladas +
   nas 628 discursivas, com segmentação em blocos contíguos). Essas aparecem com um
   "~" ao lado do nome. Na validação leave-one-year-out sobre os anos com cabeçalho
   oficial, a segmentação acerta ~97% das questões.

   Literatura é sempre derivada: a UFPR normalmente a imprime dentro de
   "LÍNGUA PORTUGUESA" (só 2024 deu cabeçalho próprio), então o bloco é separado
   automaticamente e marcado como inferido.

As provas antigas tinham 5 alternativas; o novo formato tem 4. O conteúdo cobrado
é o mesmo, e o banco mantém as alternativas originais.

## Licença e conteúdo

O código é seu para usar como quiser. As questões são propriedade da UFPR /
Núcleo de Concursos e estão disponíveis publicamente em
[servicos.nc.ufpr.br](https://servicos.nc.ufpr.br/PortalNC/VestibularesAnteriores);
este projeto apenas as reorganiza para estudo.
