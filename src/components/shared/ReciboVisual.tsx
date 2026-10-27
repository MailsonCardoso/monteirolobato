import { forwardRef } from "react";
import type { Mensalidade } from "@/lib/mock-data";
import { brl, fmtDateFull, numeroExtenso } from "@/lib/format";

const fonte = "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif";
const brand = "#d62828";
const brandDark = "#a01e1e";
const labelStyle = { color: "#8a8a8e", fontSize: 12, fontWeight: 500 };
const valorStyle = { color: "#242424", fontSize: 13, fontWeight: 600, textAlign: "right" as const };

const formaPagamentoLabel: Record<string, string> = {
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
};

function labelPagamento(m: Mensalidade): string {
  if (m.formaPagamento) return formaPagamentoLabel[m.formaPagamento] ?? m.formaPagamento;
  if (m.origem === "mercadopago") return "Mercado Pago";
  if (m.origem === "pix_manual") return "PIX";
  if (m.origem === "dinheiro") return "Dinheiro";
  return "—";
}

export const ReciboVisual = forwardRef<HTMLDivElement, { mensalidade: Mensalidade }>(
  function ReciboVisual({ mensalidade }, ref) {
    const rotulo = mensalidade.alunoSexo === "feminino" ? "Aluna" : "Aluno";
    const dataPg = mensalidade.dataPagamento ? fmtDateFull(mensalidade.dataPagamento) : "—";
    const cobrado =
      mensalidade.valorCobrado != null ? mensalidade.valorCobrado : mensalidade.valor;
    const temTaxa =
      mensalidade.valorCobrado != null && mensalidade.valorCobrado > mensalidade.valor + 0.004;

    return (
      <div
        ref={ref}
        style={{
          width: 376,
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 18px 48px -16px rgba(0,0,0,0.30)",
          fontFamily: fonte,
          color: "#242424",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${brandDark}, ${brand})`,
            color: "#ffffff",
            padding: "20px 20px 18px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            2 de Julho — Unidade XLI — Monteiro Lobato
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 5, letterSpacing: 0.3 }}>
            Recibo de Pagamento
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.45)",
              borderRadius: 999,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            ✓ Pagamento confirmado
          </div>
          <div style={{ fontSize: 9.5, opacity: 0.85, marginTop: 12, lineHeight: 1.5 }}>
            CNPJ nº 50.264.838/0001-60
            <br />
            Rua 55, S/N - Quadra 61, Maiobão, Paço do Lumiar/MA · CEP 65.130-000
          </div>
        </div>

        <div style={{ padding: "18px 20px 20px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#15803d",
              borderRadius: 999,
              padding: "5px 16px",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ✓ PAGO
          </div>

          <div
            style={{
              marginTop: 14,
              border: "1px solid #f0f0f2",
              borderRadius: 14,
              background: "#fafafa",
              padding: "12px 16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
              <span style={labelStyle}>{rotulo}:</span>
              <span style={valorStyle}>{mensalidade.alunoNome || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
              <span style={labelStyle}>Responsável:</span>
              <span style={valorStyle}>{mensalidade.alunoResponsavel || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
              <span style={labelStyle}>Mês de referência:</span>
              <span style={valorStyle}>{mensalidade.mesReferencia}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
              <span style={labelStyle}>Forma de pagamento:</span>
              <span style={{ ...valorStyle, textTransform: "capitalize" }}>
                {labelPagamento(mensalidade)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
              <span style={labelStyle}>Data do pagamento:</span>
              <span style={valorStyle}>{dataPg}</span>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              border: `1px solid #f2c9c9`,
              borderRadius: 14,
              background: "#fdf3f3",
              padding: "12px 16px",
            }}
          >
            <div style={labelStyle}>Valor pago pelo associado</div>
            <div style={{ color: brandDark, fontSize: 26, fontWeight: 800, marginTop: 2, lineHeight: 1.1 }}>
              {brl(cobrado)}
            </div>
            <div style={{ color: "#9a9a9e", fontSize: 10, marginTop: 5, lineHeight: 1.4 }}>
              ({numeroExtenso(cobrado)})
            </div>
          </div>

          {temTaxa ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                marginTop: 10,
                fontSize: 11,
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={labelStyle}>Tarifa do meio de pagamento (Mercado Pago):</span>
                <span style={{ color: "#8a8a8e", fontWeight: 500 }}>
                  - {brl(mensalidade.valorCobrado! - mensalidade.valor)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={labelStyle}>Valor líquido recebido pela associação:</span>
                <span style={{ color: "#8a8a8e", fontWeight: 500 }}>{brl(mensalidade.valor)}</span>
              </div>
            </div>
          ) : null}

          <div style={{ borderTop: "1px dashed #e5e5e9", margin: "16px 0 12px" }} />

          <div style={{ fontSize: 13, fontWeight: 600 }}>Paço do Lumiar, {dataPg}.</div>

          <div style={{ color: "#b0b0b5", fontSize: 9, marginTop: 10, lineHeight: 1.5 }}>
            Comprovante nº {mensalidade.id}
            <br />
            Documento gerado em{" "}
            {new Date().toLocaleDateString("pt-BR")} às{" "}
            {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    );
  },
);