import { readFileSync } from 'fs';
// Explicit invocation only: this calls the configured server and may incur API charges.
// Fixture must contain human-reviewed expected IDs, not guesses from a model.
type Case = { query: string; language: string; expectedQuestionId: string | null; reviewed: boolean };
async function main() {
  const [baseUrl, fixture] = process.argv.slice(2);
  if (!baseUrl || !fixture) throw new Error('Usage: node dist/scripts/benchmarkSearch.js URL FIXTURE.json');
  const cases: Case[] = JSON.parse(readFileSync(fixture, 'utf8'));
  if (!cases.length || cases.some(c => c.reviewed !== true || !c.query || !c.language || !(c.expectedQuestionId === null || /^[a-f0-9]{24}$/i.test(c.expectedQuestionId)))) throw new Error('Review and complete every fixture case first.');
  const percentile = (v: number[], p: number) => v.length ? [...v].sort((a,b) => a-b)[Math.ceil(v.length * p) - 1] : null;
  for (const phase of ['first_pass_cache_state_unknown', 'warm_repeat']) {
    const results: { ms: number; success: boolean; correct: boolean; wrongConfident: boolean }[] = [];
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(10, cases.length) }, async () => {
      while (cursor < cases.length) {
        const item = cases[cursor++]; const start = performance.now();
        try {
          const response = await fetch(new URL('/api/chatbot/query', baseUrl), { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryText: item.query, language: item.language, intent: 'direct_answer' }), signal: AbortSignal.timeout(40000) });
          const data: any = await response.json();
          const success = response.ok && data.success === true;
          const actual = data.matchConfident ? data.matchedLevel1Question?.id : null;
          results.push({ ms: performance.now() - start, success, correct: success && actual === item.expectedQuestionId,
            wrongConfident: success && actual != null && actual !== item.expectedQuestionId });
        } catch { results.push({ ms: performance.now() - start, success: false, correct: false, wrongConfident: false }); }
      }
    }));
    const answered = results.filter(x => x.success && x.correct).map(x => x.ms);
    console.log(JSON.stringify({ phase, concurrency: 10, total: results.length, failures: results.filter(x => !x.success).length,
      correct: answered.length, wrongConfident: results.filter(x => x.wrongConfident).length,
      p50CorrectResponseMs: percentile(answered, .5), p95CorrectResponseMs: percentile(answered, .95),
      correctWithin7Seconds: results.filter(x => x.correct && x.ms <= 7000).length,
      note: 'HTTP timings only. Measure Android rendering and mobile connectivity separately. First pass is not necessarily cold.' }));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
