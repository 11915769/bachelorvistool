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

export function cadenceVsStrideLength(container: HTMLElement, data: ChartData, highlightIndex: number | null = null): void {
  let currentX = "distance";

  const toggleButton = document.createElement("button");
  toggleButton.textContent = "Time";
  toggleButton.style.margin = "10px";


  function renderChart() {
    const timeData = data.Timestamp.map((_, index) => index / 60); // Convert indices to minutes

    const strideLengthLineData = data.Distance.map((_, index) => ({
      distance: data.Distance[index],
      time: timeData[index],
      strideLength: data.StrideLength[index] / 10,
      highlight: index === highlightIndex,
    }));

    const cadenceLineData = data.Distance.map((_, index) => ({
      distance: data.Distance[index],
      time: timeData[index],
      cadence: data.Cadence[index],
      highlight: index === highlightIndex,
    }));

    const powerLineData = data.Distance.map((_, index) => ({
      distance: data.Distance[index],
      time: timeData[index],
      power: data.Power[index],
      highlight: index === highlightIndex,
    }));

    const chart = Plot.plot({
      height: 300,
      x: {type: currentX === "time" ? "linear" : undefined, label: currentX === "time" ? "Time (minutes)" : "Distance"}, // Adjust label
      y: {axis: "left", grid: true, nice: true},
      marks: [
        Plot.lineY(strideLengthLineData, {x: currentX, y: "strideLength", stroke: "yellow"}),
        Plot.lineY(cadenceLineData, {x: currentX, y: "cadence", stroke: "blue"}),
        Plot.lineY(powerLineData, {x: currentX, y: "power", stroke: "green"}),
        Plot.ruleX(strideLengthLineData, Plot.pointerX({x: currentX, py: "strideLength", stroke: "red"})),
        Plot.dot(strideLengthLineData, Plot.pointerX({x: currentX, y: "strideLength", stroke: "red"})),
        Plot.dot(cadenceLineData, Plot.pointerX({x: currentX, y: "cadence", stroke: "red"})),
        Plot.dot(powerLineData, Plot.pointerX({x: currentX, y: "power", stroke: "red"})),
        Plot.ruleX(
          strideLengthLineData.filter(d => d.highlight), // Only highlight the hovered point
          {x: "distance", y: "strideLength", fill: "red", stroke: "red"}
        ),
        Plot.ruleX(
          cadenceLineData.filter(d => d.highlight), // Only highlight the hovered point
          {x: "distance", y: "cadence", fill: "red", stroke: "red"}
        ),
        Plot.ruleX(
          powerLineData.filter(d => d.highlight), // Only highlight the hovered point
          {x: "distance", y: "power", fill: "red", stroke: "red"}
        ),
        Plot.dot(
          strideLengthLineData.filter(d => d.highlight), // Only highlight the hovered point
          {x: "distance", y: "strideLength", fill: "red", stroke: "red"}
        ),
        Plot.dot(
          cadenceLineData.filter(d => d.highlight), // Only highlight the hovered point
          {x: "distance", y: "cadence", fill: "red", stroke: "red"}
        ),
        Plot.dot(
          powerLineData.filter(d => d.highlight), // Only highlight the hovered point
          {x: "distance", y: "power", fill: "red", stroke: "red"}
        ),
        Plot.text(strideLengthLineData, Plot.pointerX({
          px: currentX,
          py: "strideLength",
          dy: -17,
          frameAnchor: "top-left",
          fontVariant: "tabular-nums",
          text: (d, i) => [
            `${currentX}: ${currentX === "time" ? d[currentX].toFixed(2) : d[currentX].toFixed(2)}`,
            `strideLength: ${(d.strideLength * 10)} mm`,
            `cadence: ${cadenceLineData[i]?.cadence}`,
            `power: ${powerLineData[i]?.power}`,
          ].join("   ")
        })),
      ]
    });

    const chartContainer = document.createElement("div");
    chartContainer.id = "chart-container";
    container.innerHTML = "";
    chartContainer.appendChild(chart);
    container.appendChild(chartContainer);

  }

  toggleButton.onclick = () => {
    currentX = currentX === "distance" ? "time" : "distance";
    toggleButton.textContent = currentX === "distance" ? "Time" : "Distance";
    renderChart();
  };

  renderChart();
}
