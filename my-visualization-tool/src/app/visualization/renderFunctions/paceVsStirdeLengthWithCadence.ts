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

  const xSelect = createDropdown("X-Axis", availableKeys, "Pace", renderPlot);
  const ySelect = createDropdown("Y-Axis", availableKeys, "StrideLength", renderPlot);
  const fillSelect = createDropdown("Color", availableKeys, "Cadence", renderPlot);


  container.innerHTML = "";

  const controlsContainer = document.createElement("div");
  controlsContainer.style.display = "flex";
  controlsContainer.style.gap = "10px";
  controlsContainer.style.alignItems = "center";

  controlsContainer.appendChild(xSelect);
  controlsContainer.appendChild(ySelect);
  controlsContainer.appendChild(fillSelect);

  container.appendChild(controlsContainer);

  const plotContainer = document.createElement("div");
  plotContainer.style.marginTop = "15px";
  container.appendChild(plotContainer);

  insertFilteredDataset(data).then(() => {
    console.log("✅ SQL Data Inserted");
    renderPlot();
  });

  function renderPlot() {
    const xKey = xSelect.value;
    const yKey = ySelect.value;
    const fillKey = fillSelect.value;

    console.log(`🎨 Rendering: X=${xKey}, Y=${yKey}, Fill=${fillKey}`);

    plotContainer.innerHTML = "";

    const $brush = vg.Selection.intersect();

    const source = vg.from("scatterData", {cache: false});

    console.log(fillKey);

    const plots = vg.vconcat(
      vg.colorLegend({for: "fill"}),
      vg.plot(
        vg.dot(source, {
          x: xKey,
          y: yKey,
          fill: fillKey,
          r: 3,
          tip: true,
        }),
        vg.name("scatter"),
        vg.intervalX({as: $brush, brush: {fill: "none", stroke: "#888"}}),
        vg.xLabel(xKey),
        vg.yLabel(yKey),
        vg.width(600),
        vg.height(300)
      ),
      vg.plot(
        vg.dot(vg.from("scatterData", {filterBy: $brush}), {
          x: xKey,
          y: yKey,
          fill: fillKey,
          r: 3,
          tip: true,
        }),
        vg.name("scatter_filtered"),
        vg.xLabel(xKey),
        vg.yLabel(yKey),
        vg.width(600),
        vg.height(300)
      )
    );

    plotContainer.appendChild(plots);
  }
}


export async function insertFilteredDataset(data: ScatterData): Promise<void> {
  console.log("🟢 Inserting filtered dataset into SQL...");

  const validCadenceValues = data.Cadence.filter(c => !isNaN(c));
  const avgCadence =
    validCadenceValues.reduce((sum, val) => sum + val, 0) / validCadenceValues.length;

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
      Distance DOUBLE,
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
    .filter(d => d.Cadence >= minCadence && d.Cadence <= maxCadence)
    .map(d => `(${d.Pace}, ${d.StrideLength}, ${d.Cadence}, ${d.Power}, ${d.Elevation}, ${d.HeartRate}, ${d.Distance})`)
    .join(",");

  if (!filteredValues) {
    console.warn("No valid data left after filtering Cadence.");
    return;
  }

  const insertQuery = `INSERT INTO scatterData
                       VALUES ${filteredValues};`;

  await vg.coordinator().exec(insertQuery);

  console.log("Filtered Data Inserted Successfully");
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

