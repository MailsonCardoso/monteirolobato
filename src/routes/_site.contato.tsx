import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, MapPin, Phone, Mail, MessageCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_site/contato")({
  component: Contato,
});

function Contato() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast.success("Mensagem enviada com sucesso!");
  };

  return (
    <>
      <section className="relative bg-[#D62828] py-12 lg:py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:32px_32px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium mb-6">
            Contato
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white">Fale Conosco</h1>
          <p className="mt-3 text-lg text-white/70 max-w-2xl mx-auto">
            Estamos à disposição para esclarecer dúvidas, receber sugestões e fortalecer nossa comunidade.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-[#D62828] mb-6">Envie sua mensagem</h2>

                {sent ? (
                  <div className="text-center py-12">
                    <div className="size-14 rounded-full bg-emerald-50 mx-auto grid place-items-center">
                      <Send className="size-6 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mt-4">Mensagem enviada!</h3>
                    <p className="text-sm text-gray-500 mt-1">Responderemos em breve.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Nome</label>
                        <input type="text" className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#D62828] transition-colors" required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">E-mail</label>
                        <input type="email" className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#D62828] transition-colors" required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Assunto</label>
                      <input type="text" className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#D62828] transition-colors" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Mensagem</label>
                      <textarea rows={5} className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#D62828] transition-colors resize-none" required />
                    </div>
                    <button type="submit" className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-white text-[#D62828] border border-[#D62828] font-medium text-sm hover:bg-[#D62828]/5 transition-colors">
                      <Send className="size-4" /> Enviar Mensagem
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <MapPin className="size-5 text-[#D62828] mb-2" />
                <h3 className="text-base font-semibold text-gray-900">Endereço</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Colégio Militar 2 de Julho – Unidade XLI — Monteiro Lobato<br />
                  Rua Exemplo, 123 – Bairro<br />
                  Salvador – BA, CEP 40000-000
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <Phone className="size-5 text-[#D62828] mb-2" />
                <h3 className="text-base font-semibold text-gray-900">Telefone</h3>
                <p className="text-sm text-gray-500 mt-1">(71) 99999-9999</p>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <Mail className="size-5 text-[#D62828] mb-2" />
                <h3 className="text-base font-semibold text-gray-900">E-mail</h3>
                <p className="text-sm text-gray-500 mt-1">contato@apacmcbxii.org.br</p>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <Clock className="size-5 text-[#D62828] mb-2" />
                <h3 className="text-base font-semibold text-gray-900">Horário de Atendimento</h3>
                <p className="text-sm text-gray-500 mt-1">Segunda a Sexta: 8h às 17h</p>
              </div>
              <a
                href="#"
                className="flex items-center gap-3 p-5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors group"
              >
                <MessageCircle className="size-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 group-hover:underline">Fale pelo WhatsApp</p>
                  <p className="text-xs text-emerald-600">Respondemos em horário comercial</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
