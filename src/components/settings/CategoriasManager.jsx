import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Check, X, EyeOff, Eye, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n";
import { CATEGORY_COLORS, categoryDot } from "@/lib/uiTones";
import { TIPO_COBRANCA, TIPO_DESPESA, criarOuReativarCategoria, norm } from "@/lib/categoriasCatalogo";
import { useCategorias } from "@/lib/useCategorias";

function ColorPicker({ value, onChange }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-1.5">
      {CATEGORY_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={t(`cat_manager_color_${c.value}`)}
          aria-label={t(`cat_manager_color_${c.value}`)}
          onClick={() => onChange(c.value)}
          className={`min-h-0 min-w-0 w-6 h-6 rounded-full ${c.dot} border-2 transition-all ${value === c.value ? "border-foreground scale-110" : "border-transparent opacity-60 hover:opacity-100"}`}
        />
      ))}
    </div>
  );
}

// Gerenciar categorias (Fase 5): lista o catálogo BillingCategory com filtro
// por tipo, cria, edita nome/cor e desativa (soft delete). Nunca apaga: uma
// categoria desativada some dos dropdowns de novo lançamento, mas segue
// aparecendo nos registros antigos que a usam. Renomear aqui NÃO reescreve
// registros históricos (eles guardam o nome em texto).
export default function CategoriasManager() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState("all");
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState(TIPO_DESPESA);
  const [novaCor, setNovaCor] = useState("gold");
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");

  // Reaproveita o hook: dispara o seed + migração retroativa (admin, 1x) e lê o catálogo.
  const { catalogo, isLoading } = useCategorias(TIPO_DESPESA);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["billing-categories"] });

  const salvar = useMutation({
    mutationFn: ({ id, ...dados }) => base44.entities.BillingCategory.update(id, dados),
    onSuccess: () => { setEditando(null); setErro(""); invalidar(); },
    onError: () => setErro(t("cat_manager_error")),
  });

  const criar = useMutation({
    mutationFn: () => criarOuReativarCategoria({ nome: novoNome, tipo: novoTipo, cor: novaCor }),
    onSuccess: async () => { setNovoNome(""); setErro(""); await invalidar(); },
    onError: () => setErro(t("cat_manager_error")),
  });

  const lista = catalogo
    .filter((c) => filtro === "all" || c.tipo === filtro)
    .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome, "pt-BR"));

  const nomeDuplicado = (id, nome, tipo) =>
    catalogo.some((c) => c.id !== id && c.tipo === tipo && norm(c.nome) === norm(nome));

  const confirmarEdicao = () => {
    const nome = editando.nome.trim();
    if (!nome) return;
    if (nomeDuplicado(editando.id, nome, editando.tipo)) { setErro(t("cat_manager_duplicate")); return; }
    salvar.mutate({ id: editando.id, nome, cor: editando.cor });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t("cat_manager_help")}</p>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/40 p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && novoNome.trim()) { e.preventDefault(); criar.mutate(); } }}
            placeholder={t("cat_manager_new_placeholder")}
            className="bg-secondary border-border"
          />
          <Select value={novoTipo} onValueChange={setNovoTipo}>
            <SelectTrigger className="sm:w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TIPO_DESPESA}>{t("cat_manager_tipo_despesa")}</SelectItem>
              <SelectItem value={TIPO_COBRANCA}>{t("cat_manager_tipo_cobranca")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <ColorPicker value={novaCor} onChange={setNovaCor} />
          <Button type="button" size="sm" className="gap-1.5" disabled={!novoNome.trim() || criar.isPending} onClick={() => criar.mutate()}>
            <Plus className="w-3.5 h-3.5" /> {t("cat_manager_add")}
          </Button>
        </div>
      </div>

      <Select value={filtro} onValueChange={setFiltro}>
        <SelectTrigger className="w-full sm:w-52 bg-secondary border-border"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("cat_manager_filter_all")}</SelectItem>
          <SelectItem value={TIPO_DESPESA}>{t("cat_manager_tipo_despesa")}</SelectItem>
          <SelectItem value={TIPO_COBRANCA}>{t("cat_manager_tipo_cobranca")}</SelectItem>
        </SelectContent>
      </Select>

      {erro && <p className="text-xs text-danger">{erro}</p>}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">{t("cat_manager_loading")}</p>
      ) : lista.length === 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Tags className="w-3.5 h-3.5" /> {t("cat_manager_empty")}</p>
      ) : (
        <ul className="space-y-1.5">
          {lista.map((c) => {
            const emEdicao = editando?.id === c.id;
            const inativa = c.ativo === false;
            return (
              <li key={c.id} className={`flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 ${inativa ? "opacity-60" : ""}`}>
                {emEdicao ? (
                  <>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Input
                        autoFocus
                        value={editando.nome}
                        onChange={(e) => setEditando((x) => ({ ...x, nome: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmarEdicao(); } }}
                        className="h-8 bg-card border-border"
                      />
                      <ColorPicker value={editando.cor} onChange={(cor) => setEditando((x) => ({ ...x, cor }))} />
                    </div>
                    <button type="button" onClick={confirmarEdicao} title={t("cat_manager_save")} className="min-h-0 min-w-0 p-2 text-success"><Check className="w-4 h-4" /></button>
                    <button type="button" onClick={() => { setEditando(null); setErro(""); }} title={t("cat_manager_cancel")} className="min-h-0 min-w-0 p-2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${categoryDot(c.cor)}`} />
                    <span className="flex-1 min-w-0 text-sm text-foreground truncate">{c.nome}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex-shrink-0">
                      {c.tipo === TIPO_DESPESA ? t("cat_manager_tipo_despesa") : t("cat_manager_tipo_cobranca")}
                    </span>
                    {inativa && <span className="font-mono text-[10px] uppercase tracking-wider text-warning flex-shrink-0">{t("cat_manager_inactive")}</span>}
                    <button type="button" onClick={() => { setEditando({ id: c.id, nome: c.nome, cor: c.cor || "gold", tipo: c.tipo }); setErro(""); }} title={t("cat_manager_edit")} className="min-h-0 min-w-0 p-2 text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => salvar.mutate({ id: c.id, ativo: inativa })}
                      title={inativa ? t("cat_manager_reactivate") : t("cat_manager_deactivate")}
                      className="min-h-0 min-w-0 p-2 text-muted-foreground hover:text-foreground"
                    >
                      {inativa ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
