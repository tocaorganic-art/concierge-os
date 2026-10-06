import { QueryClient } from '@tanstack/react-query';

// Achado de auditoria (0.B — cobrança excluída pelo admin continuava
// aparecendo pro cliente): o default daqui era refetchOnWindowFocus: false
// (sobra de boilerplate, sem justificativa registrada), e NENHUMA query do
// app tem refetchInterval. Com staleTime padrão (0), uma navegação dentro
// do SPA já refaz a busca (remonta o componente), mas uma aba parada numa
// mesma página — exatamente o caso de um cliente com o Faturamento ou a
// Visão Geral abertos enquanto o admin exclui/edita algo em outra sessão —
// nunca tinha chance de reconferir sozinha: não há remontagem, e focar a
// aba de novo não disparava nada. Ligar refetchOnWindowFocus (o default do
// próprio React Query, e não uma escolha específica deste app) cobre
// exatamente esse caso — "a próxima leitura/navegação" volta a significar
// também "voltar a olhar pra aba depois de um tempo fora dela".
//
// Isto é configuração compartilhada por TODAS as páginas do app (o
// QueryClient é um singleton único, ver src/App.jsx) — não só o Dashboard.
// Decisão documentada aqui porque a investigação partiu da auditoria do
// Dashboard (0.A/0.B), mas o efeito é geral.
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: true,
			retry: 1,
		},
	},
});
