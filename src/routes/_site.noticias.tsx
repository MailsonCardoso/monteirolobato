import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, ChevronLeft, ChevronRight, X } from "lucide-react";
import { fetchNoticiasPublicas } from "@/lib/api/noticias";
import { fetchCategorias } from "@/lib/api/categorias";
import { imageUrl } from "@/lib/format";

interface NewsItem {
  id?: number;
  title: string;
  summary: string | null;
  content?: string | null;
  category: string;
  image: string | null;
  published_at: string;
}

export const Route = createFileRoute("/_site/noticias")({
  component: Noticias,
});

const fallbackNews = [
  { title: "Nova diretoria toma posse e inicia processo de regularização", summary: "A nova gestão da APA CMCB XLI — Monteiro Lobato iniciou os trabalhos com foco em transparência, reconstrução institucional e regularização documental de todos os processos.", published_at: "10 Jun 2026", category: "Comunicados", image: null },
  { title: "Prestação de contas do primeiro trimestre disponível", summary: "Balancete referente ao período de janeiro a março já está disponível no Portal da Transparência para consulta e download dos associados.", published_at: "05 Jun 2026", category: "Transparência", image: null },
  { title: "Assembleia Geral convocada para o dia 30 de julho", summary: "Edital de convocação foi publicado com antecedência. Pauta inclui eleição da diretoria definitiva e aprovação do novo estatuto.", published_at: "01 Jun 2026", category: "Eventos", image: null },
  { title: "Campanha de regularização de associados", summary: "Associados com pendências podem regularizar sua situação com condições especiais até o fim do mês. Procure a secretaria da APA.", published_at: "28 Mai 2026", category: "Comunicados", image: null },
  { title: "Projeto de apoio pedagógico é aprovado", summary: "Novo projeto de reforço escolar será implementado a partir do segundo semestre, beneficiando alunos com dificuldades de aprendizagem.", published_at: "20 Mai 2026", category: "Projetos", image: null },
  { title: "Homenagem aos professores pelo seu dia", summary: "A APA presta homenagem a todos os professores pelo seu dia, reconhecendo o trabalho essencial na formação dos nossos alunos.", published_at: "15 Mai 2026", category: "Homenagens", image: null },
  { title: "Oficina de música abre inscrições", summary: "Estão abertas as inscrições para a oficina de música da APA. Vagas limitadas para alunos do 6º ao 9º ano.", published_at: "10 Mai 2026", category: "Projetos", image: null },
  { title: "Resultados da pesquisa de satisfação", summary: "Pesquisa realizada com os associados aponta alto grau de satisfação com as novas medidas de transparência adotadas pela gestão.", published_at: "05 Mai 2026", category: "Comunicados", image: null },
  { title: "Festival de talentos da APA", summary: "Inscrições abertas para o festival de talentos. Alunos podem se inscrever nas categorias música, dança, teatro e artes visuais.", published_at: "28 Abr 2026", category: "Eventos", image: null },
  { title: "Parceria com universidade local", summary: "Nova parceria firmada com universidade local para oferecer estágios e projetos de extensão aos alunos do CMCB XLI — Monteiro Lobato.", published_at: "20 Abr 2026", category: "Projetos", image: null },
  { title: "Relatório de auditoria é concluído", summary: "Auditoria independente concluiu os trabalhos. Relatório completo está disponível para consulta dos associados.", published_at: "15 Abr 2026", category: "Transparência", image: null },
  { title: "Doação de livros para biblioteca", summary: "Campanha de doação de livros arrecadou mais de 200 exemplares que serão incorporados ao acervo da biblioteca escolar.", published_at: "10 Abr 2026", category: "Projetos", image: null },
];

const ITEMS_PER_PAGE = 6;

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function Noticias() {
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const { data: apiNews } = useQuery({
    queryKey: ["noticias-publicas"],
    queryFn: fetchNoticiasPublicas,
    staleTime: 60000,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: fetchCategorias,
    staleTime: 60000,
  });

  const categories = useMemo(
    () => ["Todas", ...categorias.map((c) => c.name)],
    [categorias],
  );

  const allNews = apiNews && apiNews.length > 0 ? apiNews : fallbackNews;

  const filtered = allNews.filter((n) => {
    const matchCategory = activeCategory === "Todas" || n.category === activeCategory;
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || (n.summary && n.summary.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <>
      <section className="relative bg-[#D62828] py-12 lg:py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:32px_32px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium mb-6">
            Notícias
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white">Últimas Notícias</h1>
          <p className="mt-3 text-lg text-white/70 max-w-2xl mx-auto">
            Acompanhe as novidades, comunicados e eventos da APA CMCB XLI — Monteiro Lobato.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeCategory === cat ? "bg-[#D62828] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar notícias..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#D62828] transition-colors"
              />
            </div>
          </div>

          {paginated.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="size-12 text-gray-200 mx-auto" />
              <p className="mt-4 text-gray-400">Nenhuma notícia encontrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((item) => (
                <div
                  key={item.title}
                  onClick={() => setSelectedNews(item)}
                  className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="w-full aspect-[21/9] bg-gradient-to-br from-[#D62828]/5 to-gray-100 flex items-center justify-center overflow-hidden">
                    {item.image ? (
                      <img src={imageUrl(item.image)} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <FileText className="size-10 text-[#D62828]/20" />
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#D62828] bg-[#D62828]/5 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    <span className="text-sm text-gray-400">{item.published_at}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base leading-snug mb-2 line-clamp-2 group-hover:text-[#D62828] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{item.summary ?? item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="size-9 rounded-lg border border-gray-200 grid place-items-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`size-9 rounded-lg text-sm font-medium transition-colors ${
                    p === page ? "bg-[#D62828] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="size-9 rounded-lg border border-gray-200 grid place-items-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      <Dialog open={!!selectedNews} onOpenChange={(open) => { if (!open) setSelectedNews(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedNews && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl leading-snug">
                  {selectedNews.title}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#D62828] bg-[#D62828]/5 px-2 py-0.5 rounded">
                    {selectedNews.category}
                  </span>
                  <span className="text-sm text-gray-400">{selectedNews.published_at}</span>
                </div>
              </DialogHeader>

              {selectedNews.image && (
                <img
                  src={imageUrl(selectedNews.image)}
                  alt={selectedNews.title}
                  className="w-full h-64 object-contain rounded-lg mt-4 bg-gray-50"
                />
              )}

              {"content" in selectedNews && selectedNews.content ? (
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {selectedNews.content}
                </div>
              ) : selectedNews.summary ? (
                <div className="text-sm text-gray-700 leading-relaxed">
                  {selectedNews.summary}
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
