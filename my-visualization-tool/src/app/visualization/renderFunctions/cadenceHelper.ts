import * as Plot from "@observablehq/plot";

interface ChartData {
  Distance: number[];
  Timestamp: string[];
  StrideLength: number[];
  Cadence: number[];
  Pace: number[];
  Power: number[];
  HeartRate: number[];
}

export function cadenceHelper(container: HTMLElement, data: ChartData): void {
  let currentX = "distance";
  const timeData = data.Timestamp.map((_, index) => index / 60);

  const avgCadence = data.Cadence.length
    ? data.Cadence.reduce((sum, val) => sum + val, 0) / data.Cadence.length
    : 0;

  const threshold = 0.15;
  const minThreshold = avgCadence * (1 - threshold);
  const maxThreshold = avgCadence * (1 + threshold);

  const filteredCadenceData = data.Distance
    .map((_, index) => ({
      distance: data.Distance[index],
      time: timeData[index],
      cadence: data.Cadence[index],
    }))
    .filter(d => d.cadence >= minThreshold && d.cadence <= maxThreshold); // ✅ Filtering out extreme values

  function movingAverage(data: { cadence: number }[], windowSize: number = 5): { cadence: number }[] {
    return data.map((d, i, arr) => {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(arr.length, i + Math.floor(windowSize / 2) + 1);
      const subset = arr.slice(start, end);
      const smoothedCadence = subset.reduce((sum, point) => sum + point.cadence, 0) / subset.length;
      return {...d, cadence: smoothedCadence};
    });
  }

  const smoothedCadenceData = movingAverage(filteredCadenceData, 10);

  const targetMin = avgCadence * 1.05;
  const targetMax = avgCadence * 1.10;

  const targetRangeData = data.Distance.map((_, index) => ({
    distance: data.Distance[index],
    time: timeData[index],
    minCadence: targetMin,
    maxCadence: targetMax,
  }));

  const chart = Plot.plot({
    height: 300,
    x: {label: currentX === "time" ? "Time (minutes)" : "Distance", grid: true},
    y: {axis: "left", grid: true, nice: true, label: "Cadence (SPM)"},
    marks: [
      Plot.areaY(targetRangeData, {
        x: currentX,
        y1: "minCadence",
        y2: "maxCadence",
        fillOpacity: 0.3,
        stroke: "green",
        fill: "green",
      }),

      Plot.lineY(smoothedCadenceData, {
        x: currentX,
        y: "cadence",
        stroke: "blue",
        strokeWidth: 2
      }),

      Plot.ruleY([avgCadence], {
        stroke: "black", strokeWidth: 2, strokeDasharray: "4 4"
      }),

    ],
    color: {
      legend: true,
      domain: ["Cadence", "Target Range 5%-10%", "Average Cadence"],
      range: ["blue", "green", "black"]
    }
  });

  container.innerHTML = "";
  container.appendChild(chart);
}
