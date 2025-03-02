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

    const maxYValue = getMaxValue(
      {
        cadence: smoothedCadenceData,
        strideLength: smoothedStrideLengthData,
        pace: smoothedPaceData,
        power: smoothedPowerData,
        heartRate: smoothedHeartRateData
      },
      {cadence, strideLength, pace, power, heartRate}
    );


    const chart = Plot.plot({
      height: 350,
      x: {type: currentX === "time" ? "linear" : undefined, label: currentX === "time" ? "Time (minutes)" : "Distance"},
      y: {axis: true, grid: true, nice: true, domain: [0, maxYValue]},
      marginLeft: 4,
      marginRight: 4,
      marks: [
        strideLength ? Plot.lineY(smoothedStrideLengthData, {x: currentX, y: "strideLength", stroke: "#007BFF"}) : null,
        cadence ? Plot.lineY(smoothedCadenceData, {x: currentX, y: "cadence", stroke: "#FF6600"}) : null,
        power ? Plot.lineY(smoothedPowerData, {x: currentX, y: "power", stroke: "#28A745"}) : null,
        pace ? Plot.lineY(smoothedPaceData, {x: currentX, y: "pace", stroke: "#A900FF"}) : null,
        heartRate ? Plot.lineY(smoothedHeartRateData, {
          x: currentX, y: function (d) {
            return d.heartRate * 1.5
          },
          stroke: "#DC3545"
        }) : null,
        Plot.ruleX(strideLengthLineData, Plot.pointerX({x: currentX, py: "strideLength", stroke: "black"})),
        strideLength ? Plot.dot(smoothedStrideLengthData, Plot.pointerX({
          x: currentX,
          y: "strideLength",
          stroke: "red"
        })) : null,
        cadence ? Plot.dot(smoothedCadenceData, Plot.pointerX({x: currentX, y: "cadence", stroke: "red"})) : null,
        power ? Plot.dot(smoothedPowerData, Plot.pointerX({x: currentX, y: "power", stroke: "red"})) : null,
        pace ? Plot.dot(smoothedPaceData, Plot.pointerX({x: currentX, y: "pace", stroke: "red"})) : null,
        heartRate ? Plot.dot(smoothedHeartRateData, Plot.pointerX({
          x: currentX, y: function (d: { heartRate: number; }) {
            return d.heartRate * 1.5
          }, stroke: "red"
        })) : null,
        Plot.ruleX(
          smoothedStrideLengthData.filter(d => d.highlight),
          {x: "distance", y: maxYValue, stroke: "black"}
        ),
        strideLength ? Plot.dot(
          smoothedStrideLengthData.filter(d => d.highlight),
          {x: "distance", y: "strideLength", stroke: "red"}
        ) : null,
        cadence ? Plot.dot(
          smoothedCadenceData.filter(d => d.highlight),
          {x: "distance", y: "cadence", stroke: "red"}
        ) : null,
        power ? Plot.dot(
          smoothedPowerData.filter(d => d.highlight),
          {x: "distance", y: "power", stroke: "red"}
        ) : null,
        pace ? Plot.dot(
          smoothedPaceData.filter(d => d.highlight),
          {x: "distance", y: "pace", stroke: "red"}
        ) : null,
        heartRate ? Plot.dot(
          smoothedHeartRateData.filter(d => d.highlight),
          {
            x: "distance", y: function (d) {
              return d.heartRate * 1.5
            }, stroke: "red"
          }
        ) : null,
        Plot.text(smoothedStrideLengthData, Plot.pointerX({
          name: "text01",
          px: currentX,
          py: "strideLength",
          dy: -17,
          frameAnchor: "top-left",
          fontVariant: "tabular-nums",
          text: (d, i) => [
            `${currentX}: ${currentX === "time" ? d[currentX].toFixed(2) : d[currentX].toFixed(2)} km`,
            strideLength ? `🟦strideLength: ${(d.strideLength * 10).toFixed(0)} mm` : null,
            cadence ? `🟧cadence: ${smoothedCadenceData[i]?.cadence.toFixed(0)} SPM` : null,
            power ? `🟩power: ${smoothedPowerData[i]?.power.toFixed(0)} W` : null,
            pace ? `🟪pace: ${formatPace(smoothedPaceData[i]?.pace / 10)} min/km` : null,
            heartRate ? `🟥heartRate: ${smoothedHeartRateData[i]?.heartRate.toFixed(0)} BPM` : null,
          ].join("   ")
        })),
        Plot.text(
          smoothedStrideLengthData,
          {
            x: (d) => d.highlight ? 0.1 : null,
            y: (d) => d.highlight ? maxYValue : null,
            dy: -17,
            frameAnchor: "top-left",
            fontVariant: "tabular-nums",
            text: (d) => {
              if (!d.highlight) return null;
              const i = smoothedStrideLengthData.findIndex(item => item.index === d.index);
              return [
                `${currentX}: ${currentX === "time" ? d[currentX].toFixed(2) : d[currentX].toFixed(2)} km`,
                strideLength ? `🟦 strideLength: ${(d.strideLength * 10).toFixed(0)} mm` : null,
                cadence ? `🟧 cadence: ${smoothedCadenceData[i]?.cadence.toFixed(0)} SPM` : null,
                power ? `🟩 power: ${smoothedPowerData[i]?.power.toFixed(0)} W` : null,
                pace ? `🟪 pace: ${formatPace(smoothedPaceData[i]?.pace / 10)} min/km` : null,
                heartRate ? `🟥 heartRate: ${smoothedHeartRateData[i]?.heartRate.toFixed(0)} BPM` : null,
              ].filter(Boolean).join("   ");
            }
          }
        )

      ]
    });


    const chartContainer = document.createElement("div");
    chartContainer.id = "chart-container";
    container.innerHTML = "";
    chartContainer.appendChild(chart);
    chartContainer.style.display = "flex";
    chartContainer.style.justifyContent = "center";
    chartContainer.style.backgroundColor = "#3b4c5a";
    chartContainer.style.borderRadius = "15px";
    chartContainer.style.padding = "25px";
    chartContainer.style.color = "#ffffff";
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
  if (pace === null || pace === undefined) return "";

  const minutes = Math.floor(pace);
  const decimalSeconds = pace - minutes;
  const seconds = Math.round(decimalSeconds * 60);

  if (seconds >= 60) {
    return `${minutes + 1}:00`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getMaxValue(smoothedData: {
  cadence?: any[],
  strideLength?: any[],
  pace?: any[],
  power?: any[],
  heartRate?: any[]
}, options: {
  cadence?: boolean,
  strideLength?: boolean,
  pace?: boolean,
  power?: boolean,
  heartRate?: boolean
}): number | null {
  let maxValue: number | null = null;

  function extractMax(arr: any[] | undefined, field: string, scale: number = 1): number | null {
    return arr && arr.length ? Math.max(...arr.map(d => d[field] ?? 0)) / scale : null;
  }

  let values: number[] = [];

  if (options.cadence) values.push(extractMax(smoothedData.cadence, "cadence") ?? 0);
  if (options.strideLength) values.push(extractMax(smoothedData.strideLength, "strideLength") ?? 0);
  if (options.pace) values.push(extractMax(smoothedData.pace, "pace") ?? 0);
  if (options.power) values.push(extractMax(smoothedData.power, "power") ?? 0);
  if (options.heartRate) values.push(extractMax(smoothedData.heartRate, "heartRate", 0.75) ?? 0);

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






