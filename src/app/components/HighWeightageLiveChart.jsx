
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "bhavish-high-weightage-chart-v1";

const SESSION_START = 9 * 60 + 15;
const SESSION_END = 15 * 60 + 30;
const CANDLE_MINUTES = 5;
const MIN_VIEW_MINUTES = 15;
const QUICK_VIEW_MINUTES = 90;

const TOP_STOCKS = [
  "HDFCBANK",
  "ICICIBANK",
  "RELIANCE",
  "BHARTIARTL",
  "LT",
  "SBIN",
  "INFY",
];

const QUICK_TIMES = [
  { label: "09:15", minute: 555 },
  { label: "10:00", minute: 600 },
  { label: "11:00", minute: 660 },
  { label: "12:00", minute: 720 },
  { label: "13:00", minute: 780 },
  { label: "14:00", minute: 840 },
  { label: "15:00", minute: 900 },
];

// =====================================================
// TIME HELPERS
// =====================================================

function getSessionDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

function getMarketMinutes(timestamp) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));

  const hour = Number(
    parts.find((part) => part.type === "hour")?.value
  );

  const minute = Number(
    parts.find((part) => part.type === "minute")?.value
  );

  return hour * 60 + minute;
}

function formatTime(minutes) {
  const safeMinutes = Math.round(minutes);
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(
    minute
  ).padStart(2, "0")}`;
}

// =====================================================
// LOCAL STORAGE
// =====================================================

function loadHistory(date) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}"
    );

    return Array.isArray(saved[date]) ? saved[date] : [];
  } catch (error) {
    console.error("CHART HISTORY LOAD ERROR:", error);
    return [];
  }
}

function saveHistory(date, points) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}"
    );

    saved[date] = points;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(saved)
    );
  } catch (error) {
    console.error("CHART HISTORY SAVE ERROR:", error);
  }
}

// =====================================================
// CANDLE HELPERS
// =====================================================

function getBucketMinute(timestamp) {
  const minutes = getMarketMinutes(timestamp);

  return (
    SESSION_START +
    Math.floor(
      (minutes - SESSION_START) / CANDLE_MINUTES
    ) * CANDLE_MINUTES
  );
}

function buildCandles(historicalPoints, livePoints) {
  const buckets = new Map();

  // Historical score OHLC from API
  historicalPoints.forEach((point) => {
    const timestamp = Number(point.timestamp);

    if (!timestamp) return;

    const minutes = getMarketMinutes(timestamp);

    if (
      minutes < SESSION_START ||
      minutes > SESSION_END
    ) {
      return;
    }

    const bucketStart = getBucketMinute(timestamp);

    buckets.set(bucketStart, {
      minute: bucketStart,
      open: Number(point.open),
      high: Number(point.high),
      low: Number(point.low),
      close: Number(point.close),
      historical: true,
    });
  });

  // Merge live observations
  livePoints.forEach((point) => {
    const timestamp = Number(point.time);
    const value = Number(point.score);

    if (!timestamp || !Number.isFinite(value)) return;

    const minutes = getMarketMinutes(timestamp);

    if (
      minutes < SESSION_START ||
      minutes > SESSION_END
    ) {
      return;
    }

    const bucketStart = getBucketMinute(timestamp);
    const existing = buckets.get(bucketStart);

    if (existing) {
      existing.high = Math.max(existing.high, value);
      existing.low = Math.min(existing.low, value);
      existing.close = value;
    } else {
      buckets.set(bucketStart, {
        minute: bucketStart,
        open: value,
        high: value,
        low: value,
        close: value,
        historical: false,
      });
    }
  });

  return [...buckets.values()].sort(
    (a, b) => a.minute - b.minute
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function HighWeightageLiveChart({
  score,
  stocks = [],
}) {
  const [historicalPoints, setHistoricalPoints] = useState([]);
  const [liveHistory, setLiveHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // Chart navigation
  const [viewRange, setViewRange] = useState({
    start: SESSION_START,
    end: SESSION_END,
  });

  // Hover tooltip
  const [hoverInfo, setHoverInfo] = useState(null);

  const svgRef = useRef(null);
  const dragRef = useRef(null);

  const date = getSessionDate();

  // =====================================================
  // CHART DIMENSIONS
  // =====================================================

  const width = 1100;
  const height = 390;

  const left = 72;
  const right = 24;
  const top = 25;
  const bottom = 45;

  const zeroY = height / 2;
  const plotWidth = width - left - right;

  // =====================================================
  // LOAD LOCAL LIVE HISTORY
  // =====================================================

  useEffect(() => {
    setLiveHistory(loadHistory(date));
    setHistoryLoaded(true);
  }, [date]);

  // =====================================================
  // FETCH HISTORICAL DATA
  // =====================================================

  useEffect(() => {
    const controller = new AbortController();

    async function fetchHistoricalData() {
      try {
        setApiLoading(true);
        setApiError("");

        const response = await fetch(
          "/api/high-weightage-history",
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Historical data unavailable"
          );
        }

        const validPoints = (result.points || [])
          .filter((point) => {
            return (
              Number.isFinite(Number(point.timestamp)) &&
              Number.isFinite(Number(point.open)) &&
              Number.isFinite(Number(point.high)) &&
              Number.isFinite(Number(point.low)) &&
              Number.isFinite(Number(point.close))
            );
          })
          .sort(
            (a, b) => a.timestamp - b.timestamp
          );

        setHistoricalPoints(validPoints);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(
            "HISTORICAL CHART ERROR:",
            error
          );

          setApiError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setApiLoading(false);
        }
      }
    }

    fetchHistoricalData();

    return () => controller.abort();
  }, [date]);

  // =====================================================
  // CAPTURE LIVE SCORE
  // =====================================================

  useEffect(() => {
    if (
      !historyLoaded ||
      score === null ||
      score === undefined ||
      !Number.isFinite(Number(score))
    ) {
      return;
    }

    const now = Date.now();
    const minutes = getMarketMinutes(now);

    if (
      minutes < SESSION_START ||
      minutes > SESSION_END
    ) {
      return;
    }

    setLiveHistory((previous) => {
      const last = previous[previous.length - 1];

      if (
        last &&
        Number(last.score) === Number(score)
      ) {
        return previous;
      }

      const next = [
        ...previous,
        {
          time: now,
          score: Number(Number(score).toFixed(2)),
        },
      ];

      saveHistory(date, next);

      return next;
    });
  }, [score, historyLoaded, date]);

  // =====================================================
  // COMBINE HISTORICAL + LIVE POINTS
  // =====================================================

  const chartPoints = useMemo(() => {
    const combined = new Map();

    historicalPoints.forEach((point) => {
      combined.set(Number(point.timestamp), {
        time: Number(point.timestamp),
        score: Number(point.close),
      });
    });

    liveHistory.forEach((point) => {
      const time = Number(point.time);

      if (!time) return;

      combined.set(time, {
        time,
        score: Number(point.score),
      });
    });

    return [...combined.values()]
      .filter((point) => {
        const minutes = getMarketMinutes(point.time);

        return (
          minutes >= SESSION_START &&
          minutes <= SESSION_END
        );
      })
      .sort((a, b) => a.time - b.time);
  }, [historicalPoints, liveHistory]);

  // =====================================================
  // BUILD CANDLES
  // =====================================================

  const candles = useMemo(
    () => buildCandles(historicalPoints, liveHistory),
    [historicalPoints, liveHistory]
  );

  // =====================================================
  // TOP 7 STOCKS
  // =====================================================

  const topStocks = useMemo(() => {
    return TOP_STOCKS.map((symbol) =>
      stocks.find((stock) => stock.symbol === symbol)
    );
  }, [stocks]);

  const currentScore =
    score === null || score === undefined
      ? null
      : Number(score);

  // =====================================================
  // Y AXIS RANGE
  // =====================================================

  const allValues = [
    ...candles.flatMap((candle) => [
      candle.high,
      candle.low,
      candle.open,
      candle.close,
    ]),
    ...chartPoints.map((point) => point.score),
  ].filter(Number.isFinite);

  const maxAbs = Math.max(
    10,
    ...allValues.map((value) => Math.abs(value))
  );

  const range = maxAbs * 1.18;

  // =====================================================
  // COORDINATE HELPERS
  // =====================================================

  const x = (timestampOrMinutes) => {
    const minutes =
      timestampOrMinutes < 1000
        ? timestampOrMinutes
        : getMarketMinutes(timestampOrMinutes);

    return (
      left +
      ((minutes - viewRange.start) /
        (viewRange.end - viewRange.start)) *
        plotWidth
    );
  };

  const y = (value) => {
    return (
      zeroY -
      (value / range) *
        ((height - top - bottom) / 2)
    );
  };

  // =====================================================
  // VISIBLE CHART DATA
  // =====================================================

  const visibleCandles = candles.filter(
    (candle) =>
      candle.minute >= viewRange.start - CANDLE_MINUTES &&
      candle.minute <= viewRange.end
  );

  const visiblePoints = chartPoints.filter((point) => {
    const minute = getMarketMinutes(point.time);

    return (
      minute >= viewRange.start &&
      minute <= viewRange.end
    );
  });

  // =====================================================
  // LIVE LINE SEGMENTS
  // =====================================================

  const lineSegments = visiblePoints
    .slice(1)
    .map((point, index) => {
      const previous = visiblePoints[index];

      return {
        x1: x(previous.time),
        y1: y(previous.score),
        x2: x(point.time),
        y2: y(point.score),
        positive: point.score >= 0,
      };
    });

  // =====================================================
  // CANDLE WIDTH
  // =====================================================

  const candleWidth = Math.max(
    3,
    Math.min(
      16,
      (10 * (SESSION_END - SESSION_START)) /
        (viewRange.end - viewRange.start)
    )
  );

  // =====================================================
  // TIME LABELS
  // =====================================================

  const timeline = Array.from(
    { length: 6 },
    (_, index) => {
      const minute =
        viewRange.start +
        ((viewRange.end - viewRange.start) * index) / 5;

      return {
        minute,
        label: formatTime(minute),
      };
    }
  );

  // =====================================================
  // CLAMP CHART VIEW
  // =====================================================

  function clampView(start, end) {
    let nextStart = start;
    let nextEnd = end;

    let duration = nextEnd - nextStart;

    duration = Math.max(
      MIN_VIEW_MINUTES,
      Math.min(
        SESSION_END - SESSION_START,
        duration
      )
    );

    if (nextStart < SESSION_START) {
      nextStart = SESSION_START;
      nextEnd = nextStart + duration;
    }

    if (nextEnd > SESSION_END) {
      nextEnd = SESSION_END;
      nextStart = nextEnd - duration;
    }

    return {
      start: nextStart,
      end: nextEnd,
    };
  }

  // =====================================================
  // ZOOM
  // =====================================================

  function zoomChart(direction, anchorMinute = null) {
    setViewRange((previous) => {
      const oldDuration =
        previous.end - previous.start;

      const factor =
        direction === "in" ? 0.75 : 1.35;

      const newDuration = Math.max(
        MIN_VIEW_MINUTES,
        Math.min(
          SESSION_END - SESSION_START,
          oldDuration * factor
        )
      );

      const anchor =
        anchorMinute === null
          ? (previous.start + previous.end) / 2
          : anchorMinute;

      const ratio =
        (anchor - previous.start) / oldDuration;

      const newStart =
        anchor - ratio * newDuration;

      return clampView(
        newStart,
        newStart + newDuration
      );
    });
  }

  // =====================================================
  // MOUSE WHEEL ZOOM
  // =====================================================

  function handleWheel(event) {
    event.preventDefault();
    event.stopPropagation();

    const svg = svgRef.current;

    if (!svg) return;

    const rect = svg.getBoundingClientRect();

    const pointerX =
      ((event.clientX - rect.left) / rect.width) *
      width;

    const plotRatio = Math.max(
      0,
      Math.min(
        1,
        (pointerX - left) / plotWidth
      )
    );

    const anchorMinute =
      viewRange.start +
      plotRatio *
        (viewRange.end - viewRange.start);

    zoomChart(
      event.deltaY < 0 ? "in" : "out",
      anchorMinute
    );

    setHoverInfo(null);
  }

  // =====================================================
  // MOUSE DRAG START
  // =====================================================

  function handlePointerDown(event) {
    if (event.button !== 0) return;

    event.preventDefault();

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    dragRef.current = {
      pointerX: event.clientX,
      start: viewRange.start,
      end: viewRange.end,
    };

    setHoverInfo(null);
  }

  // =====================================================
  // POINTER MOVE - DRAG + HOVER
  // =====================================================

  function handlePointerMove(event) {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();

    // DRAG CHART
    if (dragRef.current) {
      const deltaPixels =
        event.clientX - dragRef.current.pointerX;

      const deltaMinutes =
        (deltaPixels / rect.width) *
        (viewRange.end - viewRange.start);

      const duration =
        dragRef.current.end - dragRef.current.start;

      const nextStart =
        dragRef.current.start - deltaMinutes;

      setViewRange(
        clampView(
          nextStart,
          nextStart + duration
        )
      );

      return;
    }

    // HOVER CROSSHAIR
    const svgX =
      ((event.clientX - rect.left) / rect.width) *
      width;

    const svgY =
      ((event.clientY - rect.top) / rect.height) *
      height;

    if (
      svgX < left ||
      svgX > width - right ||
      svgY < top ||
      svgY > height - bottom
    ) {
      setHoverInfo(null);
      return;
    }

    const ratio =
      (svgX - left) / plotWidth;

    const cursorMinute =
      viewRange.start +
      ratio *
        (viewRange.end - viewRange.start);

    // Find nearest score observation
    let nearestPoint = null;
    let nearestPointDistance = Infinity;

    chartPoints.forEach((point) => {
      const minute = getMarketMinutes(point.time);

      if (
        minute < viewRange.start ||
        minute > viewRange.end
      ) {
        return;
      }

      const distance = Math.abs(
        minute - cursorMinute
      );

      if (distance < nearestPointDistance) {
        nearestPointDistance = distance;
        nearestPoint = point;
      }
    });

    if (!nearestPoint) {
      setHoverInfo(null);
      return;
    }

    // Find nearest five-minute candle
    let nearestCandle = null;
    let nearestCandleDistance = Infinity;

    candles.forEach((candle) => {
      if (
        candle.minute < viewRange.start ||
        candle.minute > viewRange.end
      ) {
        return;
      }

      const distance = Math.abs(
        candle.minute - cursorMinute
      );

      if (distance < nearestCandleDistance) {
        nearestCandleDistance = distance;
        nearestCandle = candle;
      }
    });

    const wrapper =
      svgRef.current.parentElement;

    const wrapperRect =
      wrapper.getBoundingClientRect();

    setHoverInfo({
      time: nearestPoint.time,
      score: nearestPoint.score,
      candle: nearestCandle,
      x: x(nearestPoint.time),
      y: y(nearestPoint.score),
      left: event.clientX - wrapperRect.left,
      top: event.clientY - wrapperRect.top,
    });
  }

  // =====================================================
  // DRAG END
  // =====================================================

  function handlePointerUp(event) {
    dragRef.current = null;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  }

  // =====================================================
  // JUMP TO PARTICULAR TIME
  // =====================================================

  function jumpToTime(minute) {
    const half = QUICK_VIEW_MINUTES / 2;

    setHoverInfo(null);

    setViewRange(
      clampView(
        minute - half,
        minute + half
      )
    );
  }

  // =====================================================
  // RESET CHART
  // =====================================================

  function resetChart() {
    setHoverInfo(null);

    setViewRange({
      start: SESSION_START,
      end: SESSION_END,
    });
  }

  const isFullDay =
    viewRange.start === SESSION_START &&
    viewRange.end === SESSION_END;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 mt-4">

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-white">
            HIGH WEIGHTAGE LIVE SCORE
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Historical + Live Score Movement · 5-Minute OHLC · IST
          </p>
        </div>

        <div className="text-right">
          <div
            className={`text-3xl font-bold tabular-nums ${
              currentScore === null
                ? "text-slate-400"
                : currentScore > 0
                  ? "text-green-400"
                  : currentScore < 0
                    ? "text-red-400"
                    : "text-slate-300"
            }`}
          >
            {currentScore === null
              ? "--"
              : `${currentScore > 0 ? "+" : ""}${currentScore.toFixed(2)}`}
          </div>

          <div className="text-xs text-slate-500">
            Current score (pts)
          </div>
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex flex-wrap gap-5 text-xs mb-3">
        <span className="text-green-400">
          ● Positive score
        </span>

        <span className="text-red-400">
          ● Negative score
        </span>

        <span className="text-slate-400">
          ━ Zero baseline
        </span>

        <span className="text-slate-400">
          5-minute OHLC candles
        </span>
      </div>

      {/* CHART TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={() => zoomChart("in")}
            disabled={
              viewRange.end - viewRange.start <=
              MIN_VIEW_MINUTES
            }
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => zoomChart("out")}
            disabled={isFullDay}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
          >
            −
          </button>

          <button
            type="button"
            onClick={resetChart}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            Reset / Fit All
          </button>
        </div>

        <div className="text-xs text-slate-400">
          {formatTime(viewRange.start)} –{" "}
          {formatTime(viewRange.end)} IST
        </div>
      </div>

      {/* QUICK TIME NAVIGATION */}
      <div className="mb-3">
        <div className="text-xs text-slate-500 mb-2">
          JUMP TO TIME
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_TIMES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => jumpToTime(item.minute)}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                item.minute >= viewRange.start &&
                item.minute <= viewRange.end
                  ? "border-sky-500 bg-sky-500/15 text-sky-300"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* CHART WRAPPER */}
      <div
        className="relative w-full overflow-hidden rounded-lg bg-slate-950 border border-slate-800"
        onWheel={handleWheel}
        onPointerLeave={() => {
          if (!dragRef.current) {
            setHoverInfo(null);
          }
        }}
      >

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="block w-full h-auto select-none touch-pan-y"
          style={{
            cursor: dragRef.current
              ? "grabbing"
              : "crosshair",
          }}
          role="img"
          aria-label="High weightage stock live score chart"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >

          <defs>
            <clipPath id="highWeightageChartClip">
              <rect
                x={left}
                y={top}
                width={plotWidth}
                height={height - top - bottom}
              />
            </clipPath>
          </defs>

          {/* HORIZONTAL GRID */}
          {[-1, -0.5, 0.5, 1].map((fraction) => {
            const value = fraction * range;
            const gridY = y(value);

            return (
              <g key={fraction}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={gridY}
                  y2={gridY}
                  stroke="#334155"
                  strokeDasharray="4 6"
                />

                <text
                  x={left - 10}
                  y={gridY + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="12"
                >
                  {value.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* ZERO BASELINE */}
          <line
            x1={left}
            x2={width - right}
            y1={zeroY}
            y2={zeroY}
            stroke="#e2e8f0"
            strokeWidth="2"
          />

          <text
            x={left - 10}
            y={zeroY - 9}
            textAnchor="end"
            fill="#e2e8f0"
            fontSize="12"
          >
            ZERO
          </text>

          {/* CANDLES AND LIVE LINE */}
          <g clipPath="url(#highWeightageChartClip)">

            {/* 5-MINUTE OHLC CANDLES */}
            {visibleCandles.map((candle) => {
              const centerX = x(candle.minute);

              const color =
                candle.close >= candle.open
                  ? "#22c55e"
                  : "#ef4444";

              const bodyTop = Math.min(
                y(candle.open),
                y(candle.close)
              );

              const bodyHeight = Math.max(
                2,
                Math.abs(
                  y(candle.open) - y(candle.close)
                )
              );

              return (
                <g key={candle.minute}>
                  <line
                    x1={centerX}
                    x2={centerX}
                    y1={y(candle.high)}
                    y2={y(candle.low)}
                    stroke={color}
                    strokeWidth="2"
                  />

                  <rect
                    x={centerX - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={color}
                    rx="1"
                    opacity="0.9"
                  />
                </g>
              );
            })}

            {/* LIVE SCORE LINE */}
            {lineSegments.map((segment, index) => (
              <line
                key={index}
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
                stroke={
                  segment.positive
                    ? "#4ade80"
                    : "#f87171"
                }
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ))}

            {/* CURRENT LIVE MARKER */}
            {visiblePoints.length > 0 && (
              <circle
                cx={x(
                  visiblePoints[visiblePoints.length - 1].time
                )}
                cy={y(
                  visiblePoints[visiblePoints.length - 1].score
                )}
                r="5"
                fill={
                  visiblePoints[
                    visiblePoints.length - 1
                  ].score >= 0
                    ? "#22c55e"
                    : "#ef4444"
                }
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            )}

            {/* CROSSHAIR VERTICAL */}
            {hoverInfo && (
              <line
                x1={hoverInfo.x}
                x2={hoverInfo.x}
                y1={top}
                y2={height - bottom}
                stroke="#facc15"
                strokeWidth="1"
                strokeDasharray="5 4"
                pointerEvents="none"
              />
            )}

            {/* CROSSHAIR HORIZONTAL */}
            {hoverInfo && (
              <line
                x1={left}
                x2={width - right}
                y1={hoverInfo.y}
                y2={hoverInfo.y}
                stroke="#facc15"
                strokeWidth="1"
                strokeDasharray="5 4"
                pointerEvents="none"
              />
            )}

            {/* HOVER POINT */}
            {hoverInfo && (
              <circle
                cx={hoverInfo.x}
                cy={hoverInfo.y}
                r="5"
                fill="#facc15"
                stroke="#ffffff"
                strokeWidth="1.5"
                pointerEvents="none"
              />
            )}
          </g>

          {/* TIME LABELS */}
          {timeline.map((item, index) => (
            <text
              key={index}
              x={x(item.minute)}
              y={height - 12}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="12"
            >
              {item.label}
            </text>
          ))}
        </svg>

        {/* HOVER TOOLTIP */}
        {hoverInfo && (
          <div
            className="absolute z-20 pointer-events-none rounded-lg border border-slate-600 bg-slate-900/95 p-3 shadow-xl text-xs min-w-[165px]"
            style={{
              left: Math.max(
                4,
                Math.min(
                  hoverInfo.left + 14,
                  (svgRef.current?.parentElement?.clientWidth || 200) -
                    175
                )
              ),
              top: Math.max(8, hoverInfo.top - 115),
            }}
          >
            <div className="text-sky-300 font-semibold mb-2">
              {new Intl.DateTimeFormat("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              }).format(new Date(hoverInfo.time))}
            </div>

            <div
              className={`text-lg font-bold mb-2 ${
                hoverInfo.score >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {hoverInfo.score > 0 ? "+" : ""}
              {Number(hoverInfo.score).toFixed(2)} pts
            </div>

            {hoverInfo.candle && (
              <div className="space-y-1 border-t border-slate-700 pt-2">

                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">
                    Open
                  </span>
                  <span className="text-white">
                    {hoverInfo.candle.open.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">
                    High
                  </span>
                  <span className="text-green-400">
                    {hoverInfo.candle.high.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">
                    Low
                  </span>
                  <span className="text-red-400">
                    {hoverInfo.candle.low.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">
                    Close
                  </span>
                  <span className="text-white">
                    {hoverInfo.candle.close.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CHART HELP */}
      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500 mt-2">
        <span>
          Scroll = Zoom · Drag = Move left / right · Hover = Details
        </span>

        <span>
          Selected view:{" "}
          {Math.round(
            viewRange.end - viewRange.start
          )}{" "}
          minutes
        </span>
      </div>

      {/* CHART STATUS */}
      <div className="flex flex-wrap justify-between gap-2 text-xs mt-3">
        <span className="text-slate-400">
          {apiLoading
            ? "Loading historical data..."
            : `${historicalPoints.length} historical candles loaded`}
        </span>

        <span className="text-slate-500">
          {liveHistory.length} live observations saved
        </span>
      </div>

      {apiError && (
        <p className="text-xs text-red-400 mt-2">
          Historical data error: {apiError}
        </p>
      )}

      {/* TOP 7 CONTRIBUTIONS */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">
            TOP 7 STOCK CONTRIBUTIONS
          </h3>

          <span className="text-xs text-slate-500">
            Points contribution
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {topStocks.map((stock, index) => {
            const symbol = TOP_STOCKS[index];

            const value = stock
              ? Number(stock.pointsContribution || 0)
              : null;

            return (
              <div
                key={symbol}
                className="rounded-lg border border-slate-700 bg-slate-800/60 p-3"
              >
                <div className="text-xs text-slate-400 font-semibold">
                  {symbol}
                </div>

                <div
                  className={`text-sm font-bold mt-1 ${
                    value === null
                      ? "text-slate-500"
                      : value > 0
                        ? "text-green-400"
                        : value < 0
                          ? "text-red-400"
                          : "text-slate-300"
                  }`}
                >
                  {value === null
                    ? "--"
                    : `${value > 0 ? "+" : ""}${value.toFixed(2)}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-xs text-slate-500 mt-4">
        Historical candles: Zerodha 5-minute data. Live observations:
        existing dashboard score. Timeline: 09:15 AM – 03:30 PM IST.
      </div>
    </div>
  );
}
