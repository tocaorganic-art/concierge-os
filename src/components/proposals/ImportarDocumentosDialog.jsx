import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FolderOpen, Loader2, AlertTriangle, X } from "lucide-react";

// Classificação automática pelo prefixo da primeira pasta do caminho
// relativo — combina com a convenção de pastas que o Tony já usa localmente
// (01_..05_). Cada destino sabe onde o link do arquivo deve ser gravado.
const PREFIXO_DESTINO = {
  "01_": { label: "Documento do cliente (visível ao Guido)", destino: "documentos_cliente", publico: true },
  "02_": { label: "Contrato de fornecedor (só admin)", destino: "contrato_fornecedor", publico: true },
  "03_": { label: "Comprovante de recebimento (vincula pelo ID da operação)", destino: "recebimento", publico: true },
  "04_": { label: "Hóspedes (só admin)", destino: "documentos_admin", publico: true },
  "05_": { label: "Meio de pagamento da empresa (só admin)", destino: "documentos_admin", publico: true },
};

function detectarDestino(relativePath) {
  const primeiraPastaMatch = relativePath.match(/^([^/\\]+)[/\\]/);
  const primeiraPasta = primeiraPastaMatch ? primeiraPastaMatch[1] : "";
  const prefixo = Object.keys(PREFIXO_DESTINO).find((p) => primeiraPasta.startsWith(p));
  return prefixo ? { prefixo, ...PREFIXO_DESTINO[prefixo] } : null;
}

export default function ImportarDocumentosDialog({ open, onOpenChange, proposal, contratosFornecedor = [], recebimentos = [] }) {
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [confirmouPublico, setConfirmouPublico] = useState(false);
  const queryClient = useQueryClient();

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    const novosItems = files.map((file) => {
      const relativePath = file.webkitRelativePath || file.name;
      const detectado = detectarDestino(relativePath);
      return {
        file,
        relativePath,
        destino: detectado?.destino || "ignorar",
        label: detectado?.label || "Não reconhecido — escolha manualmente",
        publico: detectado?.publico ?? true,
      };
    });
    setItems(novosItems);
    setConfirmouPublico(false);
  };

  const temItemAdminPublico = items.some(
    (it) => it.destino !== "ignorar" && it.destino !== "documentos_cliente" && it.publico
  );

  const mutation = useMutation({
    mutationFn: async () => {
      for (const item of items) {
        if (item.destino === "ignorar") continue;
        const { file_url } = await base44.integrations.Core.UploadFile({ file: item.file });

        if (item.destino === "documentos_cliente") {
          const atual = proposal.documentos_cliente || [];
          await base44.entities.Proposal.update(proposal.id, {
            documentos_cliente: [...atual, { nome: item.file.name, url: file_url, categoria: "contrato" }],
          });
        } else if (item.destino === "documentos_admin") {
          const atual = proposal.documentos_admin || [];
          await base44.entities.Proposal.update(proposal.id, {
            documentos_admin: [...atual, { nome: item.file.name, url: file_url, categoria: "geral" }],
          });
        } else if (item.destino === "contrato_fornecedor") {
          const nomeArquivo = item.file.name.toLowerCase();
          const contrato = contratosFornecedor.find((c) =>
            nomeArquivo.includes((c.fornecedor_nome || "").toLowerCase().split(" ")[0])
          );
          if (contrato) {
            await base44.entities.ContratoFornecedor.update(contrato.id, { documento_url: file_url });
          } else {
            const atual = proposal.documentos_admin || [];
            await base44.entities.Proposal.update(proposal.id, {
              documentos_admin: [...atual, { nome: item.file.name, url: file_url, categoria: "contrato_fornecedor_sem_match" }],
            });
          }
        } else if (item.destino === "recebimento") {
          const opMatch = item.file.name.match(/op(\d+)/i);
          const recebimento = opMatch
            ? recebimentos.find((r) => (r.observacao || "").includes(opMatch[1]))
            : null;
          if (recebimento) {
            await base44.entities.Recebimento.update(recebimento.id, { comprovante_url: file_url });
          } else {
            const atual = proposal.documentos_admin || [];
            await base44.entities.Proposal.update(proposal.id, {
              documentos_admin: [...atual, { nome: item.file.name, url: file_url, categoria: "comprovante_sem_match" }],
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["recebimentos"] });
      setItems([]);
      onOpenChange(false);
    },
    onError: () => setError("Alguns arquivos podem não ter sido enviados. Confira antes de tentar de novo."),
  });

  const handleConfirm = () => {
    if (temItemAdminPublico && !confirmouPublico) {
      setError("Confirme o aviso de link público abaixo antes de enviar.");
      return;
    }
    setError("");
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Importar Documentos do Contrato</DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="py-8 text-center">
            <input
              ref={inputRef}
              type="file"
              webkitdirectory=""
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
            <Button type="button" onClick={() => inputRef.current?.click()} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <FolderOpen className="w-4 h-4" /> Selecionar pasta do contrato
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Selecione a pasta com as subpastas 01_ a 05_ — a classificação por destino é sugerida automaticamente pelo nome da subpasta.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-border rounded-lg divide-y divide-border/60 max-h-80 overflow-y-auto">
              {items.map((item, i) => (
                <div key={i} className="p-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{item.file.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.relativePath}</p>
                  </div>
                  <Select value={item.destino} onValueChange={(v) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, destino: v } : it)))}>
                    <SelectTrigger className="w-56 bg-secondary border-border text-xs flex-shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="documentos_cliente">Documento do cliente</SelectItem>
                      <SelectItem value="contrato_fornecedor">Contrato de fornecedor (só admin)</SelectItem>
                      <SelectItem value="recebimento">Comprovante de recebimento</SelectItem>
                      <SelectItem value="documentos_admin">Documento interno (só admin)</SelectItem>
                      <SelectItem value="ignorar">Não importar</SelectItem>
                    </SelectContent>
                  </Select>
                  <button type="button" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {temItemAdminPublico && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200">
                  <p className="mb-2">
                    Este ambiente não tem upload privado confirmado — os links gerados para os documentos "só admin" são públicos-não-listados
                    (qualquer pessoa com o link exato consegue abrir, mesmo sem estar logada). Não são indexados nem exibidos na tela do cliente.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={confirmouPublico} onChange={(e) => setConfirmouPublico(e.target.checked)} />
                    Entendo e confirmo o envio mesmo assim
                  </label>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setItems([]); onOpenChange(false); }}>Cancelar</Button>
              <Button type="button" onClick={handleConfirm} disabled={mutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Enviar {items.filter((it) => it.destino !== "ignorar").length} arquivo(s)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
