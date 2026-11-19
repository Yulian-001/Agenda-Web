'use client';

import { useEffect, useState } from 'react';
import { BarChart3, CircleAlert, Settings2 } from 'lucide-react';
import { cancellationRoles, defaultSettlementDirection, monthNames, settlementDirections } from '../../../config/finance';

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const instant = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });
const money = value => currency.format(value);
const percentage = value => value.toLocaleString('es-CO', { maximumFractionDigits: 2 }) + ' %';
const panel = 'rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5';
const control = 'min-h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-sm text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-1';
const primary = 'min-h-10 rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50';
const neutral = 'min-h-10 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100';

function periodLabel(point) {
    const [, month, day] = point.key.split('-');
    return day ? day + ' ' + monthNames[Number(month) - 1] : monthNames[Number(month) - 1];
}

function Metric({ label, value, detail, dark }) {
    return (
        <div className={'min-w-0 rounded-xl p-3 sm:p-4 ' + (dark ? 'bg-stone-950 text-white' : 'border border-stone-200 bg-white')}>
            <dt className={'text-xs font-semibold ' + (dark ? 'text-stone-200' : 'text-stone-600')}>{label}</dt>
            <dd className="mt-1 break-words text-lg font-bold leading-tight tracking-tight sm:text-xl">{value}</dd>
            {detail && <dd className={'mt-1 text-xs ' + (dark ? 'text-stone-300' : 'text-stone-600')}>{detail}</dd>}
        </div>
    );
}

function Section({ title, description, children }) {
    return <section className={panel + ' space-y-3'}>
        <div>
            <h2 className="text-base font-bold text-stone-950">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-stone-600">{description}</p>}
        </div>
        {children}
    </section>;
}

