import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Target, Eye, Heart, GraduationCap, Shield, Handshake, Users, BookOpen, Palette, Trophy, Leaf, User, Loader2 } from "lucide-react";
import { fetchDocumentos } from "@/lib/api/documentos";

export const Route = createFileRoute("/_site/institucional")({
  component: Institucional,
});

const valores = [
  { icon: Eye, title: "Transparência", desc: "Contas claras, documentos abertos e comunicação constante com a comunidade." },
  { icon: Heart, title: "Gestão Democrática", desc: "Respeito ao Estatuto Social e à vontade dos associados." },
  { icon: GraduationCap, title: "Compromisso com a Educação", desc: "Foco total no bem-estar e no aprendizado dos alunos." },
  { icon: Shield, title: "Ética e Integridade", desc: "Zero tolerância com desvios de finalidade ou recursos." },
  { icon: Handshake, title: "União", desc: "Acreditar que juntos somos mais fortes." },
  { icon: Palette, title: "Cultura Maranhense", desc: "Valorização das tradições e da identidade local." },
];

const atividades = [
  { icon: BookOpen, title: "Apoio Educacional", desc: "Recursos e programas que complementam a formação acadêmica dos alunos." },
  { icon: Heart, title: "Projetos Sociais", desc: "Iniciativas que promovem inclusão, cidadania e bem-estar social." },
  { icon: Palette, title: "Cultura", desc: "Atividades culturais que enriquecem o repertório dos estudantes." },
  { icon: Trophy, title: "Esporte", desc: "Incentivo à prática esportiva e desenvolvimento físico e social." },
  { icon: Users, title: "Assistência", desc: "Apoio às famílias e alunos em situação de vulnerabilidade." },
  { icon: Leaf, title: "Sustentabilidade", desc: "Práticas sustentáveis e conscientização ambiental na escola." },
];

const management = [
  { name: "Lígia Costa Cardoso", role: "Presidente", desc: "Responsável pela coordenação geral e representação institucional da APA." },
  { name: "Camila Pinheiro", role: "Vice-Presidente", desc: "Auxilia na coordenação e substitui o presidente em suas ausências." },
  { name: "Priscila Stefany Dias Santos", role: "1ª Secretária", desc: "Responsável pelas atas, documentação e comunicação oficial." },
  { name: "Eliane de Jesus Gomes Pereira", role: "1ª Tesoureira", desc: "Responsável pela gestão financeira, contas e prestação de contas." },
];

