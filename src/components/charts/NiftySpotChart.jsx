
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
} from "lightweight-charts";

import { calculateSupertrend } from "@/services/indicators/supertrend";

// ============================================
// TIMEFRAMES
// ============================================

const TIMEFRAMES = [
  { label: "1m", value: "minute", seconds: 60 },
  { label: "3m", value: "3minute", seconds: 180 },
  { label: "5m", value: "5minute", seconds: 300 },
  { label: "15m", value: "15minute", seconds: 900 },
];

// ============================================
// INDICATORS AND COLOURS
// ============================================

const INDICATORS = [
  { id: "ema9", label: "EMA 9", color: "#FACC15" },
  { id: "ema20", label: "EMA 20", color: "#111827" },
  { id: "ema50", label: "EMA 50", color: "#8B5CF6" },
  { id: "ema200", label: "EMA 200", color: "#EF4444" },
  { id: "ica", label: "ICA", color: "#16A34A" },
  { id: "vwap", label: "VWAP", color: "#D946EF" },
  {
    id: "supertrend",
    label: "Supertrend (10, 3)",
    color: "#16A34A",
  },
];

const DEFAULT_INDICATORS = [
  "ema9",
  "ema20",
  "ema50",
  "ica",
  "vwap",
];

const SUPERTREND_PERIOD = 10;
const SUPERTREND_MULTIPLIER = 3;

// Shading transparency
const BULLISH_FILL = "rgba(22, 163, 74, 0.12)";
const BEARISH_FILL = "rgba(220, 38, 38, 0.12)";

// ============================================
// IST HELPERS
// ============================================

const IST_OFFSET_SECONDS = 19800;

function getISTParts(unixTime) {
  const date = new Date(
    unixTime * 1000 + IST_OFFSET_SECONDS * 1000
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

function getISTDateKey(unixTime) {
  const p = getISTParts(unixTime);

  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(
    p.day
  ).padStart(2, "0")}`;
}

function getISTMinuteOfDay(unixTime) {
  const p = getISTParts(unixTime);
  return p.hour * 60 + p.minute;
}

function formatISTTime(time) {
  if (typeof time !== "number") return "";

  return new Date(time * 1000).toLocaleTimeString(
    "en-IN",
    {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
}

// ============================================
// DATE LABELS
// ============================================

function formatISTAxisLabel(time, tickMarkType) {
  if (typeof time !== "number") return "";

  const date = new Date(
    time * 1000 + IST_OFFSET_SECONDS * 1000
  );

  const year = date.getUTCFullYear();

  const month = date.toLocaleString("en-IN", {
    month: "short",
    timeZone: "UTC",
  });

  const day = String(date.getUTCDate()).padStart(2, "0");

  if (tickMarkType === 0) return String(year);

  if (tickMarkType === 1) {
    return `${month} ${year}`;
  }

  if (tickMarkType === 2) {
    return `${day} ${month}`;
  }

  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(
    date.getUTCMinutes()
  ).padStart(2, "0")}`;
}

// ============================================
// EMA CALCULATION
// ============================================

function calculateEMA(candles, period) {
  if (!candles.length) return [];

  const multiplier = 2 / (period + 1);
  let previousEMA = null;

  return candles.map((candle, index) => {
    const close = Number(candle.close);

    if (index === 0) {
      previousEMA = close;
    } else {
      previousEMA =
        close * multiplier +
        previousEMA * (1 - multiplier);
    }

    return {
      time: candle.time,
      value: previousEMA,
    };
  });
}

// ============================================
// VWAP CALCULATION
// ============================================

function calculateVWAP(candles) {
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  let currentDay = "";

  return candles
    .map((candle) => {
      const day = getISTDateKey(candle.time);

      if (day !== currentDay) {
        currentDay = day;
        cumulativePV = 0;
        cumulativeVolume = 0;
      }

      const high = Number(candle.high);
      const low = Number(candle.low);
      const close = Number(candle.close);
      const volume = Number(candle.volume) || 0;

      const typicalPrice = (high + low + close) / 3;

      cumulativePV += typicalPrice * volume;
      cumulativeVolume += volume;

      return {
        time: candle.time,
        value:
          cumulativeVolume > 0
            ? cumulativePV / cumulativeVolume
            : NaN,
      };
    })
    .filter((item) => Number.isFinite(item.value));
}

// ============================================
// ICA — ORIGINAL 5-MINUTE SESSION LOGIC
// ============================================

function calculateICA5Minute(candles) {
  const sorted = [...candles].sort(
    (a, b) => a.time - b.time
  );

  const cumulativeByDay = new Map();
  const result = [];

  const nowSeconds = Math.floor(Date.now() / 1000);
  const currentDateKey = getISTDateKey(nowSeconds);
  const currentMinute = getISTMinuteOfDay(nowSeconds);

  const currentFiveMinuteBucket =
    Math.floor(currentMinute / 5) * 5;

  for (const candle of sorted) {
    const dateKey = getISTDateKey(candle.time);
    const minuteOfDay = getISTMinuteOfDay(candle.time);

    if (minuteOfDay < 555 || minuteOfDay >= 930) {
      continue;
    }

    if (dateKey === currentDateKey) {
      if (minuteOfDay >= currentFiveMinuteBucket) {
        continue;
      }
    }

    const close = Number(candle.close);

    if (!Number.isFinite(close)) continue;

    let session = cumulativeByDay.get(dateKey);

    if (!session) {
      session = {
        sum: 0,
        count: 0,
      };

      cumulativeByDay.set(dateKey, session);
    }

    session.sum += close;
    session.count += 1;

    result.push({
      time: candle.time,
      value: session.sum / session.count,
    });
  }

  return result;
}

// ============================================
// HISTORICAL DATA CONVERSION
// ============================================

function convertHistoricalCandles(candles) {
  return candles
    .map((candle) => ({
      time: Math.floor(
        new Date(candle.date).getTime() / 1000
      ),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume) || 0,
    }))
    .filter(
      (candle) =>
        Number.isFinite(candle.time) &&
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close)
    )
    .sort((a, b) => a.time - b.time);
}

