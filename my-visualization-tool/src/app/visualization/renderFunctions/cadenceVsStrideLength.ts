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

export function cadenceVsStrideLength(
  container: HTMLElement,
  data: ChartData,
  highlightIndex: number | null = null,
  cadence: boolean,
  strideLength: boolean,
  pace: boolean,
  power: boolean,
  heartRate: boolean,
  smoothness: number,
  onHover?: (index: number | null) => void,
): void {
  let currentX = "distance";

  const toggleButton = document.createElement("button");
  toggleButton.textContent = "Time";
  toggleButton.style.margin = "10px";


  function renderChart() {
    const timeData = data.Timestamp.map((_, index) => index / 60);

    const strideLengthLineData = data.Distance.map((_, index) => ({
      distance: data.Distance[index],
      time: timeData[index],
      strideLength: data.StrideLength[index] / 10,
      highlight: index === highlightIndex,
      index: index,
    }));

    const cadenceLineData = data.Distance.map((_, index) => ({
      distance: data.Distance[index],
      time: timeData[index],
      cadence: data.Cadence[index],
      highlight: index === highlightIndex,
      index: index,

    }));

    const powerLineData = data.Distance.map((_, index) => ({
      distance: data.Distance[index],
      time: timeData[index],
      power: data.Power[index],
      highlight: index === highlightIndex,
      index: index,

    }));

    const paceLineData = data.Distance.map((_, index) => ({
      distance: data.Distance[index],
      time: timeData[index],
      pace: data.Pace[index] * 10,
      highlight: index === highlightIndex,
      index: index,

    }));

    const heartRateLineData = data.Distance.map((_, index) => ({
      distance: data.Distance[index],
      time: timeData[index],
      heartRate: data.HeartRate[index],
      highlight: index === highlightIndex,
      index: index,

    }));

    const smoothedStrideLengthData = movingAverage(strideLengthLineData, "strideLength", smoothness);
    const smoothedCadenceData = movingAverage(cadenceLineData, "cadence", smoothness);
    const smoothedPowerData = movingAverage(powerLineData, "power", smoothness);
    const smoothedPaceData = movingAverage(paceLineData, "pace", smoothness);
    const smoothedHeartRateData = movingAverage(heartRateLineData, "heartRate", smoothness);


    const chart = Plot.plot({
      height: 300,
      x: {type: currentX === "time" ? "linear" : undefined, label: currentX === "time" ? "Time (minutes)" : "Distance"}, // Adjust label
      y: {axis: "left", grid: true, nice: true, domain: [0, getMaxValue(data, {cadence, strideLength, pace, power, heartRate})]},
      marks: [
        strideLength ? Plot.lineY(smoothedStrideLengthData, {x: currentX, y: "strideLength", stroke: "#a900ff"}) : null,
        cadence ? Plot.lineY(smoothedCadenceData, {x: currentX, y: "cadence", stroke: "blue"}) : null,
        power ? Plot.lineY(smoothedPowerData, {x: currentX, y: "power", stroke: "darkBlue"}) : null,
        pace ? Plot.lineY(smoothedPaceData, {x: currentX, y: "pace", stroke: "green"}) : null,
        heartRate ? Plot.lineY(smoothedHeartRateData, {x: currentX, y: "heartRate", stroke: "red"}) : null,
        Plot.ruleX(strideLengthLineData, Plot.pointerX({x: currentX, py: "strideLength", stroke: "black"})),
        strideLength ? Plot.dot(smoothedStrideLengthData, Plot.pointerX({
          x: currentX,
          y: "strideLength",
          stroke: "red"
        })) : null,
        cadence ? Plot.dot(smoothedCadenceData, Plot.pointerX({x: currentX, y: "cadence", stroke: "red"})) : null,
        power ? Plot.dot(smoothedPowerData, Plot.pointerX({x: currentX, y: "power", stroke: "red"})) : null,
        pace ? Plot.dot(smoothedPaceData, Plot.pointerX({x: currentX, y: "pace", stroke: "red"})) : null,
        heartRate ? Plot.dot(smoothedHeartRateData, Plot.pointerX({x: currentX, y: "heartRate", stroke: "red"})) : null,
        Plot.ruleX(
          smoothedStrideLengthData.filter(d => d.highlight),
          {x: "distance", y: getMaxValue(data, {cadence, strideLength, pace, power, heartRate}), stroke: "black"}
        ),
        strideLength ? Plot.dot(
          smoothedStrideLengthData.filter(d => d.highlight),
          {x: "distance", y: "strideLength", stroke: "black"}
        ) : null,
        cadence ? Plot.dot(
          smoothedCadenceData.filter(d => d.highlight),
          {x: "distance", y: "cadence", stroke: "black"}
        ) : null,
        power ? Plot.dot(
          smoothedPowerData.filter(d => d.highlight),
          {x: "distance", y: "power", stroke: "black"}
        ) : null,
        pace ? Plot.dot(
          smoothedPaceData.filter(d => d.highlight),
          {x: "distance", y: "pace", stroke: "black"}
        ) : null,
        heartRate ? Plot.dot(
          smoothedHeartRateData.filter(d => d.highlight),
          {x: "distance", y: "heartRate", stroke: "black"}
        ) : null,
        Plot.text(smoothedStrideLengthData, Plot.pointerX({
          px: currentX,
          py: "strideLength",
          dy: -17,
          frameAnchor: "top-left",
          fontVariant: "tabular-nums",
          text: (d, i) => [
            `${currentX}: ${currentX === "time" ? d[currentX].toFixed(2) : d[currentX].toFixed(2)} km`,
            strideLength ? `strideLength: ${(d.strideLength * 10).toFixed(0)} mm` : null,
            cadence ? `cadence: ${smoothedCadenceData[i]?.cadence.toFixed(0)} SPM` : null,
            power ? `power: ${smoothedPowerData[i]?.power.toFixed(0)} W` : null,
            pace ? `pace: ${formatPace(smoothedPaceData[i]?.pace / 10)} min/km` : null,
            heartRate ? `heartRate: ${smoothedHeartRateData[i]?.heartRate.toFixed(0)} BPM` : null,
          ].join("   ")
        })),
        Plot.text(
          strideLengthLineData.filter(d => d.highlight),
          Plot.pointerX({
            px: currentX,
            py: "strideLength",
            dy: -17,
            frameAnchor: "top-left",
            fontVariant: "tabular-nums",
            text: (d, i) => [
              `${currentX}: ${currentX === "time" ? d[currentX].toFixed(2) : d[currentX].toFixed(2)} km`,
              strideLength ? `strideLength: ${(d.strideLength * 10)} mm` : null,
              cadence ? `cadence: ${cadenceLineData[i]?.cadence} SPM` : null,
              power ? `power: ${powerLineData[i]?.power} W` : null,
              pace ? `pace: ${formatPace(paceLineData[i]?.pace / 10)} min/km` : null,
              heartRate ? `heartRate: ${heartRateLineData[i]?.heartRate} BPM` : null,
            ].join("   ")
          })
        )

      ]
    });


    const chartContainer = document.createElement("div");
    chartContainer.id = "chart-container";
    container.innerHTML = "";
    chartContainer.appendChild(chart);
    container.appendChild(chartContainer);

    setTimeout(() => {
      const svg = container.querySelector("svg");
      if (!svg) return;

      svg.addEventListener("mousemove", (event) => {
        const rect = svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;

        if (strideLengthLineData.length === 0) return;

        const minX = Math.min(...strideLengthLineData.map(d => d.distance));
        const maxX = Math.max(...strideLengthLineData.map(d => d.distance));

        const scaledX = minX + (mouseX / rect.width) * (maxX - minX);

        let closestIndex = strideLengthLineData.reduce((closest, d, i) => {
          return Math.abs(d.distance - scaledX) < Math.abs(strideLengthLineData[closest].distance - scaledX) ? i : closest;
        }, 0);
        if (onHover) onHover(closestIndex);
      });


      svg.addEventListener("mouseleave", () => {
        if (onHover) onHover(null);
      });
    }, 100);
  }

  renderChart();
}

