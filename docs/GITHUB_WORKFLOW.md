# Fluxo de trabalho com GitHub (branch + PR)

A partir de agora, mudancas de codigo relevantes neste repositorio seguem este fluxo,
em vez de irem direto para a `main`:

1. A mudanca e feita em uma branch dedicada (nunca direto em `main`).
2. Uma Pull Request e aberta para a `main`, com descricao do que mudou.
3. O Tony revisa e faz o merge da PR pelo GitHub quando aprovar.
4. Depois do merge, o checkpoint no Base44 e criado normalmente — a sincronizacao
   automatica do Base44 nao encontra nada novo para empurrar (o conteudo ja
   chegou na `main` via merge da PR), entao nao ha conflito nem duplicidade.

Observacao tecnica: a integracao nativa Base44 <-> GitHub (conexao "shared")
empurra cada checkpoint salvo diretamente para a `main` — ela nao tem, por
padrao, um modo "somente branch + PR". Este fluxo e uma camada adicional de
revisao por cima dessa integracao, nao uma configuracao nativa do Base44.
