import React, { useState } from "react";
import { Copy, Check, Bot, ShieldCheck, RefreshCw } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

const getServerUrl = () => new URL("/api/mcp", window.location.origin).toString();

function CopiarUrl({ url }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback sem permissão de clipboard
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-lg bg-card border border-border">
      <code className="flex-1 text-sm font-mono text-primary break-all px-2 select-all">{url}</code>
      <button
        onClick={copiar}
        className="flex items-center justify-center gap-2 px-4 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
      >
        {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copiado ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

function Passo({ numero, children }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-mono font-bold flex items-center justify-center">
        {numero}
      </span>
      <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
    </li>
  );
}

const CLIENTES = [
  {
    id: "claude",
    nome: "Claude",
    passos: (url) => (
      <>
        <Passo numero="1">Abra o menu de perfil → <strong>Settings</strong> → <strong>Connectors</strong> → <strong>Add custom connector</strong>.</Passo>
        <Passo numero="2">Dê um nome (ex.: "Toca OS") e cole a URL abaixo.</Passo>
        <Passo numero="3">Clique em <strong>Add</strong>.</Passo>
      </>
    ),
  },
  {
    id: "chatgpt",
    nome: "ChatGPT",
    passos: (url) => (
      <>
        <Passo numero="1">Em <strong>Apps</strong>, ative o <strong>Developer mode</strong>. O ChatGPT avisa que conexões externas podem executar ações nos seus dados — por isso, conecte apenas clientes em quem você confia.</Passo>
        <Passo numero="2">Clique em <strong>Create app</strong>, dê um nome e cole a URL abaixo.</Passo>
        <Passo numero="3">Clique em <strong>Create</strong> e ative o app pelo compositor de mensagens antes de usar.</Passo>
      </>
    ),
  },
  {
    id: "cursor",
    nome: "Cursor",
    passos: (url) => (
      <>
        <Passo numero="1">Abra <strong>Settings</strong> → <strong>Tools &amp; Integrations</strong> → <strong>New MCP Server</strong>.</Passo>
        <Passo numero="2">Isso abre o arquivo <code className="font-mono text-xs bg-muted px-1 rounded">mcp.json</code> — adicione uma entrada com <code className="font-mono text-xs bg-muted px-1 rounded">{"\"url\": \""}</code> + a URL abaixo e salve.</Passo>
        <Passo numero="3">Ative o servidor na lista.</Passo>
      </>
    ),
  },
  {
    id: "custom",
    nome: "Outro cliente",
    passos: (url) => (
      <>
        <Passo numero="1">Copie a URL abaixo.</Passo>
        <Passo numero="2">Adicione-a como servidor MCP do tipo <strong>streamable HTTP</strong> no seu cliente — nome e URL bastam na maioria deles.</Passo>
        <Passo numero="3">Recarregue o cliente para ele carregar a lista de ferramentas.</Passo>
      </>
    ),
  },
];

export default function Connect() {
  const url = getServerUrl();
  const [aba, setAba] = useState("claude");
  const cliente = CLIENTES.find((c) => c.id === aba);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl">
      <PageHeader
        title="Conectar um agente de IA"
        subtitle="Conecte o Claude, ChatGPT, Cursor ou outro cliente de IA aos dados e ações deste app via MCP."
      />

      <section className="rounded-xl bg-card border border-border p-5 space-y-3 gold-glow">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-foreground">1. URL do servidor</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Cole esta URL no seu cliente de IA. Ela expõe as ferramentas deste app (consultas e ações) pelo protocolo MCP.
        </p>
        <CopiarUrl url={url} />
      </section>

      <section className="rounded-xl bg-card border border-border p-5 space-y-4">
        <h2 className="font-heading font-bold text-foreground">2. Como conectar cada cliente</h2>
        <div className="flex flex-wrap gap-2">
          {CLIENTES.map((c) => (
            <button
              key={c.id}
              onClick={() => setAba(c.id)}
              className={`px-4 h-9 rounded-md text-sm font-medium transition-colors border ${
                aba === c.id
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:bg-accent"
              }`}
            >
              {c.nome}
            </button>
          ))}
        </div>
        <ol className="space-y-3">
          {cliente.passos(url)}
        </ol>
      </section>

      <section className="rounded-xl bg-card border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-foreground">3. Autorização</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Como o acesso exige login, cada cliente faz um último passo: ele abre a página de consentimento deste app, onde você
          entra com sua própria conta e aprova o acesso. O assistente passa a agir <strong>como você</strong>, apenas com as
          permissões da sua conta — nunca com acesso de outra pessoa.
        </p>
        <div className="flex gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <RefreshCw className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/90 leading-relaxed">
            <strong>Após atualizarmos o app:</strong> recarregue a conexão no seu cliente de IA — eles guardam a lista de
            ferramentas em cache, e novas ferramentas só aparecem depois de atualizar (o cliente pedirá autorização de novo).
          </p>
        </div>
      </section>
    </div>
  );
}