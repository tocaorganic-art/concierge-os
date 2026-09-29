import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// E-mail de boas-vindas (Fase 2 do Portal do Cliente v2) — enviado logo após o
// convite nativo do Base44 (que é quem de fato dá acesso). Este e-mail é só
// "boas-vindas", nunca financeiro: proibido conter valores, vencimentos ou a
// palavra cobranca/cobro/payment due (regra 0.4/2.2 do ticket).
//
// POST { client_id, preview? } — preview=true monta e retorna o HTML sem
// enviar (usado pelo botão "Pré-visualizar e-mail" na ficha do cliente).

const APP_URL = 'https://tocaconciergeos.base44.app';
const LOGO_URL = 'https://media.base44.com/images/public/6a1f06cb2529a2c8784acc2c/64f555f0a_Toca_Icon_3D_Luxury_v2.png';
const PRIMARY_COLOR = '#F07A2E';

function inferLang(telefone) {
  const t = (telefone || '').replace(/[^\d+]/g, '');
  if (/^\+?54/.test(t) || /^\+?34/.test(t) || /^\+?52/.test(t)) return 'es';
  if (/^\+?55/.test(t)) return 'pt-BR';
  return null;
}

function fmtDate(dateStr, lang) {
  if (!dateStr) return '';
  const locale = { 'pt-BR': 'pt-BR', es: 'es-ES', en: 'en-US' }[lang] || 'pt-BR';
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale, { day: '2-digit', month: 'long' });
  } catch {
    return dateStr;
  }
}

