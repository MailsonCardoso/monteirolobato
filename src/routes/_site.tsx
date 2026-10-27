import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Instagram, Facebook, Youtube } from "lucide-react";

export const Route = createFileRoute("/_site")({
  component: SiteLayout,
});

const navLinks = [
  { label: "Institucional", to: "/institucional" },
  { label: "Transparência", to: "/transparencia" },
  { label: "Ouvidoria", to: "/ouvidoria" },
  { label: "Notícias", to: "/noticias" },
  { label: "Contato", to: "/contato" },
];

function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex flex-col bg-white text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="container-page">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/institucional" className="flex items-center gap-3 shrink-0">
              <img src="/logotipo.jpeg" alt="APA CMCB XII" className="size-9 rounded-lg object-cover" />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-[#D62828] leading-tight">APA CMCB XII</p>
                <p className="text-[10px] text-gray-500 leading-tight">Associação de Pais e Amigos</p>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive ? "text-[#D62828] bg-gray-50" : "text-gray-600 hover:text-[#D62828] hover:bg-gray-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <a href="#" className="hidden sm:block text-gray-400 hover:text-[#D62828] transition-colors">
                <Instagram className="size-5" />
              </a>
              <a href="#" className="hidden sm:block text-gray-400 hover:text-[#D62828] transition-colors">
                <Facebook className="size-5" />
              </a>
              <a href="#" className="hidden sm:block text-gray-400 hover:text-[#D62828] transition-colors">
                <Youtube className="size-5" />
              </a>

              <Link
                to="/associado"
                className="hidden md:inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-[#D62828] border border-[#D62828] text-sm font-medium hover:bg-[#D62828]/5 transition-colors"
              >
                Seja Sócio
              </Link>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-[#D62828]"
              >
                {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => {
                const isActive = link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-3 py-2.5 text-sm font-medium rounded-md ${
                      isActive ? "text-[#D62828] bg-gray-50" : "text-gray-600 hover:text-[#D62828] hover:bg-gray-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="pt-3 flex items-center gap-4 px-3">
                <Link
                  to="/associado"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-center py-2.5 px-3 rounded-lg bg-white text-[#D62828] border border-[#D62828] text-sm font-medium"
                >
                  Seja Sócio
                </Link>
              </div>
              <div className="pt-3 flex items-center gap-4 px-3">
                <a href="#" className="text-gray-400 hover:text-[#D62828]"><Instagram className="size-5" /></a>
                <a href="#" className="text-gray-400 hover:text-[#D62828]"><Facebook className="size-5" /></a>
                <a href="#" className="text-gray-400 hover:text-[#D62828]"><Youtube className="size-5" /></a>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pt-16 lg:pt-20">
        <Outlet />
      </main>

      <footer className="bg-[#D62828] text-white">
        <div className="container-page py-10 lg:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logotipo.jpeg" alt="APA CMCB XII" className="size-10 rounded-lg object-cover" />
                <div>
                  <p className="text-sm font-semibold leading-tight">APA CMCB XII</p>
                  <p className="text-[10px] text-white/60 leading-tight">Associação de Pais e Amigos</p>
                </div>
              </div>
              <p className="text-sm text-white/70 leading-relaxed max-w-xs">
                Transparência, participação e compromisso com a educação de qualidade.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <a href="#" className="text-white/60 hover:text-white transition-colors"><Instagram className="size-5" /></a>
                <a href="#" className="text-white/60 hover:text-white transition-colors"><Facebook className="size-5" /></a>
                <a href="#" className="text-white/60 hover:text-white transition-colors"><Youtube className="size-5" /></a>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">Institucional</h4>
              <ul className="space-y-2.5">
                {["Quem Somos", "Diretoria", "Estatuto", "Parceiros"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-white/70 hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">Serviços</h4>
              <ul className="space-y-2.5">
                {["Portal da Transparência", "Ouvidoria", "Seja Sócio", "Contato"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-white/70 hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">Contato</h4>
              <ul className="space-y-2.5 text-sm text-white/70">
                <li>contato@apacmcbxii.org.br</li>
                <li>(71) 99999-9999</li>
                <li className="text-xs">CNPJ: 00.000.000/0001-00</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
            <p>&copy; {new Date().getFullYear()} APA CMCB XII. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white/70 transition-colors">Política de Privacidade</a>
              <a href="#" className="hover:text-white/70 transition-colors">LGPD</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