function Institucional() {
  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["documentos", "estatuto"],
    queryFn: () => fetchDocumentos("estatuto"),
    staleTime: 60000,
  });

  const estatuto = documentos[0] ?? null;

  return (
    <>
      <section className="relative bg-[#D62828] py-12 lg:py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:32px_32px]" />
        <div className="relative container-page text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium mb-6">
            Institucional
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white">Quem Somos</h1>
          <p className="mt-3 text-lg text-white/70 max-w-2xl mx-auto">
            Entidade civil sem fins lucrativos, fundada em 17 de novembro de 2022, dedicada ao apoio educacional, cultural e social dos alunos do Colégio Militar 2 de Julho: Unidade XLI — Monteiro Lobato.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container-page">
          <div className="max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-[#D62828]">Nossa História</h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              A <strong>Associação de Pais e Amigos do CMCB XLI — Monteiro Lobato (APA)</strong> é uma entidade civil de direito privado, sem fins lucrativos, 
              fundada em <strong>17 de novembro de 2022</strong>, registrada sob o CNPJ nº 50.264.838/0001-60.
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Nascemos da iniciativa de pais, mães e responsáveis de alunos do Colégio Militar 2 de Julho – Unidade XLI — Monteiro Lobato, unidos pelo desejo comum de contribuir ativamente para a qualidade da educação oferecida aos nossos filhos e para o fortalecimento da comunidade escolar.
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Somos o elo de união entre as famílias e a escola. Nosso propósito é simples, mas poderoso: trabalhar em benefício dos alunos, apoiando os associados e a comunidade escolar, garantindo que cada recurso seja revertido em melhorias reais para a educação e o bem-estar dos nossos alunos.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16 bg-gray-50">
        <div className="container-page">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl lg:text-3xl font-bold text-[#D62828] mb-8">Um Novo Capítulo</h2>
              <div className="bg-white rounded-xl border border-emerald-100 p-6 sm:p-8">
                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    { label: "Reconstrução Institucional", desc: "Reestruturação completa dos processos administrativos e financeiros." },
                    { label: "Transparência Total", desc: "Todas as contas e decisões disponíveis para consulta dos associados." },
                    { label: "Auditoria Independente", desc: "Contratação de auditoria externa para garantir a integridade das contas." },
                    { label: "Regularização Documental", desc: "Recuperação e organização de toda a documentação institucional." },
                    { label: "Democracia e Participação", desc: "Assembleias abertas e canais diretos de comunicação com os associados." },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="size-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-base font-semibold text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <Target className="size-6 text-[#D62828] mb-3" />
                <h3 className="text-base font-semibold text-gray-900">Missão</h3>
                <p className="text-base text-gray-600 mt-2 leading-relaxed">
                  Promover o desenvolvimento social, educacional e cultural, oferecendo suporte assistencial aos alunos do Colégio Militar 2 de Julho – Unidade XLI — Monteiro Lobato e suas famílias, atuando sempre em conformidade com a lei, com a ética e com os princípios da transparência e da governança.
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <Eye className="size-6 text-[#D62828] mb-3" />
                <h3 className="text-base font-semibold text-gray-900">Visão</h3>
                <p className="text-base text-gray-600 mt-2 leading-relaxed">
                  Ser reconhecida como uma associação modelo de transparência e eficiência, onde a confiança dos pais é o nosso maior patrimônio e a educação dos nossos filhos é o nosso foco central.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-[#D62828]">Nossos Valores</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {valores.map((v) => (
              <div key={v.title} className="text-center p-6 rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                <div className="size-11 rounded-full bg-[#D62828]/5 mx-auto grid place-items-center">
                  <v.icon className="size-5 text-[#D62828]" />
                </div>
                <h3 className="mt-3 text-base font-semibold text-gray-900">{v.title}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16 bg-gray-50">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-[#D62828]">O que fazemos</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {atividades.map((a) => (
              <div key={a.title} className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
                <div className="size-10 rounded-lg bg-[#D62828]/5 grid place-items-center">
                  <a.icon className="size-5 text-[#D62828]" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{a.title}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-[#D62828]">Diretoria Provisória</h2>
            <p className="text-gray-500 mt-1">Mandato de 90 dias para regularização e eleições diretas</p>
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
          <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <p className="text-sm text-amber-800">
              Mandato provisório de 90 dias para regularização e realização de eleições diretas.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16 bg-gray-50">
        <div className="container-page">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-[#D62828]">Conselho Fiscal</h2>
          </div>
          <div className="max-w-lg mx-auto space-y-2">
            {["Paulo Soares (Titular)", "Denise Magalhães (Titular)", "Valdicélia Rabelo (Suplente)"].map((name) => (
              <div key={name} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-100">
                <div className="size-8 rounded-full bg-gray-50 grid place-items-center">
                  <User className="size-4 text-gray-400" />
                </div>
                <span className="text-base text-gray-700">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container-page">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-[#D62828]">Parceiros</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/2] rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center">
                <span className="text-xs text-gray-300 font-medium">Logo {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16 bg-[#D62828] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FileTextIcon />
          <h2 className="text-2xl lg:text-3xl font-bold mt-6">Estatuto Social</h2>
          <p className="mt-3 text-white/70 max-w-xl mx-auto">
            Faça o download do estatuto social da APA CMCB XLI — Monteiro Lobato para consultar nossas normas e regulamentos.
          </p>
          {isLoading ? (
            <div className="mt-8 flex justify-center">
              <Loader2 className="size-6 animate-spin text-white/70" />
            </div>
          ) : estatuto ? (
            <a
              href={estatuto.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-lg bg-white text-[#D62828] border border-white/40 font-medium hover:bg-white/90 transition-colors mt-8"
            >
              <Download className="size-4" /> Baixar Estatuto (PDF)
            </a>
          ) : (
            <p className="text-white/50 text-sm mt-8">Estatuto indisponível no momento.</p>
          )}
        </div>
      </section>
    </>
  );
}

function FileTextIcon() {
  return (
    <svg className="size-12 mx-auto text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}