// ============================================
// LIVE CANDLE AGGREGATION
// ============================================

function aggregateLiveCandles(liveCandles, seconds) {
  const grouped = new Map();

  const sorted = [...liveCandles].sort(
    (a, b) => a.time - b.time
  );

  for (const candle of sorted) {
    const bucketTime =
      Math.floor(candle.time / seconds) * seconds;

    const existing = grouped.get(bucketTime);

    if (!existing) {
      grouped.set(bucketTime, {
        time: bucketTime,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume) || 0,
      });
    } else {
      existing.high = Math.max(
        existing.high,
        Number(candle.high)
      );

      existing.low = Math.min(
        existing.low,
        Number(candle.low)
      );

      existing.close = Number(candle.close);

      existing.volume += Number(candle.volume) || 0;
    }
  }

  return Array.from(grouped.values()).sort(
    (a, b) => a.time - b.time
  );
}

// ============================================
// MERGE HISTORICAL + LIVE CANDLES
// ============================================

function mergeCandles(historical, live) {
  const map = new Map();

  historical.forEach((candle) => {
    map.set(candle.time, candle);
  });

  live.forEach((candle) => {
    map.set(candle.time, candle);
  });

  return Array.from(map.values()).sort(
    (a, b) => a.time - b.time
  );
}

// ============================================
// SUPERTREND SHADING DRAWER
// ============================================

