'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
} from 'lightweight-charts'
import type { HistoricalBar } from '@/lib/polygon/types'
import type { FibLevel } from '@/lib/analysis/fibonacci'

interface StockChartProps {
  bars: HistoricalBar[]
  sma50?: number[]
  sma200?: number[]
  fibLevels?: FibLevel[]
  height?: number
}

const COLORS = {
  bg: '#0a0a0a',
  text: '#a1a1aa',
  grid: '#27272a',
  border: '#27272a',
  sma50: '#3b82f6',
  sma200: '#f97316',
}

const FIB_COLORS: Record<number, string> = {
  0:     'rgba(255,255,255,0.15)',
  0.236: 'rgba(168,85,247,0.5)',
  0.382: 'rgba(59,130,246,0.5)',
  0.5:   'rgba(234,179,8,0.5)',
  0.618: 'rgba(16,185,129,0.7)',
  0.786: 'rgba(239,68,68,0.5)',
  1.0:   'rgba(255,255,255,0.15)',
}

export function StockChart({ bars, sma50, sma200, fibLevels, height = 420 }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  const initChart = useCallback(() => {
    if (!containerRef.current || bars.length === 0) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor: COLORS.text,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: { borderColor: COLORS.border, timeVisible: true },
    })
    chartRef.current = chart

    // Candlestick series — v4 API: addSeries(CandlestickSeries, options)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      borderVisible: false,
    })
    candleSeries.setData(bars as unknown as Parameters<typeof candleSeries.setData>[0])

    // SMA-50
    if (sma50 && sma50.length === bars.length) {
      const sma50Series = chart.addSeries(LineSeries, {
        color: COLORS.sma50,
        lineWidth: 1,
        title: 'SMA 50',
        priceLineVisible: false,
        lastValueVisible: true,
      })
      const data = bars
        .map((b, i) => ({ time: b.time as number, value: sma50[i] }))
        .filter(d => !isNaN(d.value))
      sma50Series.setData(data as Parameters<typeof sma50Series.setData>[0])
    }

    // SMA-200
    if (sma200 && sma200.length === bars.length) {
      const sma200Series = chart.addSeries(LineSeries, {
        color: COLORS.sma200,
        lineWidth: 1,
        title: 'SMA 200',
        priceLineVisible: false,
        lastValueVisible: true,
      })
      const data = bars
        .map((b, i) => ({ time: b.time as number, value: sma200[i] }))
        .filter(d => !isNaN(d.value))
      sma200Series.setData(data as Parameters<typeof sma200Series.setData>[0])
    }

    // Fibonacci levels as price lines on the candlestick series
    if (fibLevels) {
      for (const level of fibLevels) {
        candleSeries.createPriceLine({
          price: level.price,
          color: FIB_COLORS[level.ratio] ?? 'rgba(255,255,255,0.3)',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `Fib ${level.label}`,
        })
      }
    }

    chart.timeScale().fitContent()

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [bars, sma50, sma200, fibLevels, height])

  useEffect(() => {
    const cleanup = initChart()
    return cleanup
  }, [initChart])

  return <div ref={containerRef} className="w-full rounded-lg overflow-hidden" style={{ height }} />
}
