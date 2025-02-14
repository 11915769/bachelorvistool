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
    Elevation: number[]
  };
}[]) {
  if (!el) {
    console.error("Error: Provided element is null.");
    return;
  }

  if (!runs || !Array.isArray(runs)) {
    console.error("Error: Provided runs data is not an array.");
    return;
  }

  // Compute the global average cadence
  const allCadenceValues = runs.flatMap(run => run.data.Cadence || []);
  const validCadenceValues = allCadenceValues.filter(value => typeof value === "number" && !isNaN(value));
  const avgCadence = validCadenceValues.reduce((sum, val) => sum + val, 0) / validCadenceValues.length;

  // Compute the global average pace
  const allPaceValues = runs.flatMap(run => run.data.Pace || []);
  const validPaceValues = allPaceValues.filter(value => typeof value === "number" && !isNaN(value));
  const avgPace = validPaceValues.reduce((sum, val) => sum + val, 0) / validPaceValues.length;

  // Process and filter the data
  const plotData = runs.flatMap(run => {
    if (!run.data.Cadence || !run.data.Distance || !run.data.Elevation || !run.data.Pace) return [];

    const filteredData = run.data.Cadence.map((cadence, index) => ({
      cadence,
      distance: run.data.Distance[index],
      elevation: run.data.Elevation[index],
      pace: run.data.Pace[index],
    })).filter(entry =>
      entry.cadence >= avgCadence - 20 && entry.cadence <= avgCadence + 20 &&
      entry.pace >= avgPace - 10 && entry.pace <= avgPace + 10 // ✅ Pace filter applied
    );

    const smoothedCadence = movingAverage(filteredData.map(d => d.cadence), 20);
    const smoothedPace = movingAverage(filteredData.map(d => d.pace), 20); // ✅ Smooth pace

    return smoothedCadence.map((cadence, index) => ({
      run: run.filename,
      distance: filteredData[index]?.distance || 0,
      cadence,
      elevation: filteredData[index]?.elevation || 0,
      pace: smoothedPace[index] || 0,
    }));
  });

  if (plotData.length === 0) {
    console.warn("Warning: No cadence data available for plotting after filtering.");
    return;
  }

  // SQL-like data structure
  const values = plotData
    .map(row => `(${row.distance}, ${row.cadence}, ${row.elevation}, ${row.pace}, '${row.run.replace(/'/g, "''")}')`)
    .join(", ");

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS filteredData
    (
      distance
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
      // Filter out the highest and lowest 5% of values for this metric
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

  // Normalize values based on the global min and max for each metric
  function normalizeGlobal(value: number, metric: string, globalMinMax: {
    [key: string]: { min: number, max: number }
  }) {
    const {min, max} = globalMinMax[metric];
    return (value - min) / (max - min);
  }

  // Calculate the average value after filtering the highest and lowest 5%
  function calculateFilteredAverage(values: number[]) {
    const sortedValues = [...values].sort((a, b) => a - b);
    const filteredValues = sortedValues.slice(
      Math.floor(sortedValues.length * 0.05),
      Math.ceil(sortedValues.length * 0.95)
    );
    const sum = filteredValues.reduce((acc, val) => acc + val, 0);
    return sum / filteredValues.length;
  }

  const metrics = ["Cadence", "Pace", "StrideLength", "HeartRate", "Power"];

  // Find the global min and max for each metric after filtering
  const globalMinMax = findGlobalMinMax(metrics, runs);

  // Create the radar data with averages for each metric after filtering
  const radarData = runs.map(run => ({
    name: run.filename,
    values: {
      Cadence: normalizeGlobal(calculateFilteredAverage(run.data.Cadence), "Cadence", globalMinMax),
      Pace: normalizeGlobal(calculateFilteredAverage(run.data.Pace), "Pace", globalMinMax),
      StrideLength: normalizeGlobal(calculateFilteredAverage(run.data.StrideLength), "StrideLength", globalMinMax),
      HeartRate: normalizeGlobal(calculateFilteredAverage(run.data.HeartRate), "HeartRate", globalMinMax),
      Power: normalizeGlobal(calculateFilteredAverage(run.data.Power), "Power", globalMinMax),
    }
  }));


  const points = radarData.flatMap(run =>
    metrics.map(key => ({
      key,
      value: run.values[key as keyof typeof run.values],
      name: run.name
    }))
  );

  console.log(points);

  // Angle scale for the radar chart (to position metrics)
  const angleScale = d3.scaleOrdinal<string, number>()
    .domain(metrics)
    .range(metrics.map((_, i) => (i / metrics.length) * 2 * Math.PI));

  // Radius scale for the values
  const radiusScale = d3.scaleLinear().domain([0, 1]).range([0, 90]); // Adjusted for max radius (0-1)

  // Circles for the grid
  const gridRadii = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridCircles = gridRadii.flatMap(r =>
    d3.range(0, 2 * Math.PI, Math.PI / 1000).map(angle => ({
      x: Math.cos(angle) * radiusScale(r),
      y: Math.sin(angle) * radiusScale(r),
      r: r
    }))
  );

  const radarChart = Plot.plot({
    width: 500,
    height: 500,
    margin: 50,
    color: {legend: true},
    x: {axis: null},
    y: {axis: null},
    marks: [
      // Grid circles (background)
      Plot.line(gridCircles, {
        x: "x",
        y: "y",
        stroke: "gray",
        strokeOpacity: 0.4,
        strokeWidth: 1,
        strokeDasharray: "2,2",
        facet: null
      }),

      // Connecting lines from the center (to each axis)
      Plot.link(metrics, {
        x1: (d) => Math.cos(angleScale(d)) * 90,
        y1: (d) => Math.sin(angleScale(d)) * 90,
        x2: 0,
        y2: 0,
        stroke: "gray",
        strokeOpacity: 0.6,
        strokeWidth: 1
      }),

      // Metric labels
      Plot.text(metrics, {
        x: (d) => Math.cos(angleScale(d)) * 110,
        y: (d) => Math.sin(angleScale(d)) * 110,
        text: (d) => d,
        fontSize: 12,
        textAnchor: "middle",
        fill: "black",
        stroke: "white",
        strokeWidth: 0.5
      }),

      // Radar chart areas with interactive opacity
      Plot.area(points, {
        x1: ({key, value}) => Math.cos(angleScale(key)) * radiusScale(value),
        y1: ({key, value}) => Math.sin(angleScale(key)) * radiusScale(value),
        x2: 0,
        y2: 0,
        fill: "name",
        stroke: "name",
        strokeWidth: 2,
        fillOpacity: 0.3,
        curve: "cardinal-closed",
        facet: null,
      }),

      // Points (dots) for each metric
      Plot.dot(points, {
        x: ({key, value}) => Math.cos(angleScale(key)) * radiusScale(value),
        y: ({key, value}) => Math.sin(angleScale(key)) * radiusScale(value),
        fill: "name",
        stroke: "black",
        fillOpacity: 0.5,
        r: 5
      }),

      Plot.text(
        points,
        Plot.pointer({
          x: ({key, value}: { key: string, value: number }) => Math.cos(angleScale(key)) * radiusScale(value),
          y: ({key, value}: { key: string, value: number }) => Math.sin(angleScale(key)) * radiusScale(value),
          text: ({value}) => `${(value * 100).toFixed()}%`,
          textAnchor: "middle",
          fill: "black",
          stroke: "white",
          strokeWidth: 0.5,
          maxRadius: 10,
          dx: 18,
        })
      ),

    ]
  });

  coordinator.exec(createTableQuery).then(() => {
    return coordinator.exec(insertDataQuery);
  }).then(() => {
    el.replaceChildren(radarChart,
      vg.vconcat(
        vg.plot(
          vg.lineY(
            vg.from("filteredData"),
            {x: "distance", y: "cadence", z: "run", stroke: "run"}
          ),
          vg.nearestX({channels: ["z"], as: $curr}),
          vg.highlight({by: $curr}),
          vg.dot(
            vg.from("filteredData"),
            {
              x: "distance",
              y: "cadence",
              z: "run",
              r: 4,
              fill: "currentColor",
              select: "nearestX",
            }
          ),
          vg.text(
            vg.from("filteredData"),
            {
              x: "distance",
              y: "cadence",
              text: vg.sql`'Distance: ' || ROUND(distance, 2) || ', Cadence: ' || ROUND(cadence, 2)`,
              fill: "currentColor",
              dy: -8,
              select: "nearestX"
            }
          ),
          vg.width(800),
          vg.height(400),
          vg.yGrid(true),
          vg.style("overflow: visible;"),
          vg.panZoom()
        ),
        vg.plot(
          vg.lineY(
            vg.from("filteredData"),
            {x: "distance", y: "pace", z: "run", stroke: "run"}
          ),
          vg.nearestX({channels: ["z"], as: $curr}),
          vg.highlight({by: $curr}),
          vg.dot(
            vg.from("filteredData"),
            {
              x: "distance",
              y: "pace",
              z: "run",
              r: 4,
              fill: "currentColor",
              select: "nearestX"
            }
          ),
          vg.text(
            vg.from("filteredData"),
            {
              x: "distance",
              y: "pace",
              text: vg.sql`'Distance: ' || ROUND(distance, 2) || ', Pace: ' || ROUND(pace, 2)`,
              fill: "currentColor",
              dy: -8,
              select: "nearestX"
            }
          ),
          vg.width(800),
          vg.height(400),
          vg.yGrid(true),
          vg.style("overflow: visible;"),
          vg.panZoom()
        )
      )
    );
  }).catch((error: any) => {
    console.error("Error executing SQL:", error);
  })
}
