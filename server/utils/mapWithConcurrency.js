// Runs `worker` over `items`, with at most `limit` running at the same time.
// Never throws because of one bad item: like Promise.allSettled, every item gets a result.
// Results keep the SAME ORDER as `items`.
//
// Usage:
//   const results = await mapWithConcurrency(ids, 5, (id) => fetchOne(id));
//   results[0] -> { status: 'fulfilled', value } or { status: 'rejected', reason }

async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;

    const runner = async () => {
        while (true) {
            const i = nextIndex++;
            if (i >= items.length) return;
            try {
                results[i] = { status: 'fulfilled', value: await worker(items[i], i) };
            } catch (reason) {
                results[i] = { status: 'rejected', reason };
            }
        }
    };

    const runnerCount = Math.max(1, Math.min(limit, items.length));
    await Promise.all(Array.from({ length: runnerCount }, runner));
    return results;
}

module.exports = mapWithConcurrency;