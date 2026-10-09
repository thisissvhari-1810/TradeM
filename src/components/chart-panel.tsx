"use client";

import { useEffect, useRef } from "react";
import { CandlestickSeries, ColorType, createChart, HistogramSeries, LineSeries, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import { macd, rsi, sma, toLine } from "@/lib/market/indicators";

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export function ChartPanel({ candles, showSma, showRsi, showMacd }: { candles: Candle[]; showSma: boolean; showRsi: boolean; showMacd: boolean }) {
  const priceRef = useRef<HTMLDivElement>(null);
  const oscRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!priceRef.current) return;
    const chart = mountChart(priceRef.current, 360);
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22C55E",
      downColor: "#EF4444",
      borderVisible: false,
      wickUpColor: "#22C55E",
      wickDownColor: "#EF4444",
    });
    series.setData(candles.map((candle) => ({ ...candle, time: candle.time as UTCTimestamp })));
    const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volume.setData(candles.map((candle) => ({ time: candle.time as UTCTimestamp, value: candle.volume, color: candle.close >= candle.open ? "#22C55E55" : "#EF444455" })));
    const closes = candles.map((candle) => candle.close);
    const times = candles.map((candle) => candle.time);
    if (showSma) {
      const fast = chart.addSeries(LineSeries, { color: "#60A5FA", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      const slow = chart.addSeries(LineSeries, { color: "#F59E0B", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      fast.setData(toLine(times, sma(closes, 20)).map((point) => ({ ...point, time: point.time as UTCTimestamp })));
      slow.setData(toLine(times, sma(closes, 50)).map((point) => ({ ...point, time: point.time as UTCTimestamp })));
    }
    chart.timeScale().fitContent();
    let oscillator: IChartApi | null = null;
    if ((showRsi || showMacd) && oscRef.current) {
      oscillator = mountChart(oscRef.current, 140);
      if (showRsi) {
        const line = oscillator.addSeries(LineSeries, { color: "#A78BFA", lineWidth: 1 });
        line.setData(toLine(times, rsi(closes, 14)).map((point) => ({ ...point, time: point.time as UTCTimestamp })));
      } else {
        const result = macd(closes);
        const line = oscillator.addSeries(LineSeries, { color: "#38BDF8", lineWidth: 1 });
        const signal = oscillator.addSeries(LineSeries, { color: "#F59E0B", lineWidth: 1 });
        line.setData(toLine(times, result.macd).map((point) => ({ ...point, time: point.time as UTCTimestamp })));
        signal.setData(toLine(times, result.signal).map((point) => ({ ...point, time: point.time as UTCTimestamp })));
      }
      oscillator.timeScale().fitContent();
    }
    const onResize = () => {
      if (priceRef.current) chart.applyOptions({ width: priceRef.current.clientWidth });
      if (oscillator && oscRef.current) oscillator.applyOptions({ width: oscRef.current.clientWidth });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      oscillator?.remove();
    };
  }, [candles, showMacd, showRsi, showSma]);

  if (!candles.length) return <div className="flex h-80 items-center justify-center text-sm text-muted">No candles for this symbol.</div>;
  return (
    <div>
      <div ref={priceRef} className="h-[360px] w-full" />
      {showRsi || showMacd ? <div ref={oscRef} className="mt-2 h-[140px] w-full" /> : null}
      <p className="mt-2 text-xs text-muted">SMA 20/50, RSI 14, and MACD 12/26/9 describe past prices. They are not predictions.</p>
    </div>
  );
}

function mountChart(container: HTMLDivElement, height: number) {
  return createChart(container, {
    width: container.clientWidth,
    height,
    layout: { background: { type: ColorType.Solid, color: "#151F32" }, textColor: "#94A3B8" },
    grid: { vertLines: { color: "#1C2940" }, horzLines: { color: "#1C2940" } },
    crosshair: { mode: 1 },
    rightPriceScale: { borderColor: "#2A3B56" },
    timeScale: { borderColor: "#2A3B56", timeVisible: true },
  });
}
