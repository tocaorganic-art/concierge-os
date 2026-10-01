import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/lib/useUserProfile";
import { SEED_CATEGORIAS, nomesAtivos, sincronizarCatalogo } from "@/lib/categoriasCatalogo";

// Lista de categorias ATIVAS de um tipo ("despesa" | "cobranca") vinda do
// catálogo BillingCategory. Só o admin dispara o seed + migração retroativa
// (ele enxerga todos os registros; a equipe só os próprios), e só uma vez por
// sessão — o useQuery com a mesma chave deduplica entre os formulários.
//
// Se a sincronização ou a leitura do catálogo falharem, cai para o seed fixo
// do tipo: o formulário nunca fica sem opções.
export function useCategorias(tipo, { enabled = true } = {}) {
  const { isAdmin, isClient, isLoading: perfilCarregando } = useUserProfile();

  const sync = useQuery({
    queryKey: ["billing-categories-sync"],
    queryFn: sincronizarCatalogo,
    enabled: enabled && !perfilCarregando && isAdmin,
    staleTime: Infinity,
    retry: false,
  });

  const sincronizacaoPendente = isAdmin && !sync.isSuccess && !sync.isError;

  const catalogo = useQuery({
    queryKey: ["billing-categories"],
    queryFn: () => base44.entities.BillingCategory.list("nome", 1000),
    enabled: enabled && !perfilCarregando && !sincronizacaoPendente,
    retry: false,
  });

  const carregando = enabled && (perfilCarregando || sincronizacaoPendente || catalogo.isLoading);
  const usaFallback = catalogo.isError || (!carregando && (catalogo.data || []).length === 0 && !isClient);
  const categorias = usaFallback ? SEED_CATEGORIAS[tipo] : nomesAtivos(catalogo.data || [], tipo);

  return { categorias, catalogo: catalogo.data || [], isLoading: carregando };
}
