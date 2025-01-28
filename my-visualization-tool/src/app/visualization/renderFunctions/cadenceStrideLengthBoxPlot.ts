import * as Plot from "@observablehq/plot";

interface ChartData {
  Distance: number[];
  StrideLength: number[];
  Cadence: number[];
}

export function cadenceStrideLengthBoxPlot(container: HTMLElement, data: ChartData): void {
  function filterByDeviation(data: number[], threshold: number): number[] {
    const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
    return data.filter((value) => Math.abs(value - avg) <= threshold);
  }

  const filteredCadence = filterByDeviation(data.Cadence, 25);
  const filteredStrideLength = filterByDeviation(data.StrideLength, 300);


  const cadenceData = data.Distance.map((distance, index) => ({
    distance,
    cadence: filteredCadence[index] ?? null,
  })).filter((d) => d.cadence !== null);

  const strideLengthData = data.Distance.map((distance, index) => ({
    distance,
    strideLength: filteredStrideLength[index] ?? null,
  })).filter((d) => d.strideLength !== null);

  const cadenceChart = Plot.plot({
    marginLeft: 60,
    y: {
      grid: true,
      label: "↑ Cadence",
      domain: [Math.min(...cadenceData.map(d => d.cadence)), Math.max(...cadenceData.map(d => d.cadence))]
    },
    fx: {
      label: "Distance →",
      interval: 1,
      labelAnchor: "right",
      tickFormat: (x) => x.toFixed(1)
    },
    marks: [
      Plot.ruleY([0]),
      Plot.boxY(cadenceData, {fx: "distance", y: "cadence", tip: true})
    ],
  });

  const strideLengthChart = Plot.plot({
    marginLeft: 60,
    y: {
      grid: true,
      label: "↑ Stride Length",
      domain: [Math.min(...strideLengthData.map(d => d.strideLength)), Math.max(...strideLengthData.map(d => d.strideLength))]
    },
    fx: {
      label: "Distance →",
      interval: 1,
      labelAnchor: "right",
      tickFormat: (x) => x.toFixed(1)
    },
    marks: [
      Plot.ruleY([0]),
      Plot.boxY(strideLengthData, {fx: "distance", y: "strideLength"})
    ],
  });

  // Clear existing container content and append charts
  container.innerHTML = "";
  const cadenceDiv = document.createElement("div");
  const strideLengthDiv = document.createElement("div");

  cadenceDiv.style.marginBottom = "20px"; // Add spacing between charts

  cadenceDiv.appendChild(cadenceChart);
  strideLengthDiv.appendChild(strideLengthChart);

  container.appendChild(cadenceDiv);
  container.appendChild(strideLengthDiv);
}
