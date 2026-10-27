import { Bell, LogOut, Menu, MessageCircle, Moon, Shield, Wallet, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "ouvidoria" | "pagamento";
  message: string;
  link: string;
  created_at: string;
}

interface NotificationsResponse {
  total: number;
  data: Notification[];
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggle } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isPending } = useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await api.get<NotificationsResponse>("/notifications");
      return data;
    },
    refetchInterval: 30_000,
  });

  const total = data?.total ?? 0;

  return (
    <header className="h-16 bg-card border-b border-border flex items-center px-4 md:px-6 gap-3 sticky top-0 z-20">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-md hover:bg-accent"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden md:flex items-center gap-3">
        <div className="size-9 rounded-xl bg-brand/10 grid place-items-center">
          <Shield className="size-5 text-brand" />
        </div>
        <div className="leading-tight">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Associação de Pais e Amigos
          </span>
          <br />
          <span className="text-sm font-bold text-foreground">
            CMCB XII — Paraná
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={toggle}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="p-2 rounded-md hover:bg-accent relative" aria-label="Notificações">
              <Bell className="size-[18px]" />
              {total > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground grid place-items-center">
                  {total > 9 ? "9+" : total}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="p-3 border-b border-border">
              <h4 className="text-sm font-semibold">Notificações</h4>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {isPending ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Carregando...
                </div>
              ) : total === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Nenhuma notificação
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data?.data.map((n) => (
                    <Link
                      key={n.id}
                      to={n.link}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={cn(
                          "size-8 rounded-full grid place-items-center shrink-0 mt-0.5",
                          n.type === "ouvidoria"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700",
                        )}
                      >
                        {n.type === "ouvidoria" ? (
                          <MessageCircle className="size-4" />
                        ) : (
                          <Wallet className="size-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatRelativeTime(n.created_at)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {total > 0 && (
              <div className="p-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={async () => {
                    await api.put("/notifications/read");
                    queryClient.invalidateQueries({ queryKey: ["notifications"] });
                  }}
                >
                  Marcar todas como lidas
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-3 pl-3 ml-2 border-l border-border">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
          <div className="size-9 rounded-full bg-gradient-to-br from-primary to-info grid place-items-center text-primary-foreground font-semibold text-sm">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <button
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
            className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="size-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}

function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  return new Date(date).toLocaleDateString("pt-BR");
}
