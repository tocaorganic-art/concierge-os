# CLAUDE.md — Concierge OS (regras do repositório)

## Regra permanente — Git e Deploy

Aplicar em TODA tarefa neste repositório, a partir de agora, sem precisar ser repetida.
(Atualizada em 2026-09-29 — a versão anterior dizia para nunca dar merge sozinho;
o Tony corrigiu isso explicitamente no chat: agora o merge é automático quando os
testes passam.)

1. **Nunca trabalhar direto na branch `main`** durante o desenvolvimento. Sempre
   criar uma branch nova (`feature/nome-da-tarefa` ou `fix/nome-do-bug`) a partir
   da `main` atualizada.

2. Implementar, testar e validar a mudança na branch.

3. Fazer commit das alterações. Todo commit termina com:

   ```
   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
   Claude-Session: https://claude.ai/code/session_01ApkrLbP5Qp4udcdXSxExFz
   ```

4. Dar push na branch e abrir um Pull Request para `main`, com resumo das
   mudanças e checklist de testes marcado. Toda descrição de PR termina com:

   ```
   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   https://claude.ai/code/session_01ApkrLbP5Qp4udcdXSxExFz
   ```

5. **Fazer o merge do PR na `main` assim que os testes (lint/typecheck/build)
   passarem** — não é preciso esperar autorização explícita do Tony para o merge
   em si.

6. **Nunca fazer deploy nem publicar checkpoint no Base44.** Isso é sempre
   manual, feito pelo Tony, depois que o merge já estiver na `main` (ver
   `docs/GITHUB_WORKFLOW.md` para o fluxo completo de sincronização
   Base44 ↔ GitHub).

7. Ao terminar (merge feito), avisar claramente, terminando a resposta com:

   > Merge feito na main. Pronto para você publicar o deploy manual no Base44.
