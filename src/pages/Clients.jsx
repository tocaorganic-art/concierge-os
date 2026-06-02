import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, User } from "lucide-react";
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

export default function Clients() {
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date", 200),
  });

  const filtered = clients.filter((c) => {
    const matchSearch = !search || c.nome?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "all" || c.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} clientes cadastrados`}
        action={
          <Button onClick={() => { setEditClient(null); setShowForm(true); }} className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Novo Cliente
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-32 md:w-40 bg-secondary border-border">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="familia">Família</SelectItem>
            <SelectItem value="casal">Casal</SelectItem>
            <SelectItem value="grupo">Grupo</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="corporativo">Corporativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={User} title="Nenhum cliente encontrado" description="Adicione seu primeiro cliente para começar." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Nome</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Telefone</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="text-right px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} onClick={() => setSelectedClient(client)} className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-primary">{client.nome?.[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-sm text-foreground">{client.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{client.email || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">{client.telefone || "—"}</td>
                    <td className="px-5 py-3.5">{client.tipo ? <StatusBadge status={client.tipo} /> : "—"}</td>
                    <td className="px-5 py-3.5 text-right font-display font-semibold text-sm text-primary">
                      {client.valor_total ? `R$ ${client.valor_total.toLocaleString("pt-BR")}` : "—"}
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
                  {client.valor_total > 0 && (
                    <span className="font-display font-bold text-primary">R$ {client.valor_total.toLocaleString("pt-BR")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAB mobile */}
      <button
        onClick={() => { setEditClient(null); setShowForm(true); }}
        className="fixed bottom-6 right-6 z-30 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        aria-label="Novo Cliente"
      >
        <Plus className="w-6 h-6" />
      </button>

      <ClientFormDialog open={showForm} onOpenChange={setShowForm} client={editClient} />
      <ClientProfileSheet client={selectedClient} onClose={() => setSelectedClient(null)} onEdit={(c) => { setEditClient(c); setShowForm(true); setSelectedClient(null); }} />
    </div>
  );
}