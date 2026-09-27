import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Obrigado() {
  const navigate = useNavigate();

  useEffect(() => {
    // Dispara evento de conversão no Meta Pixel
    if (window.fbq) {
      window.fbq("track", "Purchase");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Ícone de sucesso */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-mono px-3 py-1 rounded-full mb-5">
          <Sparkles className="w-3 h-3" /> Toca Concierge OS
        </div>

        {/* Heading */}
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
          Bem-vindo à Toca! 🎉
        </h1>
        <p className="text-muted-foreground text-base mb-2">
          Sua assinatura foi ativada com sucesso.
        </p>
        <p className="text-muted-foreground text-sm mb-8">
          Acesse o painel agora e comece a transformar a experiência dos seus clientes com inteligência e curadoria de alto nível.
        </p>

        {/* Divisor dourado */}
        <div className="w-16 h-px bg-primary/40 mx-auto mb-8" />

        {/* CTA */}
        <Button
          onClick={() => navigate("/")}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8"
          size="lg"
        >
          Acessar meu painel
          <ArrowRight className="w-4 h-4" />
        </Button>

        <p className="mt-6 text-xs text-muted-foreground font-mono">
          ✦ Dúvidas? Fale conosco pelo WhatsApp
        </p>
      </div>
    </div>
  );
}