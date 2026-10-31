<script lang="ts">
  import { exportRows, mistagged, splitTicket, type Problem } from '#lib/kb/split';

  // `issues`: the ticket filed for each problem, as a link. A problem with no ticket shows that.
  let { ticket, issues = {} }: { ticket: number; issues?: Partial<Record<Problem, { n: number; href: string }>> } =
    $props();

  const groups = $derived(splitTicket(ticket));
  const total = $derived(groups.reduce((n, g) => n + g.reports.length, 0));
  const rows = exportRows();
  const fmt = (t: Record<string, number>) =>
    Object.entries(t)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{total}</strong> reports merged into #{ticket} · <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>channels</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code></td>
        <td>{g.reports.length}</td>
        <td class="small">{fmt(g.channels)}</td>
        <td class="small">{g.tenants.length}: {g.tenants.join(', ')}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if issues[g.problem]}
            <a href={issues[g.problem]?.href}>#{issues[g.problem]?.n}</a>
          {:else}
            <span class="none">no ticket yet</span>
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<p class="note">
  Counted from {rows.unique} unique reports; the export holds {rows.rows} rows because its pages overlap.
  {mistagged(ticket)} reports carry an intake tag that names a different problem.
</p>

{#each groups as g (g.problem)}
  {#if g.reports.length <= 40}
    <details>
      <summary><code>{g.problem}</code>: the {g.reports.length} reports</summary>
      <p class="small">{g.reports.map((r) => r.id).join(', ')}</p>
    </details>
  {/if}
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .small { color: var(--muted); font-size: 0.85em; }
  .note { color: var(--muted); font-size: 0.85em; }
  .none { color: var(--warn); font-weight: 600; }
</style>
