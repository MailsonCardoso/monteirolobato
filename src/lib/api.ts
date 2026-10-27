import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://api2.platformx.com.br/api",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const url = config.url ?? "";
  const method = config.method ?? "";
  const isPublic =
    url === "/associado/login" ||
    (url === "/associado" && method === "post");

  // Apenas rotas no singular (/associado ou /associado/...) pertencem ao portal do associado.
  // Rotas no plural (/associados) são da gestão administrativa (exigem edu_token do admin).
  const isAssociadoRoute =
    (url === "/associado" || url.startsWith("/associado/")) ||
    (url.startsWith("/mensalidades/") && url.includes("/gerar-cobranca")) ||
    (url.startsWith("/mensalidades/") && url.includes("/status-pagamento"));

  (config as any)._isAssociado = isAssociadoRoute;

  if (!isPublic) {
    const token = isAssociadoRoute
      ? localStorage.getItem("associado_token")
      : localStorage.getItem("edu_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const pathname = window.location.pathname;
      const isSiteRoute =
        pathname === "/" ||
        ["/transparencia", "/institucional", "/noticias", "/contato", "/ouvidoria"].some(
          (p) => pathname === p || pathname.startsWith(`${p}/`),
        );

      if ((err.config as any)?._isAssociado) {
        localStorage.removeItem("associado_token");
        localStorage.removeItem("associado_data");
        if (pathname.startsWith("/associado") && pathname !== "/associado") {
          window.location.href = "/associado";
        }
        return Promise.reject(err);
      }

      localStorage.removeItem("edu_token");
      if (!isSiteRoute && !pathname.startsWith("/associado")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export default api;
