import * as Plot from "@observablehq/plot";

interface ChartData {
  filename: string;
  data: {
    Cadence: number[],
    Pace: number[],
    StrideLength: number[],
    HeartRate: number[],
    Power: number[],
    Distance: number[],
    Elevation: number[],
    Timestamp: string[];
  };
}

export function cadenceHelper(container: HTMLElement, runs: ChartData[]): void {
  if (!Array.isArray(runs) || runs.length < 2) {
    console.error("Error: runs is not a valid array with two elements", runs);
    return;
  }

  runs.sort((a, b) => {
    const avgCadenceA = a.data.Cadence.length
      ? a.data.Cadence.reduce((sum, val) => sum + val, 0) / a.data.Cadence.length
      : 0;

    const avgCadenceB = b.data.Cadence.length
      ? b.data.Cadence.reduce((sum, val) => sum + val, 0) / b.data.Cadence.length
      : 0;

    console.log("runs sorted by average Cadence");
    return avgCadenceA - avgCadenceB;
  });


  const firstRun = runs[0];
  const secondRun = runs[1];

  let currentX = "distance";
  const timeData = firstRun.data.Timestamp.map((_, index) => index / 60);

  const validCadenceDataFirstRun = firstRun.data.Cadence.filter(val => val > 20);
  const avgCadenceFirstRun = validCadenceDataFirstRun.length
    ? validCadenceDataFirstRun.reduce((sum, val) => sum + val, 0) / validCadenceDataFirstRun.length
    : 0;

  const validCadenceDataSecondRun = secondRun.data.Cadence.filter(val => val > 20);
  const avgCadenceSecondRun = validCadenceDataSecondRun.length
    ? validCadenceDataSecondRun.reduce((sum, val) => sum + val, 0) / validCadenceDataSecondRun.length
    : 0;

  let targetMin = avgCadenceFirstRun * 1.05;
  let targetMax = targetMin * 1.05;


  const initialUpperBoundary = 75;
  const initialLowerBoundary = 25;

  let upperQuantile = initialUpperBoundary / 100;
  let lowerQuantile = initialLowerBoundary / 100;

  const threshold = 0.15;
  const minThreshold = avgCadenceFirstRun * (1 - threshold);
  const maxThreshold = avgCadenceFirstRun * (1 + threshold);

  const filteredCadenceDataFirst = firstRun.data.Distance
    .map((_, index) => ({
      distance: firstRun.data.Distance[index],
      time: timeData[index],
      cadence: firstRun.data.Cadence[index],
    }))
    .filter(d => d.cadence >= minThreshold && d.cadence <= maxThreshold);


  const filteredCadenceDataSecond = secondRun.data.Distance
    .map((_, index) => ({
      distance: secondRun.data.Distance[index],
      time: timeData[index],
      cadence: secondRun.data.Cadence[index],
    }))
    .filter(d => d.cadence >= minThreshold && d.cadence <= maxThreshold);

  function movingAverage(data: { cadence: number }[], windowSize: number = 5): { cadence: number }[] {
    return data.map((d, i, arr) => {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(arr.length, i + Math.floor(windowSize / 2) + 1);
      const subset = arr.slice(start, end);
      const smoothedCadence = subset.reduce((sum, point) => sum + point.cadence, 0) / subset.length;
      return {...d, cadence: smoothedCadence};
    });
  }

  const smoothedCadenceDataFirst = movingAverage(filteredCadenceDataFirst, 10);
  const smoothedCadenceDataSecond = movingAverage(filteredCadenceDataSecond, 10);

  function linearRegression(data: { cadence: number; strideLength: number }[]) {
    const N = data.length;
    const sumX = data.reduce((acc, d) => acc + d.cadence, 0);
    const sumY = data.reduce((acc, d) => acc + d.strideLength, 0);
    const sumXY = data.reduce((acc, d) => acc + d.cadence * d.strideLength, 0);
    const sumX2 = data.reduce((acc, d) => acc + d.cadence ** 2, 0);

    const m = (N * sumXY - sumX * sumY) / (N * sumX2 - sumX ** 2);
    const b = (sumY - m * sumX) / N;

    return {slope: m, intercept: b};
  }

  function renderChart() {
    const maxXFirst = Math.max(...firstRun.data.Distance);
    const maxXSecond = Math.max(...secondRun.data.Distance);

    const targetRangeDataFirst = [
      {distance: 0, minCadence: targetMin, maxCadence: targetMax},
      {distance: maxXFirst, minCadence: targetMin, maxCadence: targetMax}
    ];
    const targetRangeDataSecond = [
      {distance: 0, minCadence: targetMin, maxCadence: targetMax},
      {distance: maxXSecond, minCadence: targetMin, maxCadence: targetMax}
    ];


    const targetMinPercentage = ((targetMin / avgCadenceFirstRun) - 1) * 100;
    const targetMaxPercentage = ((targetMax / avgCadenceFirstRun) - 1) * 100;

    const cadenceChartFirst = Plot.plot({
      width: 600,
      height: 300,
      x: {label: currentX === "time" ? "Time (minutes)" : "Distance", grid: true},
      y: {axis: "left", grid: true, nice: true, label: "Cadence (SPM)"},
      marks: [
        Plot.areaY(targetRangeDataFirst, {
          x: currentX,
          y1: "minCadence",
          y2: "maxCadence",
          fillOpacity: 0.3,
          stroke: "green",
          fill: "green",
        }),
        Plot.lineY(smoothedCadenceDataFirst, {
          x: currentX,
          y: "cadence",
          stroke: "#EFB118FF",
          strokeWidth: 2,
          tip: {
            fill: "#465a6a",
            stroke: "#ffffff",
          }
        }),

        Plot.ruleY([avgCadenceFirstRun], {
          stroke: "white",
          strokeWidth: 2,
          strokeDasharray: "4 4"
        }),
      ],
      color: {
        legend: true,
        domain: [
          `Run from ${new Date(Math.min(...firstRun.data.Timestamp.map(t => new Date(t).getTime()))).toLocaleDateString("de-DE")}:`,
          "Cadence",
          `Target increase range (${targetMinPercentage.toFixed(0)}% - ${targetMaxPercentage.toFixed(0)}%)`,
          "Average Cadence",
        ],
        range: ["rgba(62, 62, 62, 0)", "#EFB118FF", "green", "white"]
      }
    });

    const cadenceChartSecond = Plot.plot({
      width: 600,
      height: 300,
      x: {label: currentX === "time" ? "Time (minutes)" : "Distance", grid: true},
      y: {axis: "left", grid: true, nice: true, label: "Cadence (SPM)"},
      marks: [
        Plot.areaY(targetRangeDataSecond, {
          x: currentX,
          y1: "minCadence",
          y2: "maxCadence",
          fillOpacity: 0.3,
          stroke: "green",
          fill: "green",
        }),
        Plot.lineY(smoothedCadenceDataSecond, {
          x: currentX,
          y: "cadence",
          stroke: "#EFB118FF",
          strokeWidth: 2,
          tip: {
            fill: "#465a6a",
            stroke: "#ffffff",
          }
        }),

        Plot.ruleY([avgCadenceSecondRun], {
          stroke: "white",
          strokeWidth: 2,
          strokeDasharray: "4 4"
        }),
      ],
      color: {
        legend: true,
        domain: [
          `Run from ${new Date(Math.min(...secondRun.data.Timestamp.map(t => new Date(t).getTime()))).toLocaleDateString("de-DE")}:`,
          "Cadence",
          `Target increase range (${targetMinPercentage.toFixed(0)}% - ${targetMaxPercentage.toFixed(0)}%)`,
          "Average Cadence",
        ],
        range: ["rgba(62, 62, 62, 0)", "#EFB118FF", "green", "white", null]
      }
    });

    const minCadenceThreshold = avgCadenceFirstRun * 0.9;
    const maxCadenceThreshold = avgCadenceFirstRun * 1.1;

    const validStrideLengths = secondRun.data.StrideLength
      .map(val => val / 1000)
      .filter(val => val > 0.3 && val < 2.5);

    const avgStrideLength = validStrideLengths.length
      ? validStrideLengths.reduce((sum, val) => sum + val, 0) / validStrideLengths.length
      : 1.0;

    const minStrideThreshold = avgStrideLength * 0.8;
    const maxStrideThreshold = avgStrideLength * 1.2;

    const stepLengthData = secondRun.data.Cadence
      .map((cadence, index) => ({
        cadence: cadence,
        strideLength: secondRun.data.StrideLength[index] / 1000,
        pace: secondRun.data.Pace[index],
      }))
      .filter(d =>
        d.cadence >= minCadenceThreshold && d.cadence <= maxCadenceThreshold &&
        d.strideLength >= minStrideThreshold && d.strideLength <= maxStrideThreshold
      );


    const filteredStepLengthData = (() => {
      const grouped = new Map<number, number[]>();

      stepLengthData.forEach(({cadence, strideLength}) => {
        if (!grouped.has(cadence)) grouped.set(cadence, []);
        grouped.get(cadence)!.push(strideLength);
      });

      return stepLengthData.filter(({cadence}) => (grouped.get(cadence)?.length || 0) >= 50);
    })();


    const {slope, intercept} = linearRegression(filteredStepLengthData);

    const regressionData = filteredStepLengthData.map(d => ({
      ...d,
      expectedStrideLength: slope * d.cadence + intercept,
    }));
    const {
      upperQuantilePoints,
      lowerQuantilePoints
    } = computeQuantiles(filteredStepLengthData, upperQuantile, lowerQuantile);

    const stepLengthChart = Plot.plot({
      width: 600,
      height: 300,
      x: {label: "Cadence (SPM)", grid: true},
      y: {label: "Stride Length (m)", grid: true, nice: true},
      marks: [
        Plot.dot(filteredStepLengthData, {
          x: "cadence",
          y: "strideLength",
          fill: "#EFB118FF",
          opacity: 0.7,
          r: 3,
          tip: {
            fill: "#465a6a",
            stroke: "#ffffff",
          }
        }),
        Plot.line(regressionData.sort((a, b) => a.cadence - b.cadence), {
          x: "cadence",
          y: "expectedStrideLength",
          stroke: "white",
          strokeWidth: 2,
        }),
        Plot.line(upperQuantilePoints, {
          x: "cadence",
          y: "strideLength",
          stroke: "red",
          strokeWidth: 2,
          strokeDasharray: "4 4"
        }),
        Plot.line(lowerQuantilePoints, {
          x: "cadence",
          y: "strideLength",
          stroke: "#00ffe1",
          strokeWidth: 2,
          strokeDasharray: "4 4"
        }),
      ],
      color: {
        legend: true,
        domain: [
          "Stride Length",
          "Linear Regression Line",
          `Lower Quantile (${(lowerQuantile * 100).toFixed(0)}%)`,
          `Upper Quantile (${(upperQuantile * 100).toFixed(0)}%)`
        ],
        range: ["#EFB118FF", "white", "red", "#00ffe1"]
      }

    });

    const style = document.createElement("style");
    style.innerHTML = `
.custom-range::-webkit-slider-thumb {
  background: #4d6275;
}

.custom-range::-moz-range-thumb {
  background: #4d6275;
}

.custom-range::-ms-thumb {
  background: #4d6275;
}
`;
    document.head.appendChild(style);

    container.innerHTML = "";
    container.style.backgroundColor = "#3b4c5a";
    container.style.padding = "25px";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.color = "#ffffff";
    slider.classList.add("form-range", "custom-range");
    slider.style.width = "30%";
    container.appendChild(sliderLabel);
    container.appendChild(slider);
    const cadenceContainer = document.createElement("div");
    cadenceContainer.style.display = "flex";
    cadenceContainer.style.gap = "20px";
    cadenceContainer.style.justifyContent = "center";
    cadenceContainer.style.width = "100%";

    cadenceContainer.appendChild(cadenceChartFirst);
    cadenceContainer.appendChild(cadenceChartSecond);

    container.appendChild(cadenceContainer);

    const filteredCadenceSecondRun = smoothedCadenceDataSecond.filter(d => d.cadence >= targetMin && d.cadence <= targetMax);
    const cadenceInTargetRange = filteredCadenceSecondRun.length;
    const cadencePercentage = ((cadenceInTargetRange / smoothedCadenceDataSecond.length) * 100).toFixed(1);


    const infoContainer = document.createElement("div");
    infoContainer.style.display = "flex";
    infoContainer.style.alignItems = "flex-start";
    infoContainer.style.gap = "20px";
    infoContainer.style.width = "100%";

    const infoText = document.createElement("div");
    infoText.style.paddingTop = "100px";
    infoText.style.color = "#ffffff";
    infoText.style.fontSize = "28px";
    infoText.style.textAlign = "center";
    infoText.style.width = "50%";

    infoText.innerHTML = `
    <strong>Cadence Progress:</strong><br>
    Steps in target Range <strong>${cadencePercentage}%</strong> <br><br>`;

    const chartWrapper = document.createElement("div");
    chartWrapper.style.display = "flex";
    chartWrapper.style.flexDirection = "column";

    chartWrapper.appendChild(sliderContainer);
    chartWrapper.appendChild(stepLengthChart);

    infoContainer.appendChild(infoText);
    infoContainer.appendChild(chartWrapper);

    container.appendChild(infoContainer);


  }

  const initialPercentage = ((targetMin / avgCadenceFirstRun) - 1) * 100;

  const sliderLabel = document.createElement("label");
  sliderLabel.innerHTML = `Desired cadence increase: +<span id="slider-value">${initialPercentage.toFixed(0)}%</span>`;

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "20";
  slider.value = initialPercentage.toFixed(1);
  slider.style.marginBottom = "10px";

  slider.oninput = () => {
    const newPercentageIncrease = parseFloat(slider.value);
    targetMin = avgCadenceFirstRun * (1 + newPercentageIncrease / 100);
    targetMax = targetMin * 1.05;

    document.getElementById("slider-value")!.innerText = `${newPercentageIncrease.toFixed(0)}%`;

    renderChart();
  };


  const sliderQuantHigh = document.createElement("label");
  const sliderQuantLow = document.createElement("label");
  sliderQuantHigh.innerHTML = `Values above: <span id="sliderHigh-value">${initialUpperBoundary.toFixed(0)}%</span>`;
  sliderQuantLow.innerHTML = `Values below: <span id="sliderLow-value">${initialLowerBoundary.toFixed(0)}%</span>`;

  const sliderHigh = document.createElement("input");
  sliderHigh.type = "range";
  sliderHigh.min = "50";
  sliderHigh.max = "100";
  sliderHigh.value = initialUpperBoundary.toFixed(1);
  sliderHigh.style.marginBottom = "10px";

  const sliderLow = document.createElement("input");
  sliderLow.type = "range";
  sliderLow.min = "0";
  sliderLow.max = "50";
  sliderLow.value = initialLowerBoundary.toFixed(1);
  sliderLow.style.marginBottom = "10px";

  sliderHigh.oninput = () => {
    upperQuantile = parseFloat(sliderHigh.value) / 100;
    document.getElementById("sliderHigh-value")!.innerText = `${Math.round(upperQuantile * 100)}%`;
    renderChart();
  };

  sliderLow.oninput = () => {
    lowerQuantile = parseFloat(sliderLow.value) / 100;
    document.getElementById("sliderLow-value")!.innerText = `${Math.round(lowerQuantile * 100)}%`;
    renderChart();
  };


  const sliderContainer = document.createElement("div");
  sliderContainer.style.display = "flex";
  sliderContainer.style.gap = "10px";

  sliderHigh.classList.add("form-range", "custom-range");
  sliderLow.classList.add("form-range", "custom-range");
  sliderHigh.style.width = "22%";
  sliderLow.style.width = "22%";
  sliderContainer.appendChild(sliderQuantLow);
  sliderContainer.appendChild(sliderLow);
  sliderContainer.appendChild(sliderQuantHigh);
  sliderContainer.appendChild(sliderHigh);


  renderChart();
}

function computeQuantiles(data: {
  cadence: number;
  strideLength: number
}[], upperQuantile: number, lowerQuantile: number) {
  const grouped = new Map<number, number[]>();

  data.forEach(({cadence, strideLength}) => {
    if (!grouped.has(cadence)) grouped.set(cadence, []);
    grouped.get(cadence)!.push(strideLength);
  });

  const filteredEntries = Array.from(grouped.entries()).filter(([_, strideLengths]) => strideLengths.length >= 50);

  const upperQuantilePoints = filteredEntries.map(([cadence, strideLengths]) => {
    strideLengths.sort((a, b) => a - b);
    const index = Math.floor(upperQuantile * (strideLengths.length - 1));
    return {cadence, strideLength: strideLengths[index]};
  });

  const lowerQuantilePoints = filteredEntries.map(([cadence, strideLengths]) => {
    strideLengths.sort((a, b) => a - b);
    const index = Math.floor(lowerQuantile * (strideLengths.length - 1));
    return {cadence, strideLength: strideLengths[index]};
  });

  upperQuantilePoints.sort((a, b) => a.cadence - b.cadence);
  lowerQuantilePoints.sort((a, b) => a.cadence - b.cadence);

  return {upperQuantilePoints, lowerQuantilePoints};
}
