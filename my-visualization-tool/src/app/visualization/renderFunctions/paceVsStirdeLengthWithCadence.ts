import * as vg from "@uwdata/vgplot";

interface ScatterData {
  Pace: number[];
  StrideLength: number[];
  Cadence: number[];
  Power: number[];
  Elevation: number[];
  HeartRate: number[];
  Distance: number[];
}

vg.coordinator().databaseConnector(vg.wasmConnector());

export function paceVsStrideLengthWithCadence(container: HTMLElement, data: ScatterData): void {
  const validKeys = ["Pace", "StrideLength", "Cadence", "Power", "Elevation", "HeartRate", "Distance"] as const;
  const availableKeys = validKeys.filter(key => key in data);

  const xSelect = createDropdown("X-Axis", availableKeys, "Distance", renderPlot);
  const ySelect = createDropdown("Y-Axis", availableKeys, "StrideLength", renderPlot);
  const fillSelect = createDropdown("Color", availableKeys, "Cadence", renderPlot);


  container.innerHTML = "";

  const controlsContainer = document.createElement("div");
  controlsContainer.style.display = "flex";
  controlsContainer.style.gap = "10px";
  controlsContainer.style.alignItems = "center";
  controlsContainer.style.justifyContent = "center";
  controlsContainer.style.backgroundColor = "#3b4c5a";
  controlsContainer.style.borderTopLeftRadius = "15px";
  controlsContainer.style.borderTopRightRadius = "15px";
  controlsContainer.style.padding = "20px";
  controlsContainer.style.marginBottom = "0";

  controlsContainer.appendChild(xSelect);
  controlsContainer.appendChild(ySelect);
  controlsContainer.appendChild(fillSelect);

  container.appendChild(controlsContainer);

  const plotContainer = document.createElement("div");
  plotContainer.style.marginTop = "15px";
  container.appendChild(plotContainer);

  renderPlot();

  function renderPlot() {

    plotContainer.innerHTML = "";

    const xKey = xSelect.value;
    const yKey = ySelect.value;
    const fillKey = fillSelect.value;
    plotContainer.innerHTML = "";

    const $brush = vg.Selection.intersect();

    const source = vg.from("scatterData", {cache: false});

    const plots = vg.vconcat(
      vg.plot(
        vg.dot(source, {
          x: xKey,
          y: yKey,
          fill: fillKey,
          r: 3,
          tip: {
            format: {
              x: xKey === "Pace" ? (d: number) => formatPace(d) : (d: number) => d.toFixed(0),
              y: yKey === "Pace" ? (d: number) => formatPace(d) : (d: number) => d.toFixed(0),
              fill: fillKey === "Pace" ? (d: number) => formatPace(d) : (d: number) => d.toFixed(0),
            },
            fill: "#465a6a",
            stroke: "#ffffff"
          }
        }),
        vg.name("scatter"),
        vg.intervalX({as: $brush, brush: {fill: "none", stroke: "#888"}}),
        vg.xLabel(xKey),
        vg.yLabel(yKey),
        vg.height(300)
      ),
      vg.colorLegend({for: "scatter", label: fillKey, style: "margin-left: 100%",}),
      vg.plot(
        vg.dot(vg.from("scatterData", {filterBy: $brush}), {
          x: xKey,
          y: yKey,
          fill: fillKey,
          r: 3,
          tip: {
            format: {
              x: xKey === "Pace" ? (d: number) => formatPace(d) : (d: number) => d.toFixed(0),
              y: yKey === "Pace" ? (d: number) => formatPace(d) : (d: number) => d.toFixed(0),
              fill: fillKey === "Pace" ? (d: number) => formatPace(d) : (d: number) => d.toFixed(0),
            },
            fill: "#465a6a",
            stroke: "#ffffff"
          }

        }),
        vg.name("scatter_filtered"),
        vg.xLabel(xKey),
        vg.yLabel(yKey),
        vg.gridX,
        vg.gridY,
        vg.height(300),
      )
    );


    plotContainer.style.display = "flex";
    plotContainer.style.display = "flex-column";
    plotContainer.style.alignItems = "center";
    plotContainer.style.backgroundColor = "#3b4c5a";
    plotContainer.style.borderBottomRightRadius = "15px";
    plotContainer.style.borderBottomLeftRadius = "15px";
    plotContainer.style.padding = "20px";
    plotContainer.style.color = "#ffffff";
    plotContainer.style.marginTop = "0";
    plotContainer.appendChild(plots);
  }
}


export async function insertFilteredDataset(data: ScatterData): Promise<void> {
  function computeIQR(values: number[]): { min: number; max: number } {
    const sorted = values.filter(v => !isNaN(v)).sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.05)];
    const q3 = sorted[Math.floor(sorted.length * 0.95)];
    const iqr = q3 - q1;
    return {min: q1 - 1.5 * iqr, max: q3 + 1.5 * iqr};
  }

  const iqrRanges = {
    Pace: computeIQR(data.Pace),
    StrideLength: computeIQR(data.StrideLength),
    Cadence: computeIQR(data.Cadence),
    Power: computeIQR(data.Power),
    Elevation: computeIQR(data.Elevation),
    HeartRate: computeIQR(data.HeartRate),
    Distance: computeIQR(data.Distance),
  };

  const validCadenceValues = data.Cadence.filter(c => !isNaN(c));
  const avgCadence = validCadenceValues.reduce((sum, val) => sum + val, 0) / validCadenceValues.length;
  const minCadence = avgCadence * 0.8;
  const maxCadence = avgCadence * 1.2;

  const createTableQuery = `
    DROP TABLE IF EXISTS scatterData;
    CREATE TABLE scatterData
    (
      Pace DOUBLE,
      StrideLength DOUBLE,
      Cadence DOUBLE,
      Power DOUBLE,
      Elevation DOUBLE,
      HeartRate DOUBLE,
      Distance DOUBLE
    );
  `;

  await vg.coordinator().exec(createTableQuery);

  const filteredValues = data.Pace
    .map((_, i) => ({
      Pace: data.Pace[i],
      StrideLength: data.StrideLength[i],
      Cadence: data.Cadence[i],
      Power: data.Power[i],
      Elevation: data.Elevation[i],
      HeartRate: data.HeartRate[i],
      Distance: data.Distance[i],
    }))
    .filter(d =>
      d.Cadence >= minCadence && d.Cadence <= maxCadence &&
      d.Pace >= iqrRanges.Pace.min && d.Pace <= iqrRanges.Pace.max &&
      d.StrideLength >= iqrRanges.StrideLength.min && d.StrideLength <= iqrRanges.StrideLength.max &&
      d.Cadence >= iqrRanges.Cadence.min && d.Cadence <= iqrRanges.Cadence.max &&
      d.Power >= iqrRanges.Power.min && d.Power <= iqrRanges.Power.max &&
      d.Elevation >= iqrRanges.Elevation.min && d.Elevation <= iqrRanges.Elevation.max &&
      d.HeartRate >= iqrRanges.HeartRate.min && d.HeartRate <= iqrRanges.HeartRate.max &&
      d.Distance >= iqrRanges.Distance.min && d.Distance <= iqrRanges.Distance.max
    )
    .map(d => `(${d.Pace}, ${d.StrideLength}, ${d.Cadence}, ${d.Power}, ${d.Elevation}, ${d.HeartRate}, ${d.Distance})`)
    .join(",");

  if (!filteredValues) {
    console.warn("No valid data left after filtering outliers.");
    return;
  }

  const insertQuery = `INSERT INTO scatterData
                       VALUES ${filteredValues};`;
  await vg.coordinator().exec(insertQuery);
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

