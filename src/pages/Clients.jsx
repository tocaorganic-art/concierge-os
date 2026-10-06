import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import ClientFormDialog from "@/components/clients/ClientFormDialog";
import ClientProfileSheet from "@/components/clients/ClientProfileSheet";
import UpgradeModal from "@/components/monetization/UpgradeModal";
import { formatBRL } from "@/lib/formatBRL";
import { useLanguage } from "@/lib/i18n";
import { usePlan } from "@/lib/usePlan";
import WhatsAppModal from "@/components/whatsapp/WhatsAppModal";
import { CLASSIFICATION_COLORS } from "@/lib/clientColor";

const STARTER_LIMIT = 5;

export default function Clients() {
  const { t } = useLanguage();
  const { plan, isLoading: planLoading } = usePlan();
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [whatsappClient, setWhatsappClient] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date", 200),
  });

  // Abre direto a ficha de um cliente vindo de fora (ex.: "Clientes
  // recentes" do Dashboard, achado de auditoria: antes não tinha nenhum
  // jeito de clicar num cliente lá e cair na ficha certa aqui). Roda só uma
  // vez quando a lista chega; não reabre se o usuário fechar a ficha e o
  // parâmetro continuar na URL.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || clients.length === 0) return;
    const client = clients.find((c) => c.id === openId);
    if (client) setSelectedClient(client);
    setSearchParams((prev) => { prev.delete("open"); return prev; }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  const isStarter = plan === "starter";
  const atLimit = isStarter && clients.length >= STARTER_LIMIT;

  const handleAddClient = () => {
    if (atLimit) {
      setShowUpgrade(true);
      return;
    }
    setEditClient(null);
    setShowForm(true);
  };

  const filtered = clients.filter((c) => {
    const matchSearch = !search || c.nome?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "all" || c.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  return (
    <div>
      <PageHeader
        title={t("nav_clients")}
        subtitle={
          <span>
            {clients.length} {t("clients_registered")}
            {isStarter && (
              <span className={`ml-2 font-mono text-[11px] px-2 py-0.5 rounded-full ${atLimit ? "bg-red-500/15 text-red-400" : "bg-primary/10 text-primary"}`}>
                {clients.length}/{STARTER_LIMIT}
              </span>
            )}
          </span>
        }
        action={
          <Button onClick={handleAddClient} className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> {t("btn_new_client")}
          </Button>
        }
      />

      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("placeholder_search_client")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-32 md:w-40 bg-secondary border-border">
            <SelectValue placeholder={t("field_type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter_all_types")}</SelectItem>
            <SelectItem value="familia">{t("type_family")}</SelectItem>
            <SelectItem value="casal">{t("type_couple")}</SelectItem>
            <SelectItem value="grupo">{t("type_group")}</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="corporativo">{t("type_corporate")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={User} title={t("no_clients")} description={t("add_first_client")} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("field_name")}</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("field_email")}</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("field_phone")}</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("field_type")}</th>
                  <th className="text-right px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("field_total_value")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} onClick={() => setSelectedClient(client)} className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {client.cor_classificacao && (
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CLASSIFICATION_COLORS[client.cor_classificacao] }}
                            title={client.cor_classificacao}
                          />
                        )}
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-primary">{client.nome?.[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-sm text-foreground">{client.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{client.email || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">
                      <div className="flex items-center gap-2">
                        <span>{client.telefone || "—"}</span>
                        {client.telefone && (
                          <button onClick={(e) => { e.stopPropagation(); setWhatsappClient(client); }} className="text-green-400 hover:text-green-300 transition-colors" title="WhatsApp">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">{client.tipo ? <StatusBadge status={client.tipo} /> : "—"}</td>
                    <td className="px-5 py-3.5 text-right font-display font-semibold text-sm text-primary">
                      {client.valor_total ? formatBRL(client.valor_total) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((client) => (
              <div key={client.id} onClick={() => setSelectedClient(client)} className="bg-card border border-border rounded-xl p-4 gold-border-hover cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  {client.cor_classificacao && (
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CLASSIFICATION_COLORS[client.cor_classificacao] }}
                      title={client.cor_classificacao}
                    />
                  )}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">{client.nome?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{client.nome}</p>
                    {client.email && <p className="text-xs text-muted-foreground truncate">{client.email}</p>}
                  </div>
                  {client.tipo && <StatusBadge status={client.tipo} />}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-mono text-xs">{client.telefone || "—"}</span>
                  <div className="flex items-center gap-2">
                    {client.valor_total > 0 && (
                      <span className="font-display font-bold text-primary">{formatBRL(client.valor_total)}</span>
                    )}
                    {client.telefone && (
                      <button onClick={(e) => { e.stopPropagation(); setWhatsappClient(client); }} className="text-green-400 hover:text-green-300 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={handleAddClient}
        className="fixed bottom-6 right-6 z-30 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        aria-label={t("btn_new_client")}
      >
        <Plus className="w-6 h-6" />
      </button>

      <ClientFormDialog open={showForm} onOpenChange={setShowForm} client={editClient} />
      <ClientProfileSheet client={selectedClient} onClose={() => setSelectedClient(null)} onEdit={(c) => { setEditClient(c); setShowForm(true); setSelectedClient(null); }} />

      {whatsappClient && (
        <WhatsAppModal
          open={!!whatsappClient}
          onOpenChange={(v) => { if (!v) setWhatsappClient(null); }}
          client_nome={whatsappClient.nome}
          telefone={whatsappClient.telefone}
          context=""
        />
      )}

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        title="Limite de clientes atingido"
        description={`Você atingiu o limite de ${STARTER_LIMIT} clientes do Plano Starter. Faça upgrade para o Pro e tenha clientes ilimitados.`}
      />
    </div>
  );
}