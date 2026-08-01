export interface ClockLike {
  minutes?: number | null;
  seconds?: number | null;
}

export function formatClock(clock: ClockLike | null | undefined): string | undefined {
  if (clock === null || clock === undefined) {
    return undefined;
  }

  const minutes = clock.minutes;
  const seconds = clock.seconds;
  if (minutes === null || minutes === undefined || seconds === null || seconds === undefined) {
    return undefined;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
