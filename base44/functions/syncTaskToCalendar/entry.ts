import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const TIMEZONE = 'America/Bahia';
const REMINDER_MINUTES = { '15min': 15, '30min': 30, '1h': 60, '1dia': 1440 };
const CAL_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function pad(n) {
  return String(n).padStart(2, '0');
}

function buildEvent(task) {
  const date = task.data || null;
  const horario = String(task.horario || '').slice(0, 5);
  const hasTime = Boolean(date) && /^\d{2}:\d{2}$/.test(horario);

  const event = { summary: task.titulo || 'Tarefa Concierge OS' };

  const parts = [];
  if (task.client_nome) parts.push(`Cliente: ${task.client_nome}`);
  if (task.tipo) parts.push(`Tipo: ${task.tipo}`);
  if (task.status) parts.push(`Status: ${task.status}`);
  if (task.descricao) parts.push('', task.descricao);
  if (parts.length) event.description = parts.join('\n');

  if (hasTime) {
    const [h, m] = horario.split(':').map(Number);
    const endTotal = h * 60 + m + 60;
    event.start = { dateTime: `${date}T${horario}:00`, timeZone: TIMEZONE };
    event.end = { dateTime: `${date}T${pad(Math.floor(endTotal / 60) % 24)}:${pad(endTotal % 60)}:00`, timeZone: TIMEZONE };
  } else if (date) {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    event.start = { date };
    event.end = { date: d.toISOString().split('T')[0] };
  } else {
    return null; // sem data não há como agendar no calendário
  }

  const reminderMin = REMINDER_MINUTES[task.lembrete_antecedencia];
  if (task.lembrete_ativo && reminderMin) {
    event.reminders = { useDefault: false, overrides: [{ method: 'popup', minutes: reminderMin }] };
  }

  return event;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const eventType = body.event_type;
    const task = body.task;
    const entityId = body.entity_id;

    if (!eventType || !task) {
      return Response.json({ error: 'missing event_type or task' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Exclusão da tarefa -> remove o evento do calendário
    if (eventType === 'delete') {
      if (task.calendar_event_id) {
        const res = await fetch(`${CAL_BASE}/${encodeURIComponent(task.calendar_event_id)}`, { method: 'DELETE', headers });
        // 204 = removido; 404/410 = já não existia — ambos são sucesso
        if (!res.ok && ![404, 410].includes(res.status)) {
          return Response.json({ error: 'google_api_error', status: res.status, details: await res.text() }, { status: 502 });
        }
      }
      return Response.json({ status: 'deleted' });
    }

    const eventBody = buildEvent(task);
    if (!eventBody) {
      return Response.json({ status: 'skipped_no_date' });
    }

    // Criação (ou tarefa ainda sem evento vinculado) -> cria o evento
    if (eventType === 'create' || !task.calendar_event_id) {
      const res = await fetch(CAL_BASE, { method: 'POST', headers, body: JSON.stringify(eventBody) });
      if (!res.ok) {
        return Response.json({ error: 'google_api_error', status: res.status, details: await res.text() }, { status: 502 });
      }
      const event = await res.json();
      if (entityId) {
        await base44.asServiceRole.entities.Task.update(entityId, { calendar_event_id: event.id });
      }
      return Response.json({ status: 'created', event_id: event.id });
    }

    // Atualização -> atualiza o evento existente
    const res = await fetch(`${CAL_BASE}/${encodeURIComponent(task.calendar_event_id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(eventBody)
    });
    if (!res.ok) {
      return Response.json({ error: 'google_api_error', status: res.status, details: await res.text() }, { status: 502 });
    }
    return Response.json({ status: 'updated' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}