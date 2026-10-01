import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Toda a IA do app passa pelo InvokeLLM (integração nativa da plataforma).
// Antes este arquivo chamava a API da Anthropic direto com a secret
// ANTHROPIC_API_KEY — a chave ficou inválida e toda chamada virava erro 500
// (Toca TrIA do cliente e do admin parados). InvokeLLM não depende de
// secret nenhuma, então não volta a quebrar por chave expirada.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, payload } = await req.json();
    const llm = (args) => base44.asServiceRole.integrations.Core.InvokeLLM(args);

    let prompt = "";
    let jsonSchema = null;

    if (type === "proposal") {
      const { client_nome, destino, tipo_servico, budget, num_pessoas, data_chegada, data_saida, observacoes, referencia_estilo } = payload;
      prompt = `Você é um especialista em concierge e turismo de luxo. Gere uma proposta comercial profissional em português.

Dados do cliente:
- Cliente: ${client_nome}
- Destino/Projeto: ${destino}
- Tipo de serviço: ${tipo_servico}
- Budget estimado: R$ ${budget}
- Número de pessoas: ${num_pessoas}
- Período: ${data_chegada || "a definir"} a ${data_saida || "a definir"}
- Observações: ${observacoes || "Nenhuma"}
${referencia_estilo ? `- Estilo de referência: ${referencia_estilo}` : ""}

Retorne um JSON com as chaves: titulo, servicos, descricao, observacoes.`;
      jsonSchema = {
        type: "object",
        properties: {
          titulo: { type: "string" },
          servicos: { type: "string" },
          descricao: { type: "string" },
          observacoes: { type: "string" },
        },
      };
    } else if (type === "whatsapp") {
      const { template, client_nome, context } = payload;
      const templates = {
        confirmar_chegada: "confirmar chegada/check-in do cliente",
        enviar_proposta: "comunicar que uma proposta foi enviada e está disponível para análise",
        followup_viagem: "fazer follow-up pós-viagem perguntando sobre a experiência",
        solicitar_avaliacao: "solicitar uma avaliação/review do serviço prestado",
        custom: context,
      };
      prompt = `Você é um especialista em comunicação para serviços de concierge e turismo de luxo.
Gere uma mensagem de WhatsApp profissional, calorosa e personalizada em português brasileiro.
Cliente: ${client_nome}
Objetivo: ${templates[template] || context}
Contexto adicional: ${context || "Nenhum"}

A mensagem deve ser:
- Natural e calorosa, não robótica
- Profissional mas não formal demais
- Entre 3-6 linhas
- Pronta para enviar (não use placeholders como [NOME])
- Pode usar 1-2 emojis discretos

Responda apenas com a mensagem, sem explicações.`;
    } else if (type === "ai_suggestions") {
      const { proposals, clients, tasks } = payload;
      const leads = proposals.filter(p => p.status === "lead");
      const semFollowup = leads.filter(p => {
        const created = new Date(p.created_date);
        const days = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        return days > 7;
      });
      const ticketMedio = proposals.filter(p => p.valor > 0).reduce((acc, p) => ({ sum: acc.sum + p.valor, count: acc.count + 1 }), { sum: 0, count: 0 });
      const destinos = {};
      proposals.filter(p => p.destino && p.valor > 0).forEach(p => {
        if (!destinos[p.destino]) destinos[p.destino] = { total: 0, count: 0 };
        destinos[p.destino].total += p.valor;
        destinos[p.destino].count++;
      });
      const topDestino = Object.entries(destinos).sort((a, b) => b[1].total - a[1].total)[0];
      const tarefasPendentes = tasks.filter(t => t.status === "pendente").length;

      prompt = `Você é um analista de negócios especializado em concierge e turismo de luxo.
Analise os dados do pipeline e gere exatamente 3 recomendações acionáveis em JSON.

Dados:
- Total de propostas: ${proposals.length}
- Leads sem follow-up há +7 dias: ${semFollowup.length}
- Ticket médio geral: R$ ${ticketMedio.count > 0 ? Math.round(ticketMedio.sum / ticketMedio.count).toLocaleString("pt-BR") : 0}
- Top destino por receita: ${topDestino ? `${topDestino[0]} (R$ ${topDestino[1].total.toLocaleString("pt-BR")}, ${topDestino[1].count} propostas)` : "sem dados"}
- Clientes cadastrados: ${clients.length}
- Tarefas pendentes: ${tarefasPendentes}
- Propostas confirmadas: ${proposals.filter(p => p.status === "confirmado" || p.status === "concluido").length}

Cada recomendação tem: titulo (curto), descricao (acionável, 1-2 frases) e tipo (urgente|oportunidade|melhoria).`;
      jsonSchema = {
        type: "object",
        properties: {
          recomendacoes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                descricao: { type: "string" },
                tipo: { type: "string", enum: ["urgente", "oportunidade", "melhoria"] },
              },
            },
          },
        },
      };
    } else if (type === "chat") {
      const { messages: chatHistory, user_context } = payload;
      const systemPrompt = `Você é a Toca TrIA, a assistente de IA do Concierge OS — uma plataforma para operadores de turismo de luxo e concierge no Brasil.

Você ajuda com:
- Criação e melhoria de propostas comerciais
- Estratégias de vendas e follow-up de leads
- Gestão de clientes e relacionamento
- Organização de agenda e tarefas
- Insights sobre o pipeline de vendas
- Dicas de concierge, turismo de luxo e hospitalidade
- Comunicação profissional (WhatsApp, email, etc.)

Contexto do usuário: ${user_context || "operador de concierge"}

Seja direta, prática e amigável. Responda sempre em português brasileiro. Use emojis com moderação quando apropriado.`;
      const historicoTexto = (chatHistory || [])
        .map(m => `${m.role === "assistant" ? "Toca TrIA" : "Usuário"}: ${m.content}`)
        .join("\n");
      prompt = `${systemPrompt}

Histórico da conversa até agora:
${historicoTexto}

Responda a última mensagem do usuário, continuando a conversa naturalmente. Responda apenas com a sua resposta, sem prefixos.`;
    } else if (type === "schedule_suggestion") {
      const { tasks_today, new_task_duration } = payload;
      const occupied = tasks_today.filter(t => t.horario).map(t => t.horario).sort();
      prompt = `Sugira o melhor horário para uma nova tarefa de ${new_task_duration || 60} minutos.
Horários já ocupados hoje: ${occupied.length > 0 ? occupied.join(", ") : "Nenhum"}
Responda apenas com o horário no formato HH:MM (ex: 14:30), sem explicações.`;
    } else if (type === "global_search") {
      // Busca com IA sobre os PRÓPRIOS dados do cliente — o contexto já vem
      // pronto do frontend (contrato, financeiro, pedidos, grupo, agenda,
      // documentos), montado SÓ com dados que o RLS já liberou pra esse
      // usuário (mesmas queries client_id-scoped usadas no resto do app).
      // Nunca inventa dado que não esteja no contexto.
      const { pergunta, contexto } = payload;
      prompt = `Você é o assistente do Concierge OS. Responda a pergunta do cliente EXCLUSIVAMENTE com base no contexto abaixo (dados reais dele: contrato, financeiro, pedidos, grupo, agenda e documentos). Nunca invente valores, datas ou informações que não estejam no contexto. Se a resposta não estiver disponível, diga isso claramente e sugira a seção do painel onde a pessoa pode conferir ou falar com o concierge.

Contexto (dados do cliente):
"""
${(contexto || "").slice(0, 15000)}
"""

Pergunta: ${pergunta}

Responda em português, direto e curto (no máximo 4 frases), citando de qual área do painel veio a informação quando possível (ex: "conforme Faturamento...").`;
    } else if (type === "contract_qa") {
      // Responde SOMENTE com base no texto do contrato já extraído no
      // frontend (via ExtractDataFromUploadedFile) — nunca inventa cláusula.
      // Se a pergunta não puder ser respondida pelo texto, diz isso
      // explicitamente em vez de arriscar um chute.
      const { pergunta, contrato_texto } = payload;
      prompt = `Você responde perguntas EXCLUSIVAMENTE com base no texto do contrato/regras da casa abaixo. Nunca invente cláusulas, valores ou informações que não estejam literalmente no texto. Se a resposta não estiver no texto, diga claramente que não encontrou essa informação no contrato e sugira falar com o concierge.

Texto do contrato/regras da casa:
"""
${(contrato_texto || "").slice(0, 15000)}
"""

Pergunta do cliente: ${pergunta}

Responda em português, de forma direta e curta, citando a parte relevante do contrato quando possível.`;
    }

    if (!prompt) {
      return Response.json({ error: `Tipo inválido: ${type}` }, { status: 400 });
    }

    const result = await llm(jsonSchema ? { prompt, response_json_schema: jsonSchema } : { prompt });
    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}