function Table({ headers, rows, empty = 'Sin registros para este período.' }) {
    if (!rows.length) return <p className="text-sm text-stone-600">{empty}</p>;
    return <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-stone-200 text-xs text-stone-700"><tr>
                {headers.map(header => <th key={header} scope="col" className="px-2 py-2">{header}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
                {rows.map(([key, name, ...cells]) => <tr key={key}>
                    <th scope="row" className="min-w-24 px-2 py-2 font-semibold text-stone-950">{name}</th>
                    {cells.map((value, index) => <td key={headers[index + 1]} className="px-2 py-2 tabular-nums">{value}</td>)}
                </tr>)}
            </tbody>
        </table>
    </div>;
}

function SalesChart({ points, monthly }) {
    const [selected, setSelected] = useState(null);
    const maximum = Math.max(0, ...points.map(point => point.revenue));
    const visible = points.find(point => point.key === selected);
    return <Section title="Ingresos del período" description={monthly ? 'Ventas completadas por día.' : 'Ventas completadas por mes.'}>
        {maximum ? <>
            <div className="flex h-28 items-end gap-1 rounded-xl border border-stone-200 bg-stone-50 px-2 pt-3">
                {points.map(point => <button type="button" key={point.key}
                    aria-label={periodLabel(point) + ': ' + money(point.revenue)} aria-pressed={point.key === selected}
                    title={periodLabel(point) + ' · ' + money(point.revenue)}
                    className="flex h-full min-w-0 flex-1 items-end rounded-t focus-visible:outline-2 focus-visible:outline-offset-1"
                    onClick={() => setSelected(point.key)}>
                    <span aria-hidden="true" className={'w-full rounded-t ' + (point.key === selected ? 'bg-emerald-700' : 'bg-stone-800')}
                        style={{ height: point.revenue ? Math.max(3, point.revenue / maximum * 100) + '%' : '2px', opacity: point.revenue ? 1 : 0.18 }} />
                </button>)}
            </div>
            <div className="flex justify-between text-xs text-stone-600"><span>{periodLabel(points[0])}</span><span>{periodLabel(points.at(-1))}</span></div>
            {visible && <p role="status" className="text-sm font-semibold text-stone-950">{periodLabel(visible)} · {money(visible.revenue)} · {visible.completed} citas</p>}
        </> : <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-600">Todavía no hay ventas completadas en este período.</p>}
    </Section>;
}

function Reports({ data, monthly }) {
    const salesRank = rows => [...rows].filter(row => row.completed > 0).sort((a, b) => b.revenue - a.revenue || b.completed - a.completed);
    return <div className="space-y-4">
        <SalesChart points={data.chart} monthly={monthly} />
        <div className="grid gap-4 xl:grid-cols-2">
            <Section title="Ranking de barberos" description="Ventas, servicios realizados y clientes con dos o más visitas con el mismo barbero.">
                <Table headers={['Barbero', 'Ventas', 'Realizadas', 'Recurrentes', 'Canceladas']}
                    rows={[...data.teamReport].sort((a, b) => b.revenue - a.revenue || b.completed - a.completed)
                        .map(row => [row.id, row.name, money(row.revenue), row.completed, row.recurringClients + ' / ' + row.uniqueClients, row.cancelled + ' · ' + percentage(row.cancellationRate)])} />
            </Section>
            <Section title="Ranking de servicios" description="Ordenado por ventas de citas completadas.">
                <Table headers={['Servicio', 'Ventas', 'Realizados']}
                    rows={salesRank(data.services).map(row => [row.id, row.name, money(row.revenue), row.completed])} />
            </Section>
            <Section title="Clientes recurrentes" description="Ordenados por semanas con visitas. Una visita cuenta por día completado.">
                <Table headers={['Cliente', 'Semanas', 'Visitas', 'Intervalo medio']}
                    rows={data.loyalty.map(row => [row.id, row.name, row.activeWeeks, row.visitDays, row.averageGap + ' días'])}
                    empty="Aún no hay clientes con visitas en dos fechas distintas para este período." />
            </Section>
            <Section title="Ventas por cliente" description="Incluye a todos los clientes con citas completadas en el período.">
                <Table headers={['Cliente', 'Ventas', 'Realizadas', 'Visitas']}
                    rows={data.salesByClient.map(row => [row.id, row.name, money(row.revenue), row.completed, row.visitDays])} />
            </Section>
            <Section title="Servicios con menor demanda" description="Servicios activos, ordenados de menor a mayor cantidad realizada.">
                <Table headers={['Servicio', 'Realizados', 'Cancelados']}
                    rows={data.lowDemand.map(row => [row.id, row.name, row.completed, row.cancelled])} />
            </Section>
            <Section title="Cancelaciones por cliente" description="Citas canceladas sobre el total programado de cada cliente, sin importar quién canceló.">
                <Table headers={['Cliente', 'Canceladas', 'Programadas', 'Porcentaje']}
                    rows={data.customerCancellations.map(row => [row.id, row.name, row.cancelled, row.scheduled, percentage(row.cancellationRate)])} />
            </Section>
            <Section title="Faltas y bloqueos de clientes" description="Estado actual, independiente del período seleccionado.">
                <Table headers={['Cliente', 'Faltas', 'Bloqueos', 'Estado']}
                    rows={data.clientSanctions.map(row => [row.id, row.name, row.strikes + ' / 3', row.blockCount,
                        { BANNED: 'Bloqueo permanente', BLOCKED: 'Bloqueado hasta ' + (row.blockedUntil ? instant.format(new Date(row.blockedUntil)) : '—'),
                            STRIKES: 'Con faltas', CLEAR: 'Sin bloqueo vigente' }[row.status]])}
                    empty="No hay clientes con faltas o bloqueos registrados." />
            </Section>
            <Section title="Quién canceló las citas" description="El porcentaje se calcula sobre todas las citas programadas del período.">
                <Table headers={['Rol', 'Canceladas', 'Porcentaje']}
                    rows={data.cancellationByRole.map(row => [row.role, cancellationRoles[row.role] ?? row.role, row.count, percentage(row.rate)])} />
                {data.authors.length > 0 && <details className="rounded-lg border border-stone-200 px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-semibold">Ver autores</summary>
                    <Table headers={['Autor', 'Rol', 'Canceladas', 'Porcentaje']}
                        rows={data.authors.map(row => [row.id, row.name ?? 'Autor desconocido', cancellationRoles[row.role] ?? row.role, row.count, percentage(row.rate)])} />
                </details>}
            </Section>
        </div>
        <Section title="Patrones de cancelación y actividad" description="Señales para revisar. Los registros de la plataforma no demuestran que una cita cancelada se haya atendido fuera del sistema.">
            {!data.patterns.length && <p className="text-sm text-stone-600">No se detectaron patrones con los datos de este período.</p>}
            {data.patterns.map(item => <details key={item.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm text-stone-900">
                <summary className="cursor-pointer font-semibold">{item.barberName} · {item.title}</summary>
                <p className="my-2 text-stone-700">{item.explanation}</p>
                <Table headers={['Fecha', 'Hora', 'Servicio', 'Estado', 'Cancelación']}
                    rows={item.evidence.map(row => [row.id, row.date, row.timeSlot, row.serviceName,
                        { CANCELLED: 'Cancelada', COMPLETED: 'Completada', PENDING: 'Pendiente', CONFIRMED: 'Confirmada' }[row.state],
                        row.cancelledAt ? instant.format(new Date(row.cancelledAt)) : '—'])} />
                {item.count > item.evidence.length && <p className="mt-2 text-xs">Mostrando {item.evidence.length} de {item.count} citas.</p>}
            </details>)}
        </Section>
    </div>;
}

function Accounting({ data, monthly, onConfigure }) {
    const receives = data.teamReport.reduce((sum, row) => sum + Math.round(row.receives * 100), 0) / 100;
    const pays = data.teamReport.reduce((sum, row) => sum + Math.round(row.pays * 100), 0) / 100;
    return <div className="space-y-4">
        <Section title="Liquidación del período" description="Importes informativos según la modalidad registrada en cada cita.">
            <dl className="grid grid-cols-2 gap-2">
                <Metric label="El negocio recibe del barbero" value={money(receives)} />
                <Metric label="El negocio paga al barbero" value={money(pays)} />
            </dl>
        </Section>
        {data.summary.estimated > 0 && <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <CircleAlert className="shrink-0" size={17} /> Las {data.summary.estimated} citas antiguas sin comisión o modalidad registrada usan la configuración vigente como estimación.
        </p>}
        <Section title="Colaboradores" description="Las ventas, comisiones y servicios realizados corresponden al período seleccionado.">
            {!data.teamReport.length && <p className="text-sm text-stone-600">Aún no hay colaboradores registrados.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
                {data.teamReport.map(row => <article key={row.id} className="min-w-0 space-y-3 rounded-xl border border-stone-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 className="font-bold text-stone-950">{row.name}</h3>
                            <p className="text-xs text-stone-600">{cancellationRoles[row.role] ?? row.role}{!row.profileActive ? ' · Inactivo' : ''}</p>
                        </div>
                        {row.canEditSettings && <button type="button" onClick={() => onConfigure(row)} className={neutral + ' inline-flex items-center gap-1'}>
                            <Settings2 size={15} /> Configurar
                        </button>}
                    </div>
                    <dl className="grid grid-cols-2 gap-2 rounded-lg bg-stone-50 p-2.5 text-sm">
                        <div><dt className="text-xs text-stone-600">Ventas</dt><dd className="font-bold">{money(row.totalSales)}</dd></div>
                        <div><dt className="text-xs text-stone-600">Completadas</dt><dd className="font-bold">{row.completed}</dd></div>
                        <div><dt className="text-xs text-stone-600">Parte del barbero</dt><dd className="font-semibold">{money(row.barberEarnings)}</dd></div>
                        <div><dt className="text-xs text-stone-600">Parte del negocio</dt><dd className="font-semibold">{money(row.bossEarnings)}</dd></div>
                    </dl>
                    <p className="text-xs text-stone-700">Comisión vigente {percentage(row.commissionRate * 100)} · {settlementDirections[row.settlementDirection]}</p>
                    {row.appliedRates.length > 0 && <p className="text-xs text-stone-700">Comisiones aplicadas {row.appliedRates.map(rate => percentage(rate * 100)).join(', ')}</p>}
                    <p className="text-xs text-stone-700">Servicios completados en todo el historial: <strong>{row.lifetimeCompleted}</strong></p>
                    {!monthly && <details className="text-xs text-stone-700">
                        <summary className="cursor-pointer font-semibold">Servicios por mes del semestre</summary>
                        <ul className="mt-1 grid grid-cols-2 gap-1">
                            {data.chart.map(point => <li key={point.key}>{periodLabel(point)} · {row.monthlyCounts[point.key] ?? 0}</li>)}
                        </ul>
                    </details>}
                </article>)}
            </div>
        </Section>
    </div>;
}

function SettingsForm({ row, onClose, onSave, busy, error }) {
    const [rate, setRate] = useState(String(Math.round(row.commissionRate * 10000) / 100));
    const [direction, setDirection] = useState(row.settlementDirection ?? defaultSettlementDirection);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="finance-settings-title" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl">
                <div><h2 id="finance-settings-title" className="text-lg font-bold">Liquidación de {row.name}</h2>
                    <p className="text-xs text-stone-600">Los cambios se aplican a las citas que se completen a partir de ahora.</p></div>
                <form className="space-y-3" onSubmit={event => {
                    event.preventDefault();
                    onSave(row.id, { commissionRate: Number(rate) / 100, settlementDirection: direction });
                }}>
                    <label className="block space-y-1 text-sm font-semibold">Porcentaje del barbero
                        <input type="number" min={0} max={100} step="0.01" required value={rate} disabled={busy} className={control}
                            onChange={event => setRate(event.target.value)} />
                    </label>
                    <label className="block space-y-1 text-sm font-semibold">Modalidad de liquidación
                        <select value={direction} disabled={busy} className={control} onChange={event => setDirection(event.target.value)}>
                            {Object.entries(settlementDirections).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>
                    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" disabled={busy} onClick={onClose} className={neutral}>Volver</button>
                        <button type="submit" disabled={busy} className={primary}>{busy ? 'Guardando…' : 'Guardar'}</button>
                    </div>
                </form>
            </section>
        </div>
    );
}

export default function FinanceDashboard({ today }) {
    const [localYear, localMonth] = today.split('-');
    const [tab, setTab] = useState('reports');
    const [period, setPeriod] = useState('monthly');
    const [year, setYear] = useState(localYear);
    const [month, setMonth] = useState(String(Number(localMonth)));
    const [semester, setSemester] = useState(Number(localMonth) <= 6 ? '1' : '2');
    const [refresh, setRefresh] = useState(0);
    const [snapshot, setSnapshot] = useState(null);
    const [editing, setEditing] = useState(null);
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState('');
    const [notice, setNotice] = useState('');
    const monthly = period === 'monthly';
    const validYear = /^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= 9998;
    const query = validYear ? new URLSearchParams({ period, year, ...(monthly ? { month } : { semester }) }).toString() : '';
    const current = snapshot?.query === query && snapshot?.refresh === refresh ? snapshot : null;

    useEffect(() => {
        if (!query) return;
        const abort = new AbortController();
        async function load() {
            try {
                const res = await fetch('/api/finances?' + query, { signal: abort.signal, cache: 'no-store' });
                const body = await res.json();
                if (!res.ok) throw new Error(body.error || 'No se pudo consultar el período.');
                if (!abort.signal.aborted) setSnapshot({ query, refresh, data: body.data });
            } catch (error) {
                if (!abort.signal.aborted) setSnapshot({ query, refresh, error: error.message });
            }
        }
        void load();
        return () => abort.abort();
    }, [query, refresh]);

    async function saveSettings(id, settings) {
        setBusy(true);
        setFormError('');
        try {
            const res = await fetch('/api/finances/' + id, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
            setEditing(null);
            setNotice(data.message);
            setRefresh(value => value + 1);
        } catch (error) {
            setFormError(error.message);
        } finally {
            setBusy(false);
        }
    }

    return <div className="mx-auto max-w-6xl space-y-4 pb-12">
        <header className={panel + ' space-y-4'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="flex items-center gap-2.5 text-2xl font-bold"><BarChart3 size={23} /> Contabilidad y Finanzas</h1>
                <div className="flex gap-1 rounded-xl bg-stone-100 p-1" aria-label="Sección de finanzas">
                    {[['reports', 'Reportes'], ['accounting', 'Contabilidad']].map(([value, label]) =>
                        <button key={value} type="button" onClick={() => { setTab(value); setNotice(''); }} aria-pressed={tab === value}
                            className={'rounded-lg px-3 py-2 text-sm font-semibold ' + (tab === value ? 'bg-white text-black shadow-sm' : 'text-stone-700 hover:bg-white/60')}>{label}</button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <label className="space-y-1 text-xs font-semibold text-stone-700">Período
                    <select value={period} onChange={event => setPeriod(event.target.value)} className={control}>
                        <option value="monthly">Mensual</option><option value="semiannual">Semestral</option>
                    </select>
                </label>
                <label className="space-y-1 text-xs font-semibold text-stone-700">Año
                    <input type="number" min={1900} max={9998} value={year} onChange={event => setYear(event.target.value)} className={control} />
                </label>
                {monthly ? <label className="space-y-1 text-xs font-semibold text-stone-700">Mes
                    <select value={month} onChange={event => setMonth(event.target.value)} className={control}>
                        {monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                    </select>
                </label> : <label className="space-y-1 text-xs font-semibold text-stone-700">Semestre
                    <select value={semester} onChange={event => setSemester(event.target.value)} className={control}>
                        <option value="1">Enero a junio</option><option value="2">Julio a diciembre</option>
                    </select>
                </label>}
            </div>
        </header>

        {!validYear && <p role="status" className={panel}>Ingresa un año entre 1900 y 9998.</p>}
        {query && !current && <p role="status" className={panel}>Consultando cifras…</p>}
        {current?.error && <div role="alert" className={panel + ' flex flex-wrap justify-between gap-2 text-rose-800'}>{current.error}
            <button type="button" className={neutral} onClick={() => setRefresh(value => value + 1)}>Reintentar</button></div>}
        {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
        {current?.data && <>
            <dl className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                <Metric dark label="Ventas completadas" value={money(current.data.summary.totalRevenue)} detail="Precio guardado al reservar" />
                <Metric label="Neto del negocio" value={money(current.data.summary.businessNet)} detail="Después de comisiones, antes de otros gastos" />
                <Metric label="Ganancia de barberos" value={money(current.data.summary.barberEarnings)} />
                <Metric label="Citas canceladas" value={percentage(current.data.summary.cancellationRate)}
                    detail={current.data.summary.cancelled + ' de ' + current.data.summary.scheduled + ' programadas'} />
            </dl>
            {tab === 'reports' ? <Reports key={query} data={current.data} monthly={monthly} /> :
                <Accounting data={current.data} monthly={monthly} onConfigure={row => { setEditing(row); setFormError(''); setNotice(''); }} />}
        </>}
        {editing && <SettingsForm key={editing.id} row={editing} busy={busy} error={formError}
            onClose={() => setEditing(null)} onSave={saveSettings} />}
    </div>;
}