const COPY = {
  'pt-BR': {
    subject: (nome) => `${nome}, seu Portal Toca Experience está pronto`,
    preheader: 'Acompanhe sua viagem e fale com seu concierge em um só lugar.',
    greeting: (nome) => `Olá, ${nome}!`,
    intro: (destino, ini, fim) =>
      `Seja muito bem-vindo(a) à Toca Experience. Preparamos um espaço exclusivo para você acompanhar cada detalhe da sua estadia${destino ? ` em ${destino}` : ''}${ini && fim ? `, de ${ini} a ${fim}` : ''}.`,
    cta: 'Acessar meu Portal',
    stepsTitle: 'Como entrar em 3 passos:',
    steps: (email) => [
      'Clique em "Acessar meu Portal".',
      `Entre com este e-mail (${email}) — use "Entrar com Google" ou crie sua senha no primeiro acesso.`,
      'Pronto! Na primeira visita, um tour rápido mostra como tudo funciona.',
    ],
    findTitle: 'No seu Portal você encontra:',
    find: [
      'Resumo da sua reserva',
      'Agenda e status da viagem',
      'Pedidos ao concierge: restaurantes, passeios, transfers e experiências',
      'Chat direto com nossa equipe',
      'TrIA, sua assistente 24h, que responde dúvidas no seu idioma',
    ],
    help: (whatsapp) => whatsapp
      ? `Precisa de ajuda? Fale com seu concierge pelo WhatsApp ${whatsapp}.`
      : 'Precisa de ajuda? Fale com seu concierge pelo chat do Portal.',
    security: 'Segurança: a Toca Experience nunca pede senhas ou dados de cartão por e-mail.',
    signoff: 'Com carinho,',
    team: 'Equipe Toca Experience',
  },
  es: {
    subject: (nome) => `${nome}, tu Portal Toca Experience está listo`,
    preheader: 'Sigue tu viaje y habla con tu concierge en un solo lugar.',
    greeting: (nome) => `¡Hola, ${nome}!`,
    intro: (destino, ini, fim) =>
      `Te damos la bienvenida a Toca Experience. Preparamos un espacio exclusivo para que sigas cada detalle de tu estadía${destino ? ` en ${destino}` : ''}${ini && fim ? `, del ${ini} al ${fim}` : ''}.`,
    cta: 'Acceder a mi Portal',
    stepsTitle: 'Cómo ingresar en 3 pasos:',
    steps: (email) => [
      'Haz clic en "Acceder a mi Portal".',
      `Ingresa con este correo (${email}) — usa "Continuar con Google" o crea tu contraseña en el primer acceso.`,
      '¡Listo! En tu primera visita, un recorrido rápido te muestra cómo funciona todo.',
    ],
    findTitle: 'En tu Portal encontrarás:',
    find: [
      'Resumen de tu reserva',
      'Agenda y estado del viaje',
      'Pedidos al concierge: restaurantes, paseos, traslados y experiencias',
      'Chat directo con nuestro equipo',
      'TrIA, tu asistente 24h, que responde tus dudas en tu idioma',
    ],
    help: (whatsapp) => whatsapp
      ? `¿Necesitas ayuda? Escríbele a tu concierge por WhatsApp ${whatsapp}.`
      : '¿Necesitas ayuda? Escríbele a tu concierge por el chat del Portal.',
    security: 'Seguridad: Toca Experience nunca solicita contraseñas ni datos de tarjeta por correo.',
    signoff: 'Con cariño,',
    team: 'Equipo Toca Experience',
  },
  en: {
    subject: (nome) => `${nome}, your Toca Experience Portal is ready`,
    preheader: 'Follow your trip and reach your concierge in one place.',
    greeting: (nome) => `Hi ${nome},`,
    intro: (destino, ini, fim) =>
      `Welcome to Toca Experience. We've prepared an exclusive space for you to follow every detail of your stay${destino ? ` in ${destino}` : ''}${ini && fim ? `, from ${ini} to ${fim}` : ''}.`,
    cta: 'Open my Portal',
    stepsTitle: 'Sign in in 3 steps:',
    steps: (email) => [
      'Click "Open my Portal".',
      `Sign in with this email (${email}) — use "Continue with Google" or create your password on first access.`,
      "Done! On your first visit, a quick tour shows you how everything works.",
    ],
    findTitle: "In your Portal you'll find:",
    find: [
      'Your booking summary',
      'Trip schedule and status',
      'Concierge requests: restaurants, tours, transfers and experiences',
      'Direct chat with our team',
      'TrIA, your 24/7 assistant, answering questions in your language',
    ],
    help: (whatsapp) => whatsapp
      ? `Need help? Reach your concierge on WhatsApp ${whatsapp}.`
      : 'Need help? Reach your concierge through the Portal chat.',
    security: 'Security: Toca Experience never asks for passwords or card details by email.',
    signoff: 'Warm regards,',
    team: 'The Toca Experience Team',
  },
};

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildHtml({ nome, email, destino, dataInicio, dataFim, whatsapp, lang }) {
  const c = COPY[lang] || COPY['pt-BR'];
  const stepsHtml = c.steps(email).map((s, i) => `<li style="margin:0 0 6px 0;">${i + 1}. ${escapeHtml(s)}</li>`).join('');
  const findHtml = c.find.map((s) => `<li style="margin:0 0 6px 0;">${escapeHtml(s)}</li>`).join('');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(c.subject(nome))}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1115;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1115;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#171a21;border-radius:16px;overflow:hidden;">
