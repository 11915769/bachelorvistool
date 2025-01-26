import * as vg from "@uwdata/vgplot"; // Keep this import

interface ChartData {
    Distance: number[];
    Time: number[];
    Cadence: number[];
    StrideLength: number[];
}

export function cadenceVsStrideLength(container: HTMLElement, data: ChartData): void {
    container.innerHTML = "";

    const controlsContainer = document.createElement("div");
    controlsContainer.style.marginBottom = "10px";

    const cadenceToggle = document.createElement("input");
    cadenceToggle.type = "checkbox";
    cadenceToggle.checked = true;
    cadenceToggle.id = "toggle-cadence";

    const cadenceLabel = document.createElement("label");
    cadenceLabel.htmlFor = "toggle-cadence";
    cadenceLabel.innerText = "Show Cadence";
    cadenceLabel.style.marginRight = "20px";

    const strideToggle = document.createElement("input");
    strideToggle.type = "checkbox";
    strideToggle.checked = true;
    strideToggle.id = "toggle-stride";

    const strideLabel = document.createElement("label");
    strideLabel.htmlFor = "toggle-stride";
    strideLabel.innerText = "Show Stride Length";

    controlsContainer.appendChild(cadenceLabel);
    controlsContainer.appendChild(cadenceToggle);
    controlsContainer.appendChild(strideLabel);
    controlsContainer.appendChild(strideToggle);
    container.appendChild(controlsContainer);

    const chartContainer = document.createElement("div");
    container.appendChild(chartContainer);

    const updateChart = () => {
        chartContainer.innerHTML = ""; // Clear previous chart

        const xData = data.Distance;

        const cadenceData = cadenceToggle.checked
            ? xData.map((x, i) => ({ x, y: data.Cadence[i] }))
            : [];
        const strideData = strideToggle.checked
            ? xData.map((x, i) => ({ x, y: data.StrideLength[i] }))
            : [];

const chart = vg.plot(
    vg.plot(cadenceData),

    vg.width(600),
    vg.height(300),
    vg.panZoom(), // Enable zoom and pan
    vg.marginRight(50),
);



        chartContainer.appendChild(chart);
    };

    cadenceToggle.addEventListener("change", updateChart);
    strideToggle.addEventListener("change", updateChart);

    // Initial render
    updateChart();
}
