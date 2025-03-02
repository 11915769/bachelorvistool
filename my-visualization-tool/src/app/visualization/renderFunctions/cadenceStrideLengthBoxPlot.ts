import * as Plot from "@observablehq/plot";

interface ChartData {
  Distance: number[];
  StrideLength: number[];
  Cadence: number[];
}

export function cadenceStrideLengthBoxPlot(container: HTMLElement, data: ChartData): void {
  function computeIQR(values: number[]): { min: number; max: number } {
    const sorted = values.filter(v => !isNaN(v)).sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.05)];
    const q3 = sorted[Math.floor(sorted.length * 0.95)];
    const iqr = q3 - q1;
    return { min: q1 - 1.5 * iqr, max: q3 + 1.5 * iqr };
  }

  const iqrCadence = computeIQR(data.Cadence);
  const iqrStride = computeIQR(data.StrideLength);

  const filteredData = data.Distance.map((distance, index) => ({
    distance: distance,
    cadence: data.Cadence[index],
    strideLength: data.StrideLength[index]
  })).filter(d =>
    d.cadence >= iqrCadence.min && d.cadence <= iqrCadence.max &&
    d.strideLength >= iqrStride.min && d.strideLength <= iqrStride.max
  );

  const cadenceData = filteredData.map(d => ({
    distance: d.distance + 1,
    cadence: d.cadence
  }));

  const strideLengthData = filteredData.map(d => ({
    distance: d.distance + 1,
    strideLength: d.strideLength
  }));

  const cadenceChart = Plot.plot({
    marginLeft: 60,
    y: {
      grid: true,
      label: "↑ Cadence",
      domain: [Math.min(...cadenceData.map(d => d.cadence)), Math.max(...cadenceData.map(d => d.cadence))]
    },
    fx: {
      label: "Distance (km) →",
      interval: 1,
      labelAnchor: "right",
      tickFormat: (x) => x.toFixed(0)
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
      label: "Distance (km) →",
      interval: 1,
      labelAnchor: "right",
      tickFormat: (x) => x.toFixed(0)
    },
    marks: [
      Plot.ruleY([0]),
      Plot.boxY(strideLengthData, {fx: "distance", y: "strideLength", tip: true})
    ],
  });

  container.innerHTML = "";
  const cadenceDiv = document.createElement("div");
  const strideLengthDiv = document.createElement("div");

  cadenceDiv.style.marginBottom = "20px";

  cadenceDiv.appendChild(cadenceChart);
  strideLengthDiv.appendChild(strideLengthChart);

  container.appendChild(cadenceDiv);
  container.appendChild(strideLengthDiv);
}
