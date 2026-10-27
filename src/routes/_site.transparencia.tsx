import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, CheckCircle, Clock, AlertTriangle, HelpCircle, User, ChevronDown, Users, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getTransparencia } from "@/lib/api/transparencia";
import { fetchDocumentos } from "@/lib/api/documentos";

export const Route = createFileRoute("/_site/transparencia")({
  component: Transparencia,
});

const statusConfig = {
  concluido: { icon: CheckCircle, label: "Concluído", color: "text-emerald-500", bg: "bg-emerald-50" },
  andamento: { icon: Clock, label: "Em Andamento", color: "text-amber-500", bg: "bg-amber-50" },
  pendente: { icon: AlertTriangle, label: "Pendente", color: "text-red-500", bg: "bg-red-50" },
  aguardando: { icon: HelpCircle, label: "Aguardando", color: "text-gray-400", bg: "bg-gray-50" },
};

const auditSteps = [
  { title: "Levantamento de Passivos", status: "concluido" as keyof typeof statusConfig },
  { title: "Recuperação Documental", status: "concluido" as keyof typeof statusConfig },
  { title: "Inventário Patrimonial", status: "andamento" as keyof typeof statusConfig },
  { title: "Auditoria de Contas", status: "andamento" as keyof typeof statusConfig },
  { title: "Regularização Fiscal", status: "pendente" as keyof typeof statusConfig },
  { title: "Prestação de Contas Final", status: "aguardando" as keyof typeof statusConfig },
];