function drawSupertrendShading({
  canvas,
  chart,
  candleSeries,
  candles,
  supertrendData,
}) {
  if (!canvas || !chart || !candleSeries) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const rect = canvas.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);

  if (!candles.length || !supertrendData.length) return;

  const candleMap = new Map(
    candles.map((candle) => [candle.time, candle])
  );

  const points = supertrendData.map((item) => {
    const candle = candleMap.get(item.time);

    if (!candle) return null;

    const x = chart.timeScale().timeToCoordinate(item.time);

    const candleY = candleSeries.priceToCoordinate(
      candle.close
    );

    const trendY = candleSeries.priceToCoordinate(
      item.value
    );

    if (
      x === null ||
      candleY === null ||
      trendY === null ||
      !Number.isFinite(x) ||
      !Number.isFinite(candleY) ||
      !Number.isFinite(trendY)
    ) {
      return null;
    }

    return {
      x,
      candleY,
      trendY,
      trend: item.trend,
    };
  });

  context.save();

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];

    if (!previous || !current) continue;

    // Do not shade across a trend reversal.
    if (previous.trend !== current.trend) continue;

    const isBullish = current.trend === 1;

    context.beginPath();

    context.moveTo(previous.x, previous.candleY);
    context.lineTo(current.x, current.candleY);
    context.lineTo(current.x, current.trendY);
    context.lineTo(previous.x, previous.trendY);

    context.closePath();

    context.fillStyle = isBullish
      ? BULLISH_FILL
      : BEARISH_FILL;

    context.fill();
  }

  context.restore();
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function NiftySpotChart() {
  const chartContainerRef = useRef(null);
  const chartWrapperRef = useRef(null);
  const shadingCanvasRef = useRef(null);

  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const lastFittedTimeframeRef = useRef(null);

  const [timeframe, setTimeframe] = useState("5minute");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [candles, setCandles] = useState([]);
  const [icaCandles, setIcaCandles] = useState([]);

  const [liveStatus, setLiveStatus] = useState(null);
  const [lastPrice, setLastPrice] = useState(null);

  const [chartReady, setChartReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [selectedIndicators, setSelectedIndicators] =
    useState(DEFAULT_INDICATORS);

  const selectedTimeframe = TIMEFRAMES.find(
    (item) => item.value === timeframe
  );

  // ============================================
  // LOAD SELECTED TIMEFRAME HISTORY
  // ============================================

  const loadCandles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/zerodha/nifty-spot-chart?interval=${timeframe}&days=730`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load candles"
        );
      }

      const converted = convertHistoricalCandles(
        result.candles || []
      );

      if (!converted.length) {
        throw new Error("No historical candles available");
      }

      setCandles(converted);

      const latest = converted[converted.length - 1];

      if (latest) {
        setLastPrice(latest.close);
      }
    } catch (err) {
      setError(err.message || "Chart loading failed");
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadCandles();
  }, [loadCandles]);

  // ============================================
  // LOAD ICA'S SEPARATE 5-MINUTE HISTORY
  // ============================================

  useEffect(() => {
    let cancelled = false;

    async function loadICAHistory() {
      try {
        const response = await fetch(
          "/api/zerodha/nifty-spot-chart?interval=5minute&days=730",
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load ICA history"
          );
        }

        const converted = convertHistoricalCandles(
          result.candles || []
        );

        if (!cancelled) {
          setIcaCandles(converted);
        }
      } catch (err) {
        console.error("ICA HISTORY ERROR:", err);
      }
    }

    loadICAHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================
  // START WEBSOCKET AND POLL STATUS
  // ============================================

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    async function pollStatus() {
      try {
        const response = await fetch(
          "/api/nifty-spot-live",
          {
            cache: "no-store",
            credentials: "same-origin",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to read Spot status"
          );
        }

        if (cancelled) return;

        setLiveStatus(result);

        if (result.lastTick?.ltp != null) {
          setLastPrice(result.lastTick.ltp);
        }
      } catch (err) {
        if (!cancelled) {
          setLiveStatus((previous) => ({
            ...previous,
            connected: false,
            error: err.message,
          }));
        }
      }
    }

    async function startAndPoll() {
      try {
        const response = await fetch(
          "/api/nifty-spot-live",
          {
            method: "POST",
            credentials: "same-origin",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to start Spot stream"
          );
        }

        if (cancelled) return;

        console.log("NIFTY SPOT STREAM:", result);

        await pollStatus();

        if (!cancelled) {
          intervalId = setInterval(pollStatus, 1000);
        }
      } catch (err) {
        console.error("NIFTY SPOT START ERROR:", err);

        if (!cancelled) {
          setLiveStatus({
            connected: false,
            connecting: false,
            error: err.message,
          });
        }
      }
    }

    startAndPoll();

    return () => {
      cancelled = true;

      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // ============================================
  // CREATE WHITE CHART
  // ============================================

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(
      chartContainerRef.current,
      {
        autoSize: true,

        layout: {
          background: {
            type: ColorType.Solid,
            color: "#FFFFFF",
          },
          textColor: "#334155",
          fontFamily: "Geist, Arial, sans-serif",
        },

        grid: {
          vertLines: { color: "#E5E7EB" },
          horzLines: { color: "#E5E7EB" },
        },

        crosshair: {
          mode: 1,
        },

        rightPriceScale: {
          borderColor: "#CBD5E1",
        },

        timeScale: {
          borderColor: "#CBD5E1",
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time, tickMarkType) =>
            formatISTAxisLabel(time, tickMarkType),
        },

        localization: {
          locale: "en-IN",
          timeFormatter: (time) =>
            formatISTTime(time),
        },
      }
    );

    chartRef.current = chart;

    // CANDLESTICKS

    const candleSeries = chart.addSeries(
      CandlestickSeries,
      {
        upColor: "#16A34A",
        downColor: "#DC2626",
        borderUpColor: "#16A34A",
        borderDownColor: "#DC2626",
        wickUpColor: "#16A34A",
        wickDownColor: "#DC2626",
      }
    );

    // EMA 9

    const ema9 = chart.addSeries(LineSeries, {
      color: "#FACC15",
      lineWidth: 2,
      title: "EMA 9",
      priceLineVisible: false,
    });

    // EMA 20

    const ema20 = chart.addSeries(LineSeries, {
      color: "#111827",
      lineWidth: 2,
      title: "EMA 20",
      priceLineVisible: false,
    });

    // EMA 50

    const ema50 = chart.addSeries(LineSeries, {
      color: "#8B5CF6",
      lineWidth: 2,
      title: "EMA 50",
      priceLineVisible: false,
    });

    // EMA 200

    const ema200 = chart.addSeries(LineSeries, {
      color: "#EF4444",
      lineWidth: 2,
      title: "EMA 200",
      priceLineVisible: false,
    });

    // ICA

    const ica = chart.addSeries(LineSeries, {
      color: "#16A34A",
      lineWidth: 2,
      title: "ICA",
      priceLineVisible: false,
    });

    // VWAP

    const vwap = chart.addSeries(LineSeries, {
      color: "#D946EF",
      lineWidth: 2,
      title: "VWAP",
      priceLineVisible: false,
    });

    // SINGLE SUPERTREND LINE

    const supertrendSeries = chart.addSeries(LineSeries, {
      color: "#16A34A",
      lineWidth: 2,
      title: "Supertrend (10, 3)",
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    seriesRef.current = {
      candleSeries,
      ema9,
      ema20,
      ema50,
      ema200,
      ica,
      vwap,
      supertrendSeries,
    };

    setChartReady(true);

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
      setChartReady(false);
    };
  }, []);

  // ============================================
  // DISPLAY CANDLES
  // ============================================

  const displayCandles = useMemo(() => {
    const seconds = selectedTimeframe?.seconds || 300;

    const rawLive = [
      ...(liveStatus?.candles || []),
      ...(liveStatus?.currentCandle
        ? [liveStatus.currentCandle]
        : []),
    ];

    const uniqueLive = Array.from(
      new Map(
        rawLive.map((candle) => [
          candle.time,
          candle,
        ])
      ).values()
    );

    const aggregatedLive = aggregateLiveCandles(
      uniqueLive,
      seconds
    );

    return mergeCandles(candles, aggregatedLive);
  }, [candles, liveStatus, selectedTimeframe]);

  // ============================================
  // ICA DISPLAY DATA
  // ============================================

  const icaData = useMemo(() => {
    const rawLive = [
      ...(liveStatus?.candles || []),
      ...(liveStatus?.currentCandle
        ? [liveStatus.currentCandle]
        : []),
    ];

    const uniqueLive = Array.from(
      new Map(
        rawLive.map((candle) => [
          candle.time,
          candle,
        ])
      ).values()
    );

    const liveFiveMinute = aggregateLiveCandles(
      uniqueLive,
      300
    );

    const merged = mergeCandles(
      icaCandles,
      liveFiveMinute
    );

    return calculateICA5Minute(merged);
  }, [icaCandles, liveStatus]);

  // ============================================
  // SUPERTREND DATA
  // ============================================

  const supertrendData = useMemo(() => {
    if (!displayCandles.length) return [];

    return calculateSupertrend(
      displayCandles,
      SUPERTREND_PERIOD,
      SUPERTREND_MULTIPLIER
    );
  }, [displayCandles]);

  // ============================================
  // UPDATE CHART SERIES
  // ============================================

  useEffect(() => {
    if (
      !chartReady ||
      !seriesRef.current.candleSeries ||
      !displayCandles.length
    ) {
      return;
    }

    const series = seriesRef.current;

    series.candleSeries.setData(displayCandles);

    if (
      chartRef.current &&
      lastFittedTimeframeRef.current !== timeframe
    ) {
      chartRef.current.timeScale().fitContent();
      lastFittedTimeframeRef.current = timeframe;
    }

    const indicatorData = {
      ema9: calculateEMA(displayCandles, 9),
      ema20: calculateEMA(displayCandles, 20),
      ema50: calculateEMA(displayCandles, 50),
      ema200: calculateEMA(displayCandles, 200),
      ica: icaData,
      vwap: calculateVWAP(displayCandles),
    };

    INDICATORS.filter(
      (indicator) => indicator.id !== "supertrend"
    ).forEach((indicator) => {
      const targetSeries = series[indicator.id];

      if (!targetSeries) return;

      if (selectedIndicators.includes(indicator.id)) {
        targetSeries.setData(
          indicatorData[indicator.id]
        );
      } else {
        targetSeries.setData([]);
      }
    });

    // Supertrend line with dynamic colour

    if (selectedIndicators.includes("supertrend")) {
      const coloredSupertrendData = supertrendData.map(
        (item) => ({
          time: item.time,
          value: item.value,
          color:
            item.trend === 1
              ? "#16A34A"
              : "#DC2626",
        })
      );

      series.supertrendSeries.setData(
        coloredSupertrendData
      );
    } else {
      series.supertrendSeries.setData([]);
    }
  }, [
    chartReady,
    displayCandles,
    selectedIndicators,
    icaData,
    timeframe,
    supertrendData,
  ]);

  // ============================================
  // DRAW SUPERTREND FILL
  // ============================================

  useEffect(() => {
    const canvas = shadingCanvasRef.current;
    const chart = chartRef.current;
    const candleSeries = seriesRef.current.candleSeries;

    if (!canvas || !chart || !candleSeries) return;

    let resizeObserver;

    const draw = () => {
      if (!selectedIndicators.includes("supertrend")) {
        const context = canvas.getContext("2d");
        context?.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );
        return;
      }

      drawSupertrendShading({
        canvas,
        chart,
        candleSeries,
        candles: displayCandles,
        supertrendData,
      });
    };

    draw();

    const timeScale = chart.timeScale();

    timeScale.subscribeVisibleLogicalRangeChange(draw);

    resizeObserver = new ResizeObserver(draw);

    if (chartWrapperRef.current) {
      resizeObserver.observe(chartWrapperRef.current);
    }

    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(draw);
      resizeObserver?.disconnect();
    };
  }, [
    chartReady,
    displayCandles,
    supertrendData,
    selectedIndicators,
  ]);

  // ============================================
  // INDICATOR TOGGLE
  // ============================================

  function toggleIndicator(id, checked) {
    setSelectedIndicators((previous) => {
      if (checked) {
        return previous.includes(id)
          ? previous
          : [...previous, id];
      }

      return previous.filter((item) => item !== id);
    });
  }

  // ============================================
  // CONNECTION STATUS
  // ============================================

  const streamConnected =
    liveStatus?.connected === true;

  const hasLiveTick =
    liveStatus?.lastTick?.ltp != null;

  // ============================================
  // UI
  // ============================================

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-lg">

      {/* HEADER */}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

        <div>
          <h2 className="text-lg font-bold text-slate-900">
            NIFTY 50 — LIVE CHART
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Zerodha Kite Connect · Historical + Live Spot
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          <span className="text-xs font-semibold text-sky-600">
            IST (UTC+5:30)
          </span>

          <div className="flex items-center gap-2">

            <span
              className={`h-2 w-2 rounded-full ${
                streamConnected
                  ? "bg-green-500"
                  : "bg-amber-500"
              }`}
            />

            <span
              className={`text-xs ${
                streamConnected
                  ? "text-green-600"
                  : "text-amber-600"
              }`}
            >
              {streamConnected
                ? hasLiveTick
                  ? "WebSocket Connected"
                  : "Connected · Waiting for ticks"
                : "Connecting Spot Stream"}
            </span>

          </div>

        </div>
      </div>

      {/* PRICE + TIMEFRAME + SETTINGS */}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

        <div>
          <p className="text-xs text-slate-600">
            Latest Available Price
          </p>

          <p className="text-2xl font-bold text-slate-900">
            {lastPrice !== null
              ? Number(lastPrice).toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )
              : "--"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">

            {TIMEFRAMES.map((item) => (
              <button
                key={item.value}
                onClick={() => setTimeframe(item.value)}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                  timeframe === item.value
                    ? "bg-sky-500 text-white"
                    : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}

          </div>

          <button
            onClick={() =>
              setSettingsOpen((previous) => !previous)
            }
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              settingsOpen
                ? "border-sky-500 bg-sky-500 text-white"
                : "border-slate-300 bg-white text-slate-800 hover:border-sky-500"
            }`}
          >
            <span className="mr-1">⚙</span>
            Indicators
          </button>

        </div>
      </div>

      {/* INDICATOR SETTINGS */}

      {settingsOpen && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">

          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Chart Indicators
            </h3>

            <span className="text-xs text-slate-500">
              Add / Remove
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

            {INDICATORS.map((indicator) => {
              const active = selectedIndicators.includes(
                indicator.id
              );

              return (
                <label
                  key={indicator.id}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3"
                >

                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">

                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: indicator.color,
                      }}
                    />

                    {indicator.label}

                  </span>

                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) =>
                      toggleIndicator(
                        indicator.id,
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 accent-sky-500"
                  />

                </label>
              );
            })}

          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">

            <span className="text-xs text-slate-500">
              Selected: {selectedIndicators.length}
            </span>

            <button
              onClick={() =>
                setSelectedIndicators(DEFAULT_INDICATORS)
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
            >
              Reset Defaults
            </button>

          </div>

          <p className="mt-3 text-xs text-slate-500">
            ICA always uses confirmed 5-minute candles and resets
            at the start of each NSE trading session.
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Supertrend: ATR {SUPERTREND_PERIOD}, Multiplier{" "}
            {SUPERTREND_MULTIPLIER}
          </p>

        </div>
      )}

      {/* INDICATOR LEGEND */}

      <div className="mb-3 flex flex-wrap gap-4 text-xs">

        {INDICATORS.filter((item) =>
          selectedIndicators.includes(item.id)
        ).map((item) => (
          <span
            key={item.id}
            style={{ color: item.color }}
          >
            ━ {item.label}
            {item.id === "ica" ? " (5m)" : ""}
          </span>
        ))}

      </div>

      {/* CHART + SHADING CANVAS */}

      <div
        ref={chartWrapperRef}
        className="relative rounded-lg border border-slate-200 bg-white"
      >

        <div
          ref={chartContainerRef}
          className="h-[420px] w-full overflow-hidden rounded-lg"
        />

        <canvas
          ref={shadingCanvasRef}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full rounded-lg"
          aria-hidden="true"
        />

        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-white/90 text-sm text-slate-600">
            Loading NIFTY historical candles...
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-white/95 text-sm text-rose-600">
            {error}
          </div>
        )}

      </div>

      {/* FOOTER */}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500">

        <span>
          NSE:NIFTY 50 · Token: 256265
        </span>

        <span>
          Interval: {selectedTimeframe?.label}
        </span>

        <span className="text-sky-600">
          Market Time: IST
        </span>

      </div>

      {liveStatus?.error && (
        <p className="mt-2 text-xs text-rose-600">
          WebSocket: {liveStatus.error}
        </p>
      )}

      {!hasLiveTick && streamConnected && (
        <p className="mt-2 text-xs text-amber-600">
          WebSocket connected. Waiting for the next market tick.
        </p>
      )}

    </section>
  );
}
