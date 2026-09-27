import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, User, FileText, Receipt, MessageSquare, X } from "lucide-react";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

export default function GlobalSearch() {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const { isClientMode, effectiveClientId } = useEffectiveRole();

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [term]);

  const enabled = debounced.length >= MIN_CHARS;
  const needle = debounced.toLowerCase();

  // Admin busca clientes/propostas de todo mundo; cliente busca só nas
  // próprias contas e pedidos (RLS já limita, mas as entidades/rotas de
  // destino também são diferentes — não faz sentido linkar pra /clientes).
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["global-search-clients", enabled ? "on" : "off"],
    queryFn: () => base44.entities.Client.list("-created_date", 100),
    enabled: enabled && !isClientMode,
  });

  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ["global-search-proposals", enabled ? "on" : "off"],
    queryFn: () => base44.entities.Proposal.list("-created_date", 100),
    enabled: enabled && !isClientMode,
  });

  const { data: billings = [], isLoading: loadingBillings } = useQuery({
    queryKey: ["global-search-billings-cliente", enabled ? "on" : "off"],
    queryFn: () => base44.entities.Billing.filter({ client_id: effectiveClientId }, "-created_date", 100),
    enabled: enabled && isClientMode && Boolean(effectiveClientId),
  });

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ["global-search-pedidos-cliente", enabled ? "on" : "off"],
    queryFn: () => base44.entities.ServiceRequest.list("-created_date", 100),
    enabled: enabled && isClientMode,
  });

  const matchedClients = enabled && !isClientMode
    ? clients.filter((c) => (c.nome || "").toLowerCase().includes(needle)).slice(0, 5)
    : [];

  const matchedProposals = enabled && !isClientMode
    ? proposals
        .filter((p) =>
          (p.client_nome || "").toLowerCase().includes(needle) ||
          (p.destino || "").toLowerCase().includes(needle)
        )
        .slice(0, 5)
    : [];

  const matchedBillings = enabled && isClientMode
    ? billings.filter((b) => (b.descricao || "").toLowerCase().includes(needle)).slice(0, 5)
    : [];

  const matchedPedidos = enabled && isClientMode
    ? pedidos.filter((p) => (p.titulo || "").toLowerCase().includes(needle)).slice(0, 5)
    : [];

  const hasResults = isClientMode
    ? matchedBillings.length > 0 || matchedPedidos.length > 0
    : matchedClients.length > 0 || matchedProposals.length > 0;
  const isLoading = enabled && (isClientMode ? (loadingBillings || loadingPedidos) : (loadingClients || loadingProposals));

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const go = (path) => {
    setOpen(false);
    setTerm("");
    navigate(path);
  };

  return (
    <div ref={rootRef} className="relative mb-4 md:mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={isClientMode ? "Buscar em suas contas, pedidos e documentos" : "Buscar clientes ou propostas pelo nome..."}
          className="w-full h-10 md:h-11 rounded-xl bg-card border border-border pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {term && (
          <button
            onClick={() => {
              setTerm("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
            aria-label="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && enabled && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl bg-popover border border-border shadow-lg overflow-hidden z-50">
          {isLoading ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">Buscando...</p>
          ) : !hasResults ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">Nenhum resultado encontrado.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {matchedBillings.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Contas
                  </p>
                  {matchedBillings.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => go("/faturamento")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Receipt className="w-3.5 h-3.5 text-primary" />
                      </span>
                      <span className="block text-sm text-foreground truncate">{b.descricao}</span>
                    </button>
                  ))}
                </div>
              )}
              {matchedPedidos.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground border-t border-border/60 mt-1">
                    Pedidos
                  </p>
                  {matchedPedidos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => go("/solicitacoes")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      </span>
                      <span className="block text-sm text-foreground truncate">{p.titulo}</span>
                    </button>
                  ))}
                </div>
              )}
              {matchedClients.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Clientes
                  </p>
                  {matchedClients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => go("/clientes")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm text-foreground truncate">{c.nome}</span>
                        {c.email && (
                          <span className="block text-[11px] text-muted-foreground truncate">{c.email}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {matchedProposals.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground border-t border-border/60 mt-1">
                    Propostas
                  </p>
                  {matchedProposals.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => go("/propostas")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm text-foreground truncate">{p.client_nome}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">
                          {p.destino}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}