const faq = [
  { q: "O que a APA faz e qual é o seu papel na comunidade escolar?", a: "A APA (Associação de Pais e Amigos do CMCB XLI — Monteiro Lobato) é uma entidade civil sem fins lucrativos que tem como objetivo apoiar educacional, cultural e socialmente os alunos do Colégio Militar 2 de Julho – Unidade XLI — Monteiro Lobato e suas famílias. Atuamos na captação de recursos, organização de eventos, apoio a atividades pedagógicas e representação dos pais junto à escola e órgãos públicos. Não realizamos obras físicas, mas sim atividades de apoio à educação e à comunidade." },
  { q: "Por que existe uma Diretoria Provisória agora?", a: "A Diretoria Provisória foi eleita democraticamente em Assembleia Geral Extraordinária realizada em 03/06/2026, com mandato de 90 dias (a partir do registro da ata no cartório). Ela foi constituída para regularizar a APA após um período de instabilidade institucional, realizar auditoria completa da gestão anterior, organizar as contas e preparar as eleições definitivas. É composta exclusivamente por pais e mães civis, sem participação de militares da ativa." },
  { q: "Quem são os membros da Diretoria Provisória?", a: "A Diretoria Provisória é composta por: Presidente: Lígia Costa Cardoso, Vice-Presidente: Camila Pinheiro, 1ª Secretária: Priscila Stefany Dias Santos, 1ª Tesoureira: Eliane de Jesus Gomes Pereira. O Conselho Fiscal é composto por: Conselheiro Fiscal Titular: Paulo Roberto Araújo Soares, Conselheira Fiscal Titular: Denise Ribeiro Magalhães, Conselheira Fiscal Suplente: Valdicélia Freitas Rabelo." },
  { q: "Quando teremos eleições definitivas?", a: "Exatamente 90 dias após o registro da ata em cartório. O edital de convocação será publicado aqui no site e no mural da escola com 30 dias de antecedência. Qualquer associado em dia com suas contribuições poderá votar e ser votado, conforme previsto no Estatuto Social." },
  { q: "O que aconteceu com o dinheiro que paguei nos últimos anos?", a: "Infelizmente, a gestão anterior (novembro/2022 a junho/2026) não mantinha escrituração contábil regular. Estamos reconstituindo o histórico financeiro junto aos bancos, à Receita Federal e ao Ministério Público. Assim que o laudo da auditoria for concluído, ele será publicado integralmente aqui no Portal da Transparência, com todos os detalhes de receitas e despesas." },
  { q: "Por que as contas bancárias da APA estão bloqueadas?", a: "As contas foram bloqueadas devido a irregularidades identificadas na gestão anterior, que incluíam falta de prestação de contas, ausência de documentação fiscal e utilização indevida de CNPJ de outra associação (CNPJ de Timon/MA) para arrecadação de recursos. O desbloqueio está sendo tratado junto ao Ministério Público e aos bancos, e deve ocorrer após o registro da Ata da Assembleia de 03/06/2026 no Cartório de Registro de Pessoas Jurídicas." },
  { q: "Como posso acompanhar para onde vai o dinheiro da APA?", a: "Através deste Portal da Transparência, onde publicamos: Balancetes financeiros detalhados, Notas fiscais de todas as despesas, Relatórios de atividades realizadas, Atas de reuniões da Diretoria e do Conselho Fiscal, Prestação de contas ao Ministério Público. Além disso, qualquer associado pode agendar visita à sede para consultar a pasta física de documentos." },
  { q: "A APA está sendo auditada? Por quem?", a: "Sim! Contratamos auditoria externa independente para revisar todas as contas desde a fundação da APA (novembro/2022). A auditoria está analisando extratos bancários, notas fiscais, contratos e toda a documentação financeira. O relatório final será público e disponibilizado aqui no site, além de ser encaminhado ao Ministério Público do Estado do Maranhão." },
  { q: "Existem dívidas da gestão anterior? A APA vai pagar?", a: "Estamos levantando todas as dívidas deixadas pela gestão anterior. Porém, a Diretoria Provisória só reconhecerá e pagará dívidas que: Estejam devidamente documentadas (contrato, nota fiscal, recibo), Tenham sido efetivamente contraídas em nome da APA, Estejam dentro dos limites legais e estatutários. Dívidas sem comprovação ou contraídas de forma irregular serão questionadas judicialmente." },
  { q: "Como faço para me tornar associado da APA?", a: "Basta preencher o formulário na página \"Seja Associado\", apresentar cópia do RG e CPF, comprovante de residência e vínculo com aluno do CMCB XLI — Monteiro Lobato. Após análise e aprovação pela Diretoria (em até 48 horas), você poderá pagar a taxa de adesão (se houver) e a primeira mensalidade. Associados em dia têm direito a votar nas assembleias e participar de todas as atividades." },
  { q: "Qual é o valor da mensalidade e como posso pagar?", a: "O valor da mensalidade é definido em Assembleia Geral e atualmente está em R$ 70,00 por mês. O pagamento pode ser feito via PIX ou dinheiro, presencialmente na sede da APA. Associados em dia têm direito a votar, ser votados e participar de todas as atividades e eventos." },
  { q: "Posso doar para a APA? Como?", a: "Sim! Aceitamos doações de qualquer valor, que podem ser feitas via: PIX, Transferência bancária ou Doação presencial na sede. Todas as doações são registradas, emitimos recibo e prestamos contas publicamente no Portal da Transparência. Doações acima de R$ 1.000,00 são comunicadas ao Ministério Público." },
  { q: "O que acontece se eu ficar inadimplente?", a: "Associados inadimplentes por mais de 90 dias perdem o direito de votar e ser votados nas assembleias, mas continuam podendo participar das atividades abertas ao público. Após 180 dias de inadimplência, o associado pode ser excluído do quadro social, conforme previsto no Estatuto Social. Para regularizar sua situação, basta entrar em contato com a Tesouraria e pagar as mensalidades em atraso." },
  { q: "Que tipo de atividades a APA realiza?", a: "A APA organiza e apoia diversas atividades, como: Festas juninas e eventos culturais, Apoio a atividades pedagógicas e esportivas, Campanhas de arrecadação (rifas, bazares), Projetos sociais para famílias em vulnerabilidade, Reuniões e assembleias abertas aos associados, Parcerias com comércio local para benefícios aos associados. Todas as atividades são divulgadas no site, no grupo de WhatsApp e no mural da escola." },
  { q: "Como posso participar ou voluntariar nas atividades da APA?", a: "Existem várias formas de participar: Integrando comissões de trabalho (eventos, comunicação, finanças), Ajudando na organização de eventos específicos, Participando das assembleias e reuniões abertas, Fazendo sugestões através da Ouvidoria, Divulgando as ações da APA para outros pais." },
  { q: "A APA realiza eventos para arrecadar fundos?", a: "Sim! Organizamos eventos de arrecadação como festas juninas, bazares, rifas e campanhas especiais. Todos os recursos arrecadados são destinados exclusivamente para as atividades institucionais da APA e são totalmente transparentes, com prestação de contas publicada no Portal da Transparência." },
  { q: "Como posso fiscalizar a APA pessoalmente?", a: "Além deste Portal da Transparência, qualquer associado pode: Agendar visita à sede da APA para consultar a pasta física de documentos, Solicitar cópias de documentos específicos, Participar das assembleias e questionar a Diretoria, Utilizar a Ouvidoria para reportar irregularidades, Acompanhar o processo no Ministério Público. A fiscalização é um direito de todo associado e um dever de todos nós." },
  { q: "O que é a Ouvidoria e como funciona?", a: "A Ouvidoria é um canal independente e sigiloso para receber sugestões, elogios, reclamações e denúncias sobre a gestão da APA. Você pode enviar sua manifestação através do formulário no site. Todas as manifestações são analisadas em até 15 dias úteis, e você pode optar pelo anonimato. Denúncias graves são encaminhadas ao Ministério Público, se necessário." },
  { q: "O Ministério Público está acompanhando a APA? Por quê?", a: "Sim! A regularização da APA é acompanhada pelo Ministério Público do Estado do Maranhão, através da Notícia de Fato nº 001060-507/2026, em trâmite na 1ª Promotoria de Justiça de Paço do Lumiar. O acompanhamento começou devido a irregularidades identificadas na gestão anterior e continua até que a APA esteja plenamente regularizada. A Diretoria Provisória envia relatórios periódicos ao MP e todas as petições são públicas." },
  { q: "O que está sendo feito para regularizar a APA?", a: "Estamos trabalhando em várias frentes simultâneas: Registro da Ata da Assembleia no Cartório de Registro de Pessoas Jurídicas, Desbloqueio das contas bancárias, Auditoria contábil completa da gestão anterior, Inventário patrimonial de todos os bens, Migração do banco de dados do sistema, Regularização fiscal junto à Receita Federal e Prefeitura, Levantamento e negociação do passivo (dívidas), Preparação das eleições definitivas, Implementação do Portal da Transparência." }
];

