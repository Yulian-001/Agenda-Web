const channelName = 'agenda-web-schedule';

export function announceScheduleChange() {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(channelName);
    channel.postMessage('changed');
    channel.close();
}

export function watchSchedule(load) {
    const controller = new AbortController();
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(channelName);
    let pending = false;
    let refreshAgain = false;

    async function refresh() {
        if (controller.signal.aborted || document.hidden) return;
        if (pending) {
            refreshAgain = true;
            return;
        }
        pending = true;
        try {
            await load(controller.signal);
        } finally {
            pending = false;
            if (refreshAgain) {
                refreshAgain = false;
                void refresh();
            }
        }
    }

    const interval = window.setInterval(refresh, 2000);
    channel?.addEventListener('message', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    void refresh();

    return () => {
        controller.abort();
        window.clearInterval(interval);
        channel?.close();
        document.removeEventListener('visibilitychange', refresh);
        window.removeEventListener('focus', refresh);
    };
}
