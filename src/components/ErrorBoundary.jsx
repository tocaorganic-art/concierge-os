import React from "react";

// Rede de segurança de último nível: sem isso, qualquer erro não tratado
// durante a renderização derruba a árvore React inteira e o usuário fica
// preso num spinner infinito (ou tela em branco), sem nenhuma indicação do
// que houve nem forma de se recuperar sem saber recarregar a página.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary capturou um erro:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleBack = () => {
    // Manda pra Visão Geral em vez de history.back(): se o erro aconteceu
    // logo depois de navegar, "voltar" no histórico pode cair na mesma
    // página que quebrou de novo.
    window.location.assign("/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
          <p className="text-foreground font-medium">Algo deu errado ao carregar o Concierge OS.</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Nada foi perdido — só essa tela travou. Tente recarregar ou voltar para a Visão Geral.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors"
            >
              Recarregar
            </button>
            <button
              onClick={this.handleBack}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
            >
              Voltar para o início
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