const management = [
  { name: "Lígia Costa Cardoso", role: "Presidente", desc: "Responsável pela coordenação geral e representação institucional da APA." },
  { name: "Camila Pinheiro", role: "Vice-Presidente", desc: "Auxilia na coordenação e substitui o presidente em suas ausências." },
  { name: "Priscila Stefany Dias Santos", role: "1ª Secretária", desc: "Responsável pelas atas, documentação e comunicação oficial." },
  { name: "Eliane de Jesus Gomes Pereira", role: "1ª Tesoureira", desc: "Responsável pela gestão financeira, contas e prestação de contas." },
];

const PER_PAGE = 6;

function Transparencia() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["transparencia"],
    queryFn: getTransparencia,
    refetchInterval: 60_000,
  });

  const { data: apiDocuments = [], isLoading: docsLoading } = useQuery({
    queryKey: ["documentos", "transparencia"],
    queryFn: () => fetchDocumentos("transparencia"),
    staleTime: 60000,
  });

  const documents = apiDocuments;
  const totalPages = Math.ceil(documents.length / PER_PAGE);
  const paged = documents.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [documents.length]);

  function goTo(p: number) {
    if (p >= 1 && p <= totalPages) setPage(p);
  }

  return (
    <>
      <section className="relative bg-[#D62828] py-12 lg:py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:32px_32px]" />
        <div className="relative container-page text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium mb-6">
            Transparência
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white">Portal da Transparência</h1>
          <p className="mt-3 text-lg text-white/70 max-w-2xl mx-auto">
            "Nossas contas estão nas suas mãos."
          </p>
        </div>
      </section>

      <section className="relative -mt-10 z-10 container-page">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-lg bg-blue-50 grid place-items-center text-blue-600">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{data ? String(data.total_associados) : "—"}</p>
                <p className="text-sm text-gray-500">Total de Associados</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-lg bg-purple-50 grid place-items-center text-purple-600">
                <User className="size-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{data ? String(data.alunos.ativos) : "—"}</p>
                <p className="text-sm text-gray-500">Alunos Ativos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container-page">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-[#D62828] mb-6">Auditoria e Regularização</h2>
              <p className="text-base text-gray-500 mb-6">
                Acompanhe o status do processo de auditoria e regularização institucional.
              </p>
              <div className="space-y-3">
                {auditSteps.map((step) => {
                  const cfg = statusConfig[step.status];
                  const Icon = cfg.icon;
                  return (
                    <div key={step.title} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className={`size-8 rounded-full ${cfg.bg} grid place-items-center ${cfg.color}`}>
                        <Icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{step.title}</p>
                      </div>
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#D62828] mb-6">Documentos</h2>
              <p className="text-base text-gray-500 mb-6">
                Documentos institucionais disponíveis para consulta e download.
              </p>
              {docsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  {paged.length === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-400">
                      Nenhum documento publicado ainda.
                    </div>
                  ) : (
                    paged.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="size-5 text-red-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.titulo}</p>
                            <p className="text-xs text-gray-400">{doc.created_at}</p>
                          </div>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 size-8 rounded-lg bg-gray-50 grid place-items-center text-gray-400 hover:text-[#D62828] hover:bg-[#D62828]/5 transition-colors"
                        >
                          <Download className="size-4" />
                        </a>
                      </div>
                    ))
                  )}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 pt-3">
                      <button
                        onClick={() => goTo(page - 1)}
                        disabled={page === 1}
                        className="size-8 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => goTo(p)}
                          className={`size-8 rounded-lg text-sm font-medium transition-colors ${
                            p === page
                              ? "bg-[#D62828] text-white"
                              : "text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => goTo(page + 1)}
                        disabled={page === totalPages}
                        className="size-8 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16 bg-gray-50">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-[#D62828]">Gestão Atual</h2>
            <p className="text-gray-500 mt-1">Diretoria Provisória — Mandato de 90 dias para regularização</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {management.map((person) => (
              <div key={person.name} className="bg-white rounded-xl border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
                <div className="size-16 rounded-full bg-gradient-to-br from-[#D62828]/10 to-gray-100 mx-auto grid place-items-center">
                  <User className="size-7 text-[#D62828]/40" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{person.name}</h3>
                <p className="text-sm font-medium text-[#D62828] uppercase tracking-wider mt-0.5">{person.role}</p>
                <p className="text-sm text-gray-500 mt-2">{person.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <p className="text-sm text-amber-800">
              Mandato provisório de 90 dias para regularização e realização de eleições diretas.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-[#D62828]">Perguntas Frequentes</h2>
          </div>
          <div className="space-y-2">
            {faq.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">{item.q}</span>
                  <ChevronDown className={`size-4 text-gray-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
