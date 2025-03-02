import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'paceFormat'
})
export class PaceFormatPipe implements PipeTransform {
  transform(pace: number): string {
    if (!pace) return "";
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}
