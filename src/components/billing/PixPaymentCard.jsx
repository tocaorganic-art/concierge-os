import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, QrCode, KeyRound } from "lucide-react";
import { COMPANY_INFO, PIX_PAYMENT_METHODS } from "@/lib/paymentInfo";

function CopyButton({ value, label = "Copiar" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // clipboard indisponível — ignora silenciosamente
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors border border-primary/30 rounded-lg px-2.5 py-1"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copiado!" : label}
    </button>
  );
}

// Duas formas de pagamento para cobranças de "Contas a Pagar": QR Code Pix e
// Chave Pix (CNPJ) para transferência manual — são chaves independentes entre si.
//
// formaPagamento vem de Proposal.forma_pagamento_preferida. Default
// "pix_pj_cora" preserva o comportamento atual (QR/chave da empresa) para
// todo contrato que não especifica nada. Quando o contrato pede Pix pessoal
// (ex.: Adendo com cláusula própria de pagamento em CPF), mostra a chave
// gravada em Proposal.chave_pix_recebimento (editável só pelo admin) — não
// é credencial, já consta no contrato assinado. Sem a chave preenchida
// ainda, mostra um aviso em vez de inventar ou deixar em branco sem
// explicação.
export default function PixPaymentCard({ formaPagamento = "pix_pj_cora", chavePixContrato = "" }) {
  const [tab, setTab] = useState("qrcode");

  if (formaPagamento === "pix_cpf_tony") {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 mb-8">
        <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          <KeyRound className="w-3.5 h-3.5" /> Como pagar
        </div>
        {chavePixContrato ? (
          <div className="flex items-center justify-between bg-secondary/60 border border-border rounded-lg px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Chave Pix</p>
              <p className="text-sm text-foreground font-mono truncate">{chavePixContrato}</p>
            </div>
            <CopyButton value={chavePixContrato} />
          </div>
        ) : (
          <p className="text-sm text-foreground">
            Este contrato recebe por Pix pessoal, conforme combinado. O Tony vai te enviar a chave diretamente.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-8">
      <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
        <KeyRound className="w-3.5 h-3.5" /> Como pagar
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab("qrcode")}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg py-2 border transition-colors ${
            tab === "qrcode"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-secondary border-border text-muted-foreground"
          }`}
        >
          <QrCode className="w-3.5 h-3.5" /> QR Code
        </button>
        <button
          type="button"
          onClick={() => setTab("chave")}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg py-2 border transition-colors ${
            tab === "chave"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-secondary border-border text-muted-foreground"
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" /> Chave Pix
        </button>
      </div>

      {tab === "qrcode" ? (
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-3 rounded-xl">
            <QRCodeSVG value={PIX_PAYMENT_METHODS.qrCode.payload} size={200} level="M" />
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Abra o app do seu banco, escolha "Pagar com Pix" e escaneie o código.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-secondary/60 border border-border rounded-lg px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Chave Pix ({PIX_PAYMENT_METHODS.chavePix.tipo})
              </p>
              <p className="text-sm text-foreground font-mono truncate">
                {PIX_PAYMENT_METHODS.chavePix.valorFormatado}
              </p>
            </div>
            <CopyButton value={PIX_PAYMENT_METHODS.chavePix.valor} />
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Copie a chave e faça a transferência via Pix pelo app do seu banco.
          </p>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center mt-4 pt-3 border-t border-border/60">
        {COMPANY_INFO.nomeEmpresarial}
        <br />
        CNPJ {COMPANY_INFO.cnpjFormatado}
      </p>
    </div>
  );
}
