import React, { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "toca_pwa_popup_dismissed";
const COOLDOWN_DAYS = 7;

/**
 * Popup que aparece ao abrir o site,
 * oferecendo instalação do app (PWA) com uso offline.
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

    // Mostra o popup após 3s (dá tempo do app carregar)
    const timer = setTimeout(() => setVisible(true), 3000);

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
      // Fallback: não há prompt nativo (iOS ou desktop sem suporte)
      dismiss();
    }
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl gold-glow">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
            <Smartphone className="w-7 h-7 text-primary" />
          </div>

          <h2 className="font-display text-xl font-bold text-foreground mb-1.5">
            Baixe o App
          </h2>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Instale o <span className="text-primary font-medium">Toca Concierge</span> no seu celular.
            Funciona <span className="text-foreground font-medium">offline</span> e abre com um toque, como um app nativo.
          </p>

          {isIOS ? (
            <div className="w-full space-y-3">
              <div className="bg-secondary/60 border border-border rounded-xl p-3 text-xs text-muted-foreground text-left leading-relaxed">
                <strong className="text-foreground">Como instalar no iPhone:</strong>
                <br />
                1. Toque em <span className="text-primary font-medium">Compartilhar</span>
                <br />
                2. Escolha <span className="text-primary font-medium">"Adicionar à Tela de Início"</span>
                <br />
                3. Confirme em <span className="text-primary font-medium">"Adicionar"</span>
              </div>
              <Button onClick={dismiss} className="w-full">
                Entendi
              </Button>
            </div>
          ) : (
            <Button onClick={handleInstall} className="w-full gap-2" size="lg">
              <Download className="w-4 h-4" />
              Baixe aqui
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}