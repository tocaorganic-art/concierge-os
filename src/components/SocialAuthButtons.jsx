import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Apple, Facebook, Loader2 } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import MicrosoftIcon from "@/components/MicrosoftIcon";
import { safeReturnTo } from "@/lib/authReturnTo";

const PROVIDERS = [
  { id: "google", label: "Google", Icon: GoogleIcon },
  { id: "apple", label: "Apple", Icon: Apple },
  { id: "microsoft", label: "Microsoft", Icon: MicrosoftIcon },
  { id: "facebook", label: "Facebook", Icon: Facebook },
];

export default function SocialAuthButtons() {
  const [error, setError] = useState("");
  const [loadingProvider, setLoadingProvider] = useState(null);

  const handleLogin = async (providerId) => {
    setError("");
    setLoadingProvider(providerId);
    try {
      await base44.auth.loginWithProvider(providerId, safeReturnTo());
    } catch (err) {
      setError(
        err?.message ||
          "Não foi possível entrar com este provedor. Tente outro método."
      );
      setLoadingProvider(null);
    }
  };

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map(({ id, label, Icon }) => (
          <Button
            key={id}
            type="button"
            variant="outline"
            className="h-12 text-sm font-medium"
            disabled={!!loadingProvider}
            onClick={() => handleLogin(id)}
          >
            {loadingProvider === id ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Icon className="w-5 h-5 mr-2" />
            )}
            {label}
          </Button>
        ))}
      </div>
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
    </div>
  );
}