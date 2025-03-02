import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'average'
})
export class AveragePipe implements PipeTransform {
  transform(values: number[]): number {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
}
