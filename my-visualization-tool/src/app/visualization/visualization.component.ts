import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as vgplot from '@uwdata/vgplot';

@Component({
  selector: 'app-visualization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.css']
})
export class VisualizationComponent {
  selectedFile: File | null = null;

  constructor(private http: HttpClient) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.selectedFile = input.files[0];
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post('http://127.0.0.1:5000/upload', formData).subscribe(
      (response: any) => {
        console.log('Data received:', response);
        this.renderGraph(response.data); // Assuming backend sends `data`
      },
      (error) => {
        console.error('Error uploading file:', error);
      }
    );
  }

  renderGraph(data: { distance: number[]; cadence: number[] }): void {
    const container = document.getElementById('visualization-container');
    if (container) {
      container.innerHTML = ''; // Clear previous graph

      const plot = vgplot.plot(
        vgplot.line(data.distance.map((x, i) => ({ x, y: data.cadence[i] })), {
          x: 'x',
          y: 'y',
          stroke: 'blue'
        }),
        vgplot.width(600),
        vgplot.height(300)
      );

      container.appendChild(plot);
    }
  }
}
