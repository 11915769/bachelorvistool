import * as Plot from "@observablehq/plot";
import * as d3 from "d3";
import * as vg from "@uwdata/vgplot";


vg.coordinator().databaseConnector(vg.wasmConnector());


function movingAverage(data: number[], windowSize: number): number[] {
  const smoothedData: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.floor(windowSize / 2) + 1);
    const window = data.slice(start, end);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    smoothedData.push(avg);
  }
  return smoothedData;
}

export function multiCadence(el: HTMLElement, runs: {
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
}[]) {
  if (!el) {
    console.error("Error: Provided element is null.");
    return;
  }

  if (!runs || runs.length === 0) {
    console.error("Error: No run data provided.");
    return;
  }

  const validKeys = ["Pace", "StrideLength", "Cadence", "Power", "Elevation", "HeartRate", "Distance"] as const;
  const availableKeys = validKeys.filter(key => key in runs[0].data);

  const ySelect = createDropdown("Y-Axis", availableKeys, "Cadence", () => {
    renderPlot();
  });


  const allCadenceValues = runs.flatMap(run => run.data.Cadence || []);
  const validCadenceValues = allCadenceValues.filter(value => typeof value === "number" && !isNaN(value));
  const avgCadence = validCadenceValues.reduce((sum, val) => sum + val, 0) / validCadenceValues.length;

  const allPaceValues = runs.flatMap(run => run.data.Pace || []);
  const validPaceValues = allPaceValues.filter(value => typeof value === "number" && !isNaN(value));
  const avgPace = validPaceValues.reduce((sum, val) => sum + val, 0) / validPaceValues.length;

  const plotData = runs.flatMap(run => {
    if (!run.data.Cadence || !run.data.Distance || !run.data.Elevation || !run.data.Pace) return [];

    const filteredData = run.data.Cadence.map((cadence, index) => ({
      cadence,
      distance: run.data.Distance[index],
      elevation: run.data.Elevation[index],
      heartRate: run.data.HeartRate[index],
      power: run.data.Power[index],
      pace: run.data.Pace[index],
      strideLength: run.data.StrideLength[index],
    })).filter(entry =>
      entry.cadence >= avgCadence - 20 && entry.cadence <= avgCadence + 20 &&
      entry.pace >= avgPace - 10 && entry.pace <= avgPace + 10
    );

    const smoothedCadence = movingAverage(filteredData.map(d => d.cadence), 20);
    const smoothedPace = movingAverage(filteredData.map(d => d.pace), 20);

    return smoothedCadence.map((cadence, index) => ({
      run: run.filename,
      distance: filteredData[index]?.distance || 0,
      cadence: cadence ? cadence : 0,
      elevation: filteredData[index]?.elevation || 0,
      pace: smoothedPace[index] || 0,
      heartRate: filteredData[index]?.heartRate || 0,
      power: filteredData[index]?.power || 0,
      strideLength: filteredData[index]?.strideLength || 0,
    }));
  });

  if (plotData.length === 0) {
    console.warn("Warning: No cadence data available for plotting after filtering.");
    return;
  }

  const values = plotData
    .map(row => `(${row.distance}, ${row.power}, ${row.heartRate}, ${row.strideLength}, ${row.cadence}, ${row.elevation}, ${row.pace}, '${row.run.replace(/'/g, "''")}')`)
    .join(", ");

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS filteredData
    (
      distance
      DOUBLE,
      power
      DOUBLE,
      heartRate
      DOUBLE,
      strideLength
      DOUBLE,
      cadence
      DOUBLE,
      elevation
      DOUBLE,
      pace
      DOUBLE,
      run
      STRING
    );
  `;

  const insertDataQuery = `
    INSERT INTO filteredData
    VALUES ${values};
  `;

  const $curr = vg.Selection.intersect();
  const coordinator = vg.coordinator();


  function findGlobalMinMax(metrics: string[], runs: any[]) {
    const globalMinMax: { [key: string]: { min: number, max: number } } = {};

    metrics.forEach(metric => {
      const allValues = runs.flatMap(run => run.data[metric]);
      const sortedValues = [...allValues].sort((a, b) => a - b);
      const filteredValues = sortedValues.slice(
        Math.floor(sortedValues.length * 0.05),
        Math.ceil(sortedValues.length * 0.95)
      );

      const min = Math.min(...filteredValues);
      const max = Math.max(...filteredValues);
      globalMinMax[metric] = {min, max};
    });

    return globalMinMax;
  }

  function normalizeGlobal(value: number, metric: string, globalMinMax: {
    [key: string]: { min: number, max: number }
  }) {
    const {min, max} = globalMinMax[metric];
    return (value - min) / (max - min);
  }

  function calculateFilteredAverage(values: number[]) {
    const sortedValues = [...values].sort((a, b) => a - b);
    const filteredValues = sortedValues.slice(
      Math.floor(sortedValues.length * 0.05),
      Math.ceil(sortedValues.length * 0.95)
    );
    const sum = filteredValues.reduce((acc, val) => acc + val, 0);
    return sum / filteredValues.length;
  }

  const metrics = ["Cadence", "Pace", "StrideLength", "HeartRate", "Power", "Elevation", "Distance"];

  const metricUnits: Record<string, string> = {
    Cadence: "(SPM)",
    Pace: "(min/km)",
    StrideLength: "(mm)",
    HeartRate: "(BPM)",
    Power: "(W)",
    Elevation: "gained(m)",
    Distance: "(km)"
  };


  const globalMinMax = findGlobalMinMax(metrics, runs);

  const radarData = runs.map(run => {
    const minElevation = Math.min(...run.data.Elevation);
    const adjustedElevation = run.data.Elevation.map(e => e - minElevation);

    const maxAdjustedElevation = Math.max(...adjustedElevation);

    return {
      name: "Run from " + new Date(Math.min(...run.data.Timestamp.map(t => new Date(t).getTime()))).toLocaleDateString("de-DE"),
      rawAverages: {
        Cadence: calculateFilteredAverage(run.data.Cadence),
        Pace: calculateFilteredAverage(run.data.Pace),
        StrideLength: calculateFilteredAverage(run.data.StrideLength),
        HeartRate: calculateFilteredAverage(run.data.HeartRate),
        Power: calculateFilteredAverage(run.data.Power),
        Elevation: calculateFilteredAverage(adjustedElevation),
        Distance: calculateFilteredAverage(run.data.Distance),
      },
      values: {
        Cadence: normalizeGlobal(calculateFilteredAverage(run.data.Cadence), "Cadence", globalMinMax),
        Pace: normalizeGlobal(calculateFilteredAverage(run.data.Pace), "Pace", globalMinMax),
        StrideLength: normalizeGlobal(calculateFilteredAverage(run.data.StrideLength), "StrideLength", globalMinMax),
        HeartRate: normalizeGlobal(calculateFilteredAverage(run.data.HeartRate), "HeartRate", globalMinMax),
        Power: normalizeGlobal(calculateFilteredAverage(run.data.Power), "Power", globalMinMax),
        Elevation: maxAdjustedElevation > 0
          ? calculateFilteredAverage(adjustedElevation) / maxAdjustedElevation
          : 0,
        Distance: normalizeGlobal(calculateFilteredAverage(run.data.Distance), "Distance", globalMinMax),
      }
    };
  });


  const points = radarData.flatMap(run =>
    metrics.map(key => ({
      key,
      value: run.values[key as keyof typeof run.values],
      name: run.name
    }))
  );

  const angleScale = d3.scaleOrdinal<string, number>()
    .domain(metrics)
    .range(metrics.map((_, i) => (i / metrics.length) * 2 * Math.PI));

  const radiusScale = (key: string) =>
    d3.scaleLinear()
      .domain(key === "Pace" || key === "HeartRate" ? [1, 0] : [0, 1])
      .range([0, 90]);


  const gridRadii = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridCircles = metrics.flatMap(key =>
    gridRadii.flatMap(r =>
      d3.range(0, 2 * Math.PI, Math.PI / 1000).map(angle => ({
        key,
        x: Math.cos(angle) * radiusScale(key)(r),
        y: Math.sin(angle) * radiusScale(key)(r),
        r: r
      }))
    )
  );


  const radarChart = Plot.plot({
    width: 500,
    height: 500,
    margin: 50,
    color: {
      legend: true,
      label: "Run Date",
      domain: radarData.map(d => d.name).filter(name => name !== "No Date"),
    },
    x: {axis: null},
    y: {axis: null},
    marks: [
      Plot.line(gridCircles, {
        x: "x",
        y: "y",
        stroke: "gray",
        strokeOpacity: 0.4,
        strokeWidth: 1,
        strokeDasharray: "2,2",
        facet: null
      }),

      Plot.link(metrics, {
        x1: (d) => Math.cos(angleScale(d)) * 90,
        y1: (d) => Math.sin(angleScale(d)) * 90,
        x2: 0,
        y2: 0,
        stroke: "gray",
        strokeOpacity: 0.4,
        strokeWidth: 1
      }),

      Plot.text(metrics, {
        x: (d) => Math.cos(angleScale(d)) * 115,
        y: (d) => Math.sin(angleScale(d)) * 115,
        text: (d) => `${d} ${metricUnits[d] || ""}`,
        textAnchor: "middle",
        fontSize: 12,
      }),


      Plot.area(points, {
        x1: ({key, value}) => Math.cos(angleScale(key)) * radiusScale(key)(value),
        y1: ({key, value}) => Math.sin(angleScale(key)) * radiusScale(key)(value),
        x2: 0,
        y2: 0,
        fill: "name",
        stroke: "name",
        strokeWidth: 2,
        fillOpacity: 0.3,
        curve: "cardinal-closed",
        facet: null,
      }),

      Plot.dot(points, {
        x: ({key, value}) => Math.cos(angleScale(key)) * radiusScale(key)(value),
        y: ({key, value}) => Math.sin(angleScale(key)) * radiusScale(key)(value),
        fill: "name",
        stroke: "white",
        fillOpacity: 0.5,
        r: 5
      }),

      Plot.text(
        points,
        Plot.pointer({
          x: ({key, value}: { key: string, value: number }) =>
            Math.cos(angleScale(key)) * radiusScale(key)(value),
          y: ({key, value}: { key: string, value: number }) =>
            Math.sin(angleScale(key)) * radiusScale(key)(value),
          text: ({key, name}: { key: string; name: string }) => {
            const runData = radarData.find((r) => r.name === name);
            if (!runData || !(key in runData.rawAverages)) return "";

            let displayValue = runData.rawAverages[key as keyof typeof runData.rawAverages];

            if (key === "Distance") {
              const run = runs.find((r) => `Run from ${new Date(Math.min(...r.data.Timestamp.map(t => new Date(t).getTime()))).toLocaleDateString("de-DE")}` === name);
              if (run) {
                displayValue = Math.max(...run.data.Distance);
              }
              return displayValue.toFixed(1);
            }

            if (key === "Elevation") {
              const run = runs.find((r) => `Run from ${new Date(Math.min(...r.data.Timestamp.map(t => new Date(t).getTime()))).toLocaleDateString("de-DE")}` === name);
              if (run) {
                displayValue = run.data.Elevation.reduce((sum, curr, i, arr) => {
                  if (i > 0 && curr > arr[i - 1]) {
                    sum += curr - arr[i - 1];
                  }
                  return sum;
                }, 0);
              }
              return displayValue.toFixed(0);
            }

            if (key === "Pace") return formatPace(displayValue);
            return displayValue.toFixed(0);
          },
          textAnchor: "middle",
          dx: 18,
        })
      ),


    ]
  });

  function renderPlot() {
    let plotContainer = document.getElementById("plot-container");

    if (!plotContainer) {
      plotContainer = document.createElement("div");
      plotContainer.id = "plot-container";
      el.appendChild(plotContainer);
    }


    plotContainer.innerHTML = "";

    const plot = vg.plot(
      vg.lineY(
        vg.from("filteredData"),
        {
          x: "distance", y: ySelect.value.toLowerCase(), z: "run", interpolate: "monotone", stroke: "run", tip: {
            format: {
              x: (d: number) => d.toFixed(2),
              y: ySelect.value === "Pace" ? (d: number) => formatPace(d) : (d: number) => d.toFixed(0),
              z: null,
              stroke: null
            },
            fill: "#465a6a",
            stroke: "#ffffff",
          }
        }
      ),
      vg.nearestX({channels: ["z"], as: $curr}),
      vg.highlight({by: $curr}),
    );

    plotContainer.appendChild(plot);
  }


  coordinator.exec(createTableQuery).then(() => {
    return coordinator.exec(insertDataQuery);
  }).then(() => {
    el.appendChild(radarChart);
    el.appendChild(ySelect);
    renderPlot()
  }).catch((error: any) => {
    console.error("Error executing SQL:", error);
  })
  el.style.backgroundColor = "#3b4c5a";
  el.style.color = "white";
  el.style.borderRadius = "15px";
  el.style.display = "flex";
  el.style.flexDirection = "column";
  el.style.alignItems = "center";
  el.style.padding = "20px";
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

function createDropdown(labelText: string, options: string[], defaultValue: string, onChange?: () => void): HTMLSelectElement {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";

  const label = document.createElement("label");
  label.textContent = `${labelText}: `;
  label.style.marginRight = "5px";

  const select = document.createElement("select");
  options.forEach(option => {
    const optionElement = document.createElement("option");
    optionElement.value = option;
    optionElement.textContent = option;
    if (option === defaultValue) {
      optionElement.selected = true;
    }
    select.appendChild(optionElement);
  });

  if (onChange) {
    select.addEventListener("change", onChange);
  }

  wrapper.appendChild(label);
  wrapper.appendChild(select);
  return wrapper.children[1] as HTMLSelectElement;
}


