import Link from "next/link";

const CARDS = [
  {
    href: "/treino",
    title: "Treino",
    desc: "Uma questão por vez, com filtro de matéria e dificuldade. Responde e já pula pra próxima.",
    tag: "1 por vez",
  },
  {
    href: "/simulado",
    title: "Simulado",
    desc: "Prova completa com cronômetro, na proporção por matéria do novo formato de fase única.",
    tag: "80 questões",
  },
  {
    href: "/discursivas",
    title: "Discursivas",
    desc: "Questões abertas da 2.ª fase, por matéria e por ano, com o enunciado original em imagem.",
    tag: "628 questões",
  },
  {
    href: "/redacao",
    title: "Redação",
    desc: "Provas de Compreensão e Produção de Textos, com contador de linhas igual ao da prova.",
    tag: "CPT",
  },
  {
    href: "/explorar",
    title: "Explorar",
    desc: "Busca livre no banco inteiro, questões do mesmo texto e questões parecidas.",
    tag: "busca",
  },
  {
    href: "/desempenho",
    title: "Desempenho",
    desc: "Acertos por matéria, evolução ao longo do tempo e lista dos seus erros pra revisar.",
    tag: "estatísticas",
  },
];

export default function Home() {
  return (
    <div className="space-y-8 anim-stagger">
      <section className="panel p-6 sm:p-8">
        <p className="label">Vestibular UFPR</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Simulado com questões reais da UFPR
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] muted">
          1.303 questões objetivas com gabarito oficial (2012–2017 e 2022–2026), 628 questões
          discursivas da 2.ª fase e 7 provas de redação — extraídas direto dos cadernos publicados
          pelo Núcleo de Concursos da UFPR.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/treino" className="btn btn-primary">
            Começar a treinar
          </Link>
          <Link href="/simulado" className="btn">
            Fazer um simulado completo
          </Link>
        </div>
      </section>

      <section className="panel p-5">
        <span className="label">O novo formato (a partir de 2026)</span>
        <p className="mt-2 text-sm muted">
          A UFPR passou a aplicar <b style={{ color: "var(--text)" }}>fase única</b>, em 5h30: uma
          prova objetiva de 80 questões com 4 alternativas cada, mais uma prova discursiva de
          Compreensão e Produção de Textos comum a todos os cursos (um texto de até 15 linhas e um de
          até 5). A objetiva é classificatória e eliminatória — só quem passa do corte tem a
          discursiva corrigida, e cada curso dá peso 2 às suas matérias específicas.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          {[
            ["Português", 10],
            ["Literatura", 5],
            ["Língua estrangeira", 7],
            ["Matemática", 8],
            ["Física", 8],
            ["Química", 8],
            ["Biologia", 8],
            ["História", 8],
            ["Geografia", 8],
            ["Filosofia", 5],
            ["Sociologia", 5],
          ].map(([s, n]) => (
            <span key={s as string} className="chip">
              {s} · {n}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs muted">
          O modo <b style={{ color: "var(--text)" }}>Simulado</b> monta a prova nessa proporção. As
          questões do banco são de provas antigas, que tinham 5 alternativas — o conteúdo cobrado é o
          mesmo, só o número de alternativas mudou.
        </p>
      </section>

      <section className="anim-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="panel panel-hover p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">{c.title}</h2>
              <span className="chip">{c.tag}</span>
            </div>
            <p className="mt-2 text-sm muted">{c.desc}</p>
          </Link>
        ))}
      </section>

      <section className="panel p-5 text-xs muted">
        <span className="label">Como este banco foi feito</span>
        <p className="mt-2">
          As questões foram extraídas dos PDFs oficiais do Núcleo de Concursos da UFPR
          (nc.ufpr.br / servicos.nc.ufpr.br). Os cadernos publicados trazem a alternativa correta
          marcada, então todo gabarito aqui é o oficial. Questões que dependem de gráfico, mapa ou
          fórmula aparecem como recorte da página original, para não perder nada na conversão.
        </p>
        <p className="mt-2">
          Duas coisas são estimativas minhas, não dados da UFPR:{" "}
          <b style={{ color: "var(--text)" }}>a dificuldade</b> (a UFPR não publica índice de acerto
          por questão) e, nas provas de 2012–2017 e 2022, <b style={{ color: "var(--text)" }}>a matéria</b>,
          porque aqueles cadernos não traziam divisão por disciplina — essas aparecem marcadas com
          “~”. De 2023 em diante a matéria vem do cabeçalho oficial.
        </p>
      </section>
    </div>
  );
}
