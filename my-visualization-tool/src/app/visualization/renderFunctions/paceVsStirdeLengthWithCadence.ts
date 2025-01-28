import * as vg from "@uwdata/vgplot";

interface ScatterData {
  Pace: number[];
  StrideLength: number[];
  Cadence: number[];
  Power: number[];
}

vg.coordinator().databaseConnector(vg.wasmConnector());

export function paceVsStrideLengthWithCadence(container: HTMLElement, data: ScatterData): void {
  const filterOutExtremes = (data: ScatterData, topN: number = 20) => {
    const indexedData = data.Pace.map((_, index) => ({
      pace: data.Pace[index],
      strideLength: data.StrideLength[index],
      cadence: data.Cadence[index],
    }));

    const sortedByPace = [...indexedData].sort((a, b) => a.pace - b.pace);
    const sortedByStrideLength = [...indexedData].sort((a, b) => a.strideLength - b.strideLength);
    const sortedByCadence = [...indexedData].sort((a, b) => a.cadence - b.cadence);

    const excludeIndices = new Set([
      ...sortedByPace.slice(0, topN).map(item => item.pace),
      ...sortedByPace.slice(-topN).map(item => item.pace),
      ...sortedByStrideLength.slice(0, topN).map(item => item.strideLength),
      ...sortedByStrideLength.slice(-topN).map(item => item.strideLength),
      ...sortedByCadence.slice(0, topN).map(item => item.cadence),
      ...sortedByCadence.slice(-topN).map(item => item.cadence),
    ]);

    return indexedData.filter(item => !excludeIndices.has(item.pace) && !excludeIndices.has(item.strideLength) && !excludeIndices.has(item.cadence));
  };

  const filteredScatterD = filterOutExtremes(data);

  const values = filteredScatterD
    .map(row => `(${row.pace}, ${row.strideLength}, ${row.cadence})`)
    .join(",");

  const createTableQuery = `
    CREATE TABLE filteredData (pace DOUBLE, strideLength DOUBLE, cadence DOUBLE);
    INSERT INTO filteredData VALUES ${values};
  `;

  vg.coordinator().exec(createTableQuery);

  const $brush = vg.Selection.single();

  const plots = vg.vconcat(
     vg.colorLegend({for: "cadence"}),
    vg.plot(
      vg.dot(vg.from("filteredData"), {
        x: "pace",
        y: "strideLength",
        fill: "cadence",
        r: 3,
        tip: true,
      }),
      vg.name("cadence"),
      vg.intervalX({ as: $brush, brush: { fill: "none", stroke: "#888" } }),
      vg.xLabel("Pace"),
      vg.yLabel("Stride Length"),
      vg.width(600),
      vg.height(300),
    ),
    vg.plot(
      vg.heatmap(vg.from("filteredData",  {filterBy: $brush}), {
        x: "pace",
        y: "strideLength",
        fill: "cadence",
        bandwidth: 5,
        tip: true,
      }),
      vg.xLabel("Pace"),
      vg.yLabel("Stride Length"),
      vg.colorScale("symlog"),
      vg.colorScheme("ylgnbu"),
      vg.width(600),
      vg.height(300)
    ),
    vg.plot(
      vg.rectY(vg.from("filteredData",  {filterBy: $brush}), {
        x: "pace",
        y: vg.count(),
        fill: "steelblue",
        tip: true,
      }),
      vg.xLabel("Pace"),
      vg.yLabel("Frequency"),
      vg.width(600),
      vg.height(300)
    )
  );

  container.innerHTML = "";
  container.appendChild(plots);
}
