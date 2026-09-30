import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "toca_pwa_popup_dismissed";
const COOLDOWN_DAYS = 7;

/**
 * Banner não-bloqueante que aparece no canto da tela,
 * oferecendo instalação do app (PWA) com uso offline.
 * Não cobre a tela inteira — o usuário pode continuar usando o app.
 */
export default function PwaInstallPopup() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Não mostra se já está instalado (standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Não mostra se o usuário dispensou recentemente
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < COOLDOWN_DAYS) return;
    }

    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Captura o evento nativo de instalação (Android/Chrome)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Mostra o banner após 4s
    const timer = setTimeout(() => setVisible(true), 4000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted" || outcome === "dismissed") {
        setDeferredPrompt(null);
        dismiss();
      }
    } else {
      dismiss();
    }
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 md:bottom-6 md:left-72 z-50 max-w-xs animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="relative bg-card border border-border rounded-2xl p-4 shadow-2xl gold-glow pointer-events-auto">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 p-1 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h2 className="font-heading text-sm font-bold text-foreground mb-0.5">
              Baixe o App
            </h2>
            <p className="text-xs text-muted-foreground mb-3 leading-snug">
              Instale o <span className="text-primary font-medium">Toca Concierge</span>. Funciona offline, como um app nativo.
            </p>

            {isIOS ? (
              <p className="text-[10px] text-muted-foreground leading-tight inline-flex items-center gap-1 flex-wrap">
                Toque em <span className="text-primary">Compartilhar</span> <ArrowRight className="w-2.5 h-2.5 flex-shrink-0" /> "Adicionar à Tela de Início"
              </p>
            ) : (
              <Button onClick={handleInstall} size="sm" className="w-full gap-1.5 h-8 text-xs">
                <Download className="w-3.5 h-3.5" />
                Baixe aqui
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}