<tr><td align="center" style="padding:32px 32px 16px 32px;">
<img src="${LOGO_URL}" width="56" height="56" alt="Toca Experience" style="display:block;border-radius:12px;">
</td></tr>
<tr><td style="padding:8px 32px 0 32px;">
<h1 style="margin:0;font-size:22px;line-height:1.3;color:#f5f0e8;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(c.greeting(nome))}</h1>
</td></tr>
<tr><td style="padding:12px 32px 0 32px;">
<p style="margin:0;font-size:15px;line-height:1.6;color:#c9c4bb;">${escapeHtml(c.intro(destino, dataInicio, dataFim))}</p>
</td></tr>
<tr><td align="center" style="padding:28px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td align="center" style="border-radius:10px;background-color:${PRIMARY_COLOR};">
<a href="${APP_URL}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:bold;color:#1a1206;text-decoration:none;border-radius:10px;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(c.cta)}</a>
</td>
</tr></table>
</td></tr>
<tr><td style="padding:0 32px;">
<p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;color:#f5f0e8;">${escapeHtml(c.stepsTitle)}</p>
<ol style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.6;color:#c9c4bb;">${stepsHtml}</ol>
</td></tr>
<tr><td style="padding:24px 32px 0 32px;">
<p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;color:#f5f0e8;">${escapeHtml(c.findTitle)}</p>
<ul style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.6;color:#c9c4bb;">${findHtml}</ul>
</td></tr>
<tr><td style="padding:24px 32px 0 32px;">
<p style="margin:0;font-size:14px;line-height:1.6;color:#c9c4bb;">${escapeHtml(c.help(whatsapp))}</p>
</td></tr>
<tr><td style="padding:20px 32px 0 32px;">
<p style="margin:0;font-size:12px;line-height:1.5;color:#8a8378;">${escapeHtml(c.security)}</p>
</td></tr>
<tr><td style="padding:28px 32px 32px 32px;border-top:1px solid #262b35;margin-top:20px;">
<p style="margin:20px 0 0 0;font-size:13px;color:#c9c4bb;">${escapeHtml(c.signoff)}<br><strong style="color:#f5f0e8;">${escapeHtml(c.team)}</strong></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildText({ nome, email, destino, dataInicio, dataFim, whatsapp, lang }) {
  const c = COPY[lang] || COPY['pt-BR'];
  const steps = c.steps(email).map((s, i) => `${i + 1}. ${s}`).join('\n');
  const find = c.find.map((s) => `- ${s}`).join('\n');
  return [
    c.greeting(nome),
    '',
    c.intro(destino, dataInicio, dataFim),
    '',
    `[${c.cta}] ${APP_URL}`,
    '',
    c.stepsTitle,
    steps,
    '',
    c.findTitle,
    find,
    '',
    c.help(whatsapp),
    '',
    c.security,
    '',
    c.signoff,
    c.team,
  ].join('\n');
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { client_id, preview } = body || {};

    if (!client_id) {
      return Response.json({ error: 'client_id obrigatorio' }, { status: 400 });
    }

    const client = await base44.asServiceRole.entities.Client.get(client_id);
    if (!client) {
      return Response.json({ error: 'cliente nao encontrado' }, { status: 404 });
    }
    if (!client.email) {
      return Response.json({ error: 'cliente sem email cadastrado' }, { status: 400 });
    }

    const propostas = await base44.asServiceRole.entities.Proposal.filter({ client_id }, '-data_chegada', 20);
    const proposta = propostas.find((p) => ['lead', 'proposta', 'confirmado'].includes(p.status)) || propostas[0];

    const lang = client.idioma_padrao || inferLang(client.telefone) || 'pt-BR';

    const profiles = await base44.asServiceRole.entities.UserProfile.filter({}, '-created_date', 50);
    const whatsapp = (profiles.find((p) => p.whatsapp_concierge)?.whatsapp_concierge) || '';

    const vars = {
      nome: client.nome,
      email: client.email,
      destino: proposta?.destino || '',
      dataInicio: fmtDate(proposta?.data_chegada, lang),
      dataFim: fmtDate(proposta?.data_saida, lang),
      whatsapp,
      lang,
    };

    const html = buildHtml(vars);
    const text = buildText(vars);
    const subject = (COPY[lang] || COPY['pt-BR']).subject(client.nome);

    if (preview) {
      return Response.json({ status: 'preview', subject, html, text, lang });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: client.email,
      subject,
      body: html,
      from_name: 'Toca Experience',
    });

    await base44.asServiceRole.entities.Client.update(client_id, {
      welcome_email_sent_at: new Date().toISOString(),
    });

    return Response.json({ status: 'sent', subject, lang });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