function formatPace(pace: number): string {
  if (pace === null || pace === undefined) return ""; // Handle empty cases

  const minutes = Math.floor(pace); // Extract whole minutes
  const decimalSeconds = pace - minutes; // Extract the decimal part
  const seconds = Math.round(decimalSeconds * 60); // Convert decimal to seconds

  if (seconds >= 60) {
    return `${minutes + 1}:00`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getMaxValue(data: ChartData, options: {
  cadence?: boolean,
  strideLength?: boolean,
  pace?: boolean,
  power?: boolean,
  heartRate?: boolean
}): number | null {
  let maxValue: number | null = null;

  function extractMax(arr: number[] | undefined, scale: number = 1): number | null {
    return arr && arr.length ? Math.max(...arr) / scale : null;
  }

  let values: number[] = [];

  if (options.cadence) values.push(extractMax(data.Cadence) ?? 0);
  if (options.strideLength) values.push(extractMax(data.StrideLength, 10) ?? 0);
  if (options.pace) values.push(extractMax(data.Pace, 0.1) ?? 0);
  if (options.power) values.push(extractMax(data.Power) ?? 0);
  if (options.heartRate) values.push(extractMax(data.HeartRate) ?? 0);

  if (values.length) {
    maxValue = Math.max(...values);
  }
  return maxValue !== null ? roundToNext50(maxValue) : maxValue;
}

function roundToNext50(value: number): number {
  return Math.ceil(value / 50) * 50 + (value % 50 === 0 ? 50 : 0);
}

function movingAverage<T extends Record<string, any>>(
  data: T[],
  field: keyof T,
  windowSize: number
): T[] {
  return data.map((d, i, arr) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(arr.length, i + Math.floor(windowSize / 2) + 1);
    const subset = arr.slice(start, end);

    const smoothedValue = subset.reduce((sum, point) => sum + (point[field] ?? 0), 0) / subset.length;

    return {...d, [field]: smoothedValue};
  });
}






