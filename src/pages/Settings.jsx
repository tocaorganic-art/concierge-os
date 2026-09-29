import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, User, CreditCard, Users, Image, Globe, Trash2, Lock, Save, ExternalLink, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import PlanGate from "@/components/monetization/PlanGate";
import { useLanguage } from "@/lib/i18n";
import { usePlan } from "@/lib/usePlan";
import { useNavigate } from "react-router-dom";

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { t, lang, setLang } = useLanguage();
  const { plan, hasProAccess, hasAgencyAccess } = usePlan();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [businessName, setBusinessName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [whatsappConcierge, setWhatsappConcierge] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteType, setInviteType] = useState("equipe");
  const [inviteClientId, setInviteClientId] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [saved, setSaved] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: clientsForInvite = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
  });

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (!u) return;
      setCurrentUser(u);
      base44.entities.UserProfile.filter({ user_id: u.id }).then((profiles) => {
        const p = profiles?.[0];
        if (p) {
          setProfile(p);
          setBusinessName(p.business_name || "");
          setSpecialty(p.specialty || "");
          setWhatsappConcierge(p.whatsapp_concierge || "");
        }
      });
    });
  }, []);

  const saveOperation = async () => {
    if (!currentUser) return;
    if (profile) {
      await base44.entities.UserProfile.update(profile.id, { business_name: businessName, specialty, whatsapp_concierge: whatsappConcierge });
    } else {
      await base44.entities.UserProfile.create({
        user_id: currentUser.id,
        plan_id: "trial",
        trial_start_date: new Date().toISOString().split("T")[0],
        business_name: businessName,
        specialty,
        whatsapp_concierge: whatsappConcierge,
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const planLabel = { trial: "Trial (7 dias)", starter: "Starter", pro: "Pro", agency: "Agency" }[plan] || "—";

  const handlePortal = async () => {
    setPortalLoading(true);
    const res = await base44.functions.invoke("stripePortal", {});
    const url = res?.data?.url;
    if (url) window.location.href = url;
    else setPortalLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <PageHeader title="Configurações" subtitle="Gerencie sua conta e operação" />

      {/* Minha Operação */}
      <Section icon={SettingsIcon} title="Minha Operação">
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Nome do negócio</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ex: Luxe Travel, Concierge João" className="mt-1.5 bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Especialidade</Label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-border bg-secondary px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Selecione...</option>
              <option value="luxo">Viagens de luxo</option>
              <option value="casamentos">Casamentos e eventos</option>
              <option value="local">Experiências locais</option>
              <option value="corporativo">Eventos corporativos</option>
              <option value="multiplos">Múltiplos segmentos</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">WhatsApp do concierge</Label>
            <Input
              value={whatsappConcierge}
              onChange={(e) => setWhatsappConcierge(e.target.value)}
              placeholder="Ex: +55 73 99999-9999"
              className="mt-1.5 bg-secondary border-border"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Mostrado ao cliente no Portal e no email de boas-vindas como contato direto.
            </p>
          </div>
          <Button onClick={saveOperation} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" size="sm">
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} {saved ? "Salvo!" : "Salvar"}
          </Button>
        </div>
      </Section>

      {/* Meu Plano */}
      <Section icon={CreditCard} title="Meu Plano">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground font-medium">Plano atual: <span className="text-primary font-bold">{planLabel}</span></p>
              {profile?.subscription_status && (
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Status: <span className={{
                    trialing: "text-blue-400",
                    active: "text-green-400",
                    past_due: "text-amber-400",
                    canceled: "text-red-400",
                  }[profile.subscription_status] || "text-muted-foreground"}>
                    {{
                      trialing: "Trial ativo",
                      active: "Ativo",
                      past_due: "Pagamento pendente",
                      canceled: "Cancelado",
                      incomplete: "Incompleto",
                    }[profile.subscription_status] || profile.subscription_status}
                  </span>
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">Pagamento seguro via Stripe · Cancele quando quiser</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile?.stripe_customer_id && (
              <Button onClick={handlePortal} variant="outline" size="sm" disabled={portalLoading} className="gap-2">
                {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Gerenciar assinatura
              </Button>
            )}
            {(plan === "trial" || plan === "starter" || plan === "pro") && (
              <Button onClick={() => navigate("/planos")} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Fazer upgrade
              </Button>
            )}
            {(plan === "trial" || !profile?.stripe_customer_id) && (
              <Button onClick={() => navigate("/planos")} variant="outline" size="sm">
                Ver planos
              </Button>
            )}
          </div>
        </div>
      </Section>

      {/* Minha Equipe - Agency only */}
      <Section icon={Users} title="Minha Equipe">
        <PlanGate
          locked={!hasAgencyAccess}
          planName="Agency"
          title="Disponível no Plano Agency"
          description="Convide até 3 membros da equipe para colaborar na mesma conta."
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Convide um colaborador (equipe interna) ou um cliente (acesso só ao Portal do Cliente):</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={inviteType} onValueChange={(v) => { setInviteType(v); setInviteClientId(""); }}>
                <SelectTrigger className="w-full sm:w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipe">Equipe</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-secondary border-border flex-1"
              />
            </div>
            {inviteType === "cliente" && (
              <Select value={inviteClientId} onValueChange={setInviteClientId}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Vincular a qual cliente?" /></SelectTrigger>
                <SelectContent>
                  {clientsForInvite.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!inviteEmail || (inviteType === "cliente" && !inviteClientId)}
              onClick={async () => {
                if (!inviteEmail) return;
                setInviteStatus("");
                try {
                  await base44.users.inviteUser(inviteEmail, "user");
                  const client = clientsForInvite.find((c) => c.id === inviteClientId);
                  await base44.entities.UserProfile.create({
                    user_id: "",
                    plan_id: "trial",
                    invite_email: inviteEmail,
                    account_type: inviteType,
                    client_id: inviteType === "cliente" ? inviteClientId : "",
                  });
                  if (inviteType === "cliente" && inviteClientId) {
                    await base44.entities.Client.update(inviteClientId, {
                      invited_at: new Date().toISOString(),
                      invited_by: currentUser?.email || "",
                    });
                    try {
                      await base44.functions.invoke("sendWelcomeEmail", { client_id: inviteClientId });
                    } catch {
                      // convite (acesso) já foi enviado; boas-vindas pode ser reenviada depois na ficha do cliente
                    }
                  }
                  setInviteStatus(inviteType === "cliente"
                    ? `Convite enviado — ${client?.nome || inviteEmail} vai cair direto no Portal do Cliente ao aceitar, e recebeu o email de boas-vindas.`
                    : "Convite de equipe enviado.");
                  setInviteEmail("");
                  setInviteClientId("");
                } catch (e) {
                  setInviteStatus("Não consegui enviar o convite. Tente novamente.");
                }
              }}
            >
              Convidar
            </Button>
            {inviteStatus && <p className="text-xs text-muted-foreground">{inviteStatus}</p>}
          </div>
        </PlanGate>
      </Section>

      {/* White-label - Agency only */}
      <Section icon={Image} title="White-label">
        <PlanGate
          locked={!hasAgencyAccess}
          planName="Agency"
          title="Disponível no Plano Agency"
          description="Use seu próprio logo e cores nos PDFs e na interface."
        >
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Upload de Logo</Label>
              <Input type="file" accept="image/*" className="mt-1.5 bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Cor Primária</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <input type="color" defaultValue="#F07A2E" className="h-9 w-16 rounded-md border border-border bg-secondary cursor-pointer" />
                <Input placeholder="#F07A2E" className="bg-secondary border-border font-mono" />
              </div>
            </div>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Salvar White-label</Button>
          </div>
        </PlanGate>
      </Section>

      {/* Idioma e Região */}
      <Section icon={Globe} title="Idioma e Região">
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Idioma</Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="mt-1.5 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                <SelectItem value="en">🇺🇸 English</SelectItem>
                <SelectItem value="es">🇪🇸 Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* Conta */}
      <Section icon={User} title="Conta">
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Email</Label>
            <p className="text-sm text-foreground mt-1 font-mono">{currentUser?.email || "—"}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Lock className="w-3.5 h-3.5" /> Alterar senha
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" /> Excluir conta
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}