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

export function renderFiveGraphs(
  container: HTMLElement | null,
  data: ChartData,
  smoothness: number,
  highlightIndex: number | null = null,
  onHover?: (index: number | null) => void
): void {
  if (!container) return;

  const createDataSet = (field: keyof ChartData, scale: number = 1) =>
    data.Distance.map((_, index) => ({
      distance: data.Distance[index],
      [field]: (data[field] as number[])[index] * scale,
      highlight: index === highlightIndex,
      index: index,
    }));

  const strideLengthData = createDataSet("StrideLength");
  const cadenceData = createDataSet("Cadence");
  const powerData = createDataSet("Power");
  const paceData = createDataSet("Pace");
  const heartRateData = createDataSet("HeartRate");

  const smoothedDataSets = {
    strideLength: movingAverage(strideLengthData, "StrideLength", smoothness),
    cadence: movingAverage(cadenceData, "Cadence", smoothness),
    power: movingAverage(powerData, "Power", smoothness),
    pace: movingAverage(paceData, "Pace", smoothness),
    heartRate: movingAverage(heartRateData, "HeartRate", smoothness),
  };

  function createChart(data: any[], yField: string, yLabel: string, color: string) {
    return Plot.plot({
      height: 150,
      x: {label: "Distance (km)", grid: true},
      y: {label: yLabel, grid: true, nice: true},
      marks: [
        Plot.lineY(data, {
            x: "distance", y: yField, stroke: color, strokeWidth: 2,
            tip: {
              format: {
                x: (d) => d.toFixed(2),
                y: yField === "Pace" ? (d) => formatPace(d) : (d) => d.toFixed(0)
              },
              fill: "#465a6a",
              stroke: "#ffffff",
            }
          }
        ),
        Plot.ruleX(data.filter(d => d.highlight), {x: "distance", stroke: "black"}),
        Plot.dot(data.filter(d => d.highlight), {x: "distance", y: yField, fill: "red", r: 4}),
        Plot.ruleX(data, Plot.pointerX({x: "distance", py: yField, stroke: "black"})),
        Plot.dot(data, Plot.pointerX({x: "distance", y: yField, stroke: "red"})),
      ],
    });
  }

  const charts = [
    {data: smoothedDataSets.cadence, field: "Cadence", label: "Cadence (SPM)", color: "#FF6600"},
    {data: smoothedDataSets.strideLength, field: "StrideLength", label: "Stride Length (mm)", color: "#007BFF"},
    {data: smoothedDataSets.power, field: "Power", label: "Power (W)", color: "#28A745"},
    {data: smoothedDataSets.pace, field: "Pace", label: "Pace (min/km)", color: "#A900FF"},
    {data: smoothedDataSets.heartRate, field: "HeartRate", label: "Heart Rate (BPM)", color: "#DC3545"}
  ];

  container.innerHTML = "";
  const chartsContainer = document.createElement("div");
  chartsContainer.style.display = "grid";
  chartsContainer.style.gridTemplateColumns = "repeat(2, 1fr)";
  chartsContainer.style.columnGap = "30px";
  chartsContainer.style.rowGap = "20px";
  chartsContainer.style.justifyContent = "center";
  chartsContainer.style.alignItems = "center";
  chartsContainer.style.marginBottom = "100px";

  charts.forEach(({data, field, label, color}, index) => {
    const chart = createChart(data, field, label, color);
    const wrapper = document.createElement("div");

    wrapper.style.display = "flex";
    wrapper.style.justifyContent = "center";
    wrapper.style.alignItems = "center";

    if (index === charts.length - 1) {
      wrapper.style.gridColumn = "1 / span 2";
      wrapper.style.margin = "0 auto";
      wrapper.style.width = "50%";
    }

    wrapper.appendChild(chart);
    wrapper.style.backgroundColor = "#3b4c5a";
    wrapper.style.borderRadius = "15px";
    wrapper.style.padding = "10px";
    wrapper.style.color = "#ffffff";

    chartsContainer.appendChild(wrapper);
  });

  container.appendChild(chartsContainer);

  setTimeout(() => {
    const svgs = container.querySelectorAll("svg");

    svgs.forEach((svg) => {
      svg.addEventListener("mousemove", (event) => {
        const rect = svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;

        let closestIndex: number | null = null;
        let minDistance = Infinity;

        Object.values(smoothedDataSets).forEach((dataset) => {
          dataset.forEach((d, i) => {
            const distDiff = Math.abs(d.distance - (data.Distance[0] + (mouseX / rect.width) * (data.Distance[data.Distance.length - 1] - data.Distance[0])));
            if (distDiff < minDistance) {
              minDistance = distDiff;
              closestIndex = i;
            }
          });
        });

        if (closestIndex !== null && onHover) {
          onHover(closestIndex);
        }
      });

      svg.addEventListener("mouseleave", () => {
        if (onHover) onHover(null);
      });
    });
  }, 100);
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

function formatPace(pace: number): string {
  if (pace === null || pace === undefined) return "";

  let minutes = Math.floor(pace);
  let seconds = Math.round((pace - minutes) * 60);

  if (seconds === 60) {
    minutes += 1;
    seconds = 0;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

