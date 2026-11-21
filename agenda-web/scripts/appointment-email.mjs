import { readFileSync } from 'node:fs';

const { brand, colors } = JSON.parse(readFileSync(new URL('../config/business.json', import.meta.url), 'utf8'));
const font = 'Arial, Helvetica, sans-serif';
const hex = (color, fallback) => /^#[0-9a-f]{6}$/i.test(color ?? '') ? color : fallback;
const brandPrimary = hex(colors?.primary, '#171717');
const brandOnPrimary = hex(colors?.onPrimary, '#ffffff');
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = value => String(value).replace(/[&<>"']/g, character => entities[character]);

function button({ label, href, secondary }, primary, onPrimary) {
    const palette = secondary
        ? 'background-color:#ffffff;color:#881337;border:2px solid #881337'
        : 'background-color:' + primary + ';color:' + onPrimary + ';border:2px solid ' + primary;
    return `<a href="${escape(href)}" style="${palette};display:block;padding:13px 12px;line-height:22px;text-align:center;border-radius:9px;text-decoration:none;font-size:16px;font-weight:bold">${escape(label)}</a>`;
}

export function appointmentEmail({ subject, intro, service, date, time, barber, reference, actions = [], note, staff = false }) {
    const name = brand.name || 'Agenda Web';
    const primary = staff ? '#27272a' : brandPrimary;
    const onPrimary = staff ? '#ffffff' : brandOnPrimary;
    const details = [
        ['Servicio', service],
        ['Fecha', date],
        ['Hora', time + ' · hora de Colombia'],
        ['Profesional', barber]
    ];
    const text = [
        ...(staff ? [] : [name]), subject, intro, ...details.map(([label, value]) => label + ': ' + value),
        ...(reference ? ['Referencia: ' + reference] : []),
        ...actions.map(action => action.label + ': ' + action.href),
        ...(note ? [note] : [])
    ].join('\n');

    const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;background-color:#f4f4f5;color:#18181b;font-family:${font};font-size:16px;line-height:1.5">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5">
<tr><td align="center" style="padding:16px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #dedee3;border-radius:14px">
${staff ? '' : `<tr><td style="background-color:${primary};color:${onPrimary};padding:16px 24px;border-radius:13px 13px 0 0;font-weight:bold;font-size:17px">${escape(name)}</td></tr>`}
<tr><td style="padding:22px 24px 24px">
<h1 style="margin:0 0 8px;font-size:26px;line-height:1.2;color:#18181b">${escape(subject)}</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.55;color:#3f3f46">${escape(intro)}</p>
<dl style="margin:0;padding:12px 16px;background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px">
${details.map(([label, value]) => `<dt style="margin:8px 0 1px;color:#52525b;font-size:14px;font-weight:bold">${escape(label)}</dt>
<dd style="margin:0 0 8px;color:#18181b;font-size:17px;line-height:1.4;word-break:break-word;overflow-wrap:anywhere">${escape(value)}</dd>`).join('\n')}
</dl>
${reference ? `<p style="margin:12px 0;font-size:13px;color:#52525b;overflow-wrap:anywhere;word-break:break-word">Referencia: ${escape(reference)}</p>` : ''}
${actions.map(action => `<p style="margin:14px 0 0">${button(action, primary, onPrimary)}</p>`).join('\n')}
${note ? `<p style="margin:14px 0 0;font-size:14px;line-height:1.5;color:#52525b">${escape(note)}</p>` : ''}
</td></tr></table>
</td></tr></table>
</body></html>`;
    return { subject, text, html };
}
