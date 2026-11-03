// Accepts "8", "2–3" or "2-3" and returns [first, last], or null when it cannot be read.
export function parseDays(days) {
  const match = /^\s*(\d+)\s*(?:[–—-]\s*(\d+))?\s*$/.exec(String(days));
  if (!match) return null;
  const first = Number(match[1]);
  const last = match[2] ? Number(match[2]) : first;
  return last >= first ? [first, last] : null;
}

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function midnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Day number of the trip for `now`; 1 is the start date. Math.round absorbs DST shifts.
export function tripDay(startDate, now = new Date()) {
  const start = parseLocalDate(startDate);
  if (!start) return null;
  return Math.round((midnight(now) - start) / 86400000) + 1;
}

// Returns { day, index, isFlight } while the trip runs, or null before and after it.
export function resolveToday(data, startDate, now = new Date()) {
  const day = tripDay(startDate, now);
  if (day === null) return null;
  if (data.trip.flightDay && day === data.trip.flightDay) {
    return { day, index: data.stops.length - 1, isFlight: true };
  }
  const index = data.stops.findIndex((stop) => {
    const range = parseDays(stop.days);
    return range && day >= range[0] && day <= range[1];
  });
  return index === -1 ? null : { day, index, isFlight: false };
}

// Messages for trip days that fall on a weekday with no transport (info.dateChecks in the JSON).
export function dateWarnings(data, startDate) {
  const start = parseLocalDate(startDate);
  const checks = data.info && data.info.dateChecks;
  if (!start || !Array.isArray(checks)) return [];
  const warnings = [];
  for (const check of checks) {
    for (const day of check.days) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day - 1);
      if (date.getDay() === check.weekday) warnings.push(check.message.replace('{day}', day));
    }
  }
  return warnings;
}
