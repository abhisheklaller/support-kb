// How #4471 splits into the problems it really holds. Pages explain it; this file is what runs.
// causes.ts places a report by tenant and channel. That is right for the month flip (`parser`) and
// the booking-v3 date hint (`hint`). It cannot see a report whose date moved by one day: the tenant
// is day-first, so causes.ts files it under `parser`. The desk read those bodies and listed them
// (desk-notes.json `oneDayMove`). No day and month were swapped in them, so they are their own problem.
import reports from '#lib/data/reports-4471.json';
import notes from '#lib/data/desk-notes.json';
import { causeOf, uniqueById, type Report } from '#lib/kb/causes';
import { tenantOf } from '#lib/kb/locales';

export type Problem = 'parser' | 'hint' | 'one-day-move' | 'unplaced';

export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'one-day-move', 'unplaced'];

export function problemOf(r: Report): Problem {
  if (notes.oneDayMove.includes(r.id)) return 'one-day-move';
  return causeOf(r, tenantOf(r)) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  tenants: string[];
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

// Rows in the export, and the reports they hold: export pages overlap, so a report can come twice.
export function exportRows(): { rows: number; unique: number } {
  const all = reports as Report[];
  return { rows: all.length, unique: uniqueById(all).length };
}

export function mergedInto(ticket: number): Report[] {
  return uniqueById(reports as Report[]).filter((r) => r.mergedInto === ticket);
}

const tally = (xs: string[]) => xs.reduce<Record<string, number>>((n, x) => ({ ...n, [x]: (n[x] ?? 0) + 1 }), {});

// Counted the desk's way (CauseTable): every report under the cause causes.ts files it by, so the
// one-day moves stay inside `parser`, where they are filed. `one-day-move` counts the same reports again.
export function filedUnder(r: Report): Problem {
  return causeOf(r, tenantOf(r)) ?? 'unplaced';
}

export function splitTicket(ticket: number): ProblemGroup[] {
  const merged = mergedInto(ticket);
  return PROBLEMS.map((problem) => {
    const rs = merged.filter((r) =>
      problem === 'one-day-move' ? problemOf(r) === problem : filedUnder(r) === problem,
    );
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      problem,
      reports: rs,
      taggedAs: tally(rs.map((r) => r.meta.intakeTag)),
      tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
      channels: tally(rs.map((r) => r.channel)),
      firstSeen: days[0] ?? '',
      lastSeen: days[days.length - 1] ?? '',
    };
  }).filter((g) => g.reports.length > 0);
}

// Reports whose intake tag names a different problem than the one they belong to.
export function mistagged(ticket: number): number {
  return mergedInto(ticket).filter((r) => r.meta.intakeTag !== problemOf(r)).length;
}
