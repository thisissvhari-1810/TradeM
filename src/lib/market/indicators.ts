export type LinePoint = { time: number; value: number };

export function sma(values: number[], period: number): Array<number | null> {
  return values.map((_, index) => {
    if (index + 1 < period) return null;
    const slice = values.slice(index + 1 - period, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / period;
  });
}

export function rsi(values: number[], period = 14): Array<number | null> {
  const result: Array<number | null> = values.map(() => null);
  if (values.length <= period) return result;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gain += change;
    else loss -= change;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    const up = change > 0 ? change : 0;
    const down = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + up) / period;
    avgLoss = (avgLoss * (period - 1) + down) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9): { macd: Array<number | null>; signal: Array<number | null>; histogram: Array<number | null> } {
  const ema = (period: number) => {
    const series: Array<number | null> = values.map(() => null);
    const k = 2 / (period + 1);
    let previous = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
    series[period - 1] = previous;
    for (let i = period; i < values.length; i += 1) {
      previous = values[i] * k + previous * (1 - k);
      series[i] = previous;
    }
    return series;
  };
  const fastEma = ema(fast);
  const slowEma = ema(slow);
  const macdLine = values.map((_, index) => (fastEma[index] == null || slowEma[index] == null ? null : (fastEma[index] as number) - (slowEma[index] as number)));
  const signal: Array<number | null> = values.map(() => null);
  const histogram: Array<number | null> = values.map(() => null);
  const first = macdLine.findIndex((value) => value != null);
  if (first >= 0) {
    const seed = macdLine.slice(first, first + signalPeriod).filter((value): value is number => value != null);
    if (seed.length === signalPeriod) {
      let previous = seed.reduce((sum, value) => sum + value, 0) / signalPeriod;
      const start = first + signalPeriod - 1;
      signal[start] = previous;
      histogram[start] = (macdLine[start] as number) - previous;
      const k = 2 / (signalPeriod + 1);
      for (let i = start + 1; i < values.length; i += 1) {
        if (macdLine[i] == null) continue;
        previous = (macdLine[i] as number) * k + previous * (1 - k);
        signal[i] = previous;
        histogram[i] = (macdLine[i] as number) - previous;
      }
    }
  }
  return { macd: macdLine, signal, histogram };
}

export function toLine(times: number[], series: Array<number | null>): LinePoint[] {
  return series.flatMap((value, index) => (value == null ? [] : [{ time: times[index], value }]));
}
