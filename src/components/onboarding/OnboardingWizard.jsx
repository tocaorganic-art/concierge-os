import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Check, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function OnboardingWizard({ user, onComplete }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const STEPS = [t("onboard_welcome"), t("onboard_first_client"), t("onboard_first_proposal")];
  const [businessName, setBusinessName] = useState(user?.full_name || "");
  const [specialty, setSpecialty] = useState("");
  const [createdClient, setCreatedClient] = useState(null);
  const [clientForm, setClientForm] = useState({ nome: "", email: "", telefone: "", tipo: "familia" });
  const [proposalForm, setProposalForm] = useState({ destino: "", data_chegada: "", data_saida: "", valor: "" });
  const queryClient = useQueryClient();

  const createClient = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setCreatedClient(client);
      setStep(2);
    },
  });

  const createProposal = useMutation({
    mutationFn: (data) => base44.entities.Proposal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      finish();
    },
  });

  const finish = async () => {
    await base44.auth.updateMe({ first_login: false, business_name: businessName, specialty });
    onComplete();
  };

  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "radial-gradient(circle at 50% 50%, hsl(24 87% 56%) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div className="relative w-full max-w-lg">
        {/* Skip all */}
        <button
          onClick={finish}
          className="absolute -top-10 right-0 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {t("onboard_skip_config")} <X className="w-3 h-3" />
        </button>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
          {/* Progress bar */}
          <div className="h-1 bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${step === 0 ? 33 : step === 1 ? 66 : 100}%` }}
            />
          </div>

          {/* Header */}
          <div className="px-8 pt-8 pb-2 flex items-center gap-3">
            <img
              src="https://media.base44.com/images/public/6a1f06cb2529a2c8784acc2c/64f555f0a_Toca_Icon_3D_Luxury_v2.png"
              alt="Toca OS"
              className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
            />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Passo {step + 1} de {STEPS.length}
              </p>
              <h2 className="font-heading text-xl font-bold text-foreground">{STEPS[step]}</h2>
            </div>
          </div>

          {/* Steps indicators */}
          <div className="px-8 pt-4 pb-2 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono transition-all ${
                  i < step ? "bg-primary text-primary-foreground" :
                  i === step ? "border-2 border-primary text-primary" :
                  "border border-border text-muted-foreground"
                }`}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px transition-all ${i < step ? "bg-primary" : "bg-border"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="px-8 pb-8 pt-6">
            {/* STEP 0 */}
            {step === 0 && (
              <div className="space-y-5">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Vamos configurar sua operação em 3 passos rápidos. Você pode pular qualquer etapa.
                </p>
                <div>
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {t("onboard_business_name_q")}
                  </Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={t("onboard_business_name_placeholder")}
                    className="mt-1.5 bg-secondary border-border"
                  />
                </div>
                <div>
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Sua especialidade
                  </Label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="mt-1.5 w-full h-9 rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer appearance-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="luxo">Viagens de luxo</option>
                    <option value="casamentos">Casamentos</option>
                    <option value="corporativo">Eventos corporativos</option>
                    <option value="local">Experiências locais</option>
                    <option value="multiplos">Múltiplos</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    {t("onboard_skip")}
                  </Button>
                  <Button
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                    onClick={() => setStep(1)}
                  >
                    {t("onboard_continue")} <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">{t("onboard_client_desc")}</p>
                <div>
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{t("field_name")} *</Label>
                  <Input value={clientForm.nome} onChange={(e) => setClientForm(f => ({ ...f, nome: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="Nome completo" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                    <Input type="email" value={clientForm.email} onChange={(e) => setClientForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Telefone</Label>
                    <Input value={clientForm.telefone} onChange={(e) => setClientForm(f => ({ ...f, telefone: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Tipo</Label>
                  <select
                    value={clientForm.tipo}
                    onChange={(e) => setClientForm(f => ({ ...f, tipo: e.target.value }))}
                    className="mt-1.5 w-full h-9 rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer appearance-none"
                  >
                    <option value="familia">Família</option>
                    <option value="casal">Casal</option>
                    <option value="grupo">Grupo</option>
                    <option value="vip">VIP</option>
                    <option value="corporativo">Corporativo</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    {t("onboard_skip")}
                  </Button>
                  <Button
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                    disabled={!clientForm.nome || createClient.isPending}
                    onClick={() => createClient.mutate(clientForm)}
                  >
                    {createClient.isPending ? t("btn_save") + "..." : t("onboard_add") + " →"}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  {createdClient ? `${t("onboard_proposal_desc_client")} ${createdClient.nome}.` : t("onboard_proposal_desc")}
                </p>
                <div>
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Cliente</Label>
                  <Input value={createdClient?.nome || "Selecione no formulário completo"} disabled className="mt-1.5 bg-secondary/50 border-border opacity-60" />
                </div>
                <div>
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Destino *</Label>
                  <Input value={proposalForm.destino} onChange={(e) => setProposalForm(f => ({ ...f, destino: e.target.value }))} placeholder="Ex: Maldivas, Paris, Bali..." className="mt-1.5 bg-secondary border-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Chegada</Label>
                    <Input type="date" value={proposalForm.data_chegada} onChange={(e) => setProposalForm(f => ({ ...f, data_chegada: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Saída</Label>
                    <Input type="date" value={proposalForm.data_saida} onChange={(e) => setProposalForm(f => ({ ...f, data_saida: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
                  </div>
                </div>
                <div>
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Valor estimado (R$)</Label>
                  <Input type="number" value={proposalForm.valor} onChange={(e) => setProposalForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" className="mt-1.5 bg-secondary border-border" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={finish}>
                    {t("onboard_skip")}
                  </Button>
                  <Button
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                    disabled={!proposalForm.destino || createProposal.isPending}
                    onClick={() => createProposal.mutate({
                      client_id: createdClient?.id || "",
                      client_nome: createdClient?.nome || "",
                      destino: proposalForm.destino,
                      data_chegada: proposalForm.data_chegada || undefined,
                      data_saida: proposalForm.data_saida || undefined,
                      valor: proposalForm.valor ? Number(proposalForm.valor) : 0,
                      status: "lead",
                    })}
                  >
                    {createProposal.isPending ? t("btn_save") + "..." : `✦ ${t("onboard_create_proposal")}`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}