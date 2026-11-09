import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { KpiMetric, MetricsGridComponent } from './metrics-grid.component';

describe('MetricsGridComponent', () => {
  let component: MetricsGridComponent;
  let fixture: ComponentFixture<MetricsGridComponent>;

  const metrics: KpiMetric[] = [
    { id: 'population', title: 'Poblacion', value: 120 },
    { id: 'coverage', title: 'Cobertura', value: 40 },
    { id: 'target', title: 'Meta', value: 80 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricsGridComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(MetricsGridComponent);
    component = fixture.componentInstance;
  });

  it('uses 4/2/1 capacity without reserving empty tracks', () => {
    component.metrics = metrics;
    fixture.detectChanges();
    const grid = fixture.nativeElement.querySelector('.metrics-grid') as HTMLElement;

    expect(grid.style.getPropertyValue('--metric-columns-desktop')).toBe('3');
    expect(grid.style.getPropertyValue('--metric-columns-tablet')).toBe('2');
    expect(grid.style.getPropertyValue('--metric-columns-mobile')).toBe('1');
    expect(fixture.nativeElement.querySelectorAll('app-kpi-card').length).toBe(3);
    expect(component.columnCount(4)).toBe(3);
  });

  it('keeps the local KPI contract and accessible label', () => {
    component.metrics = metrics;
    component.ariaLabel = 'Indicadores operativos';
    fixture.detectChanges();
    const grid = fixture.nativeElement.querySelector('.metrics-grid') as HTMLElement;

    expect(grid.getAttribute('aria-label')).toBe('Indicadores operativos');
    expect(grid.style.getPropertyValue('--min-col-width')).toBe('13.75rem');
  });

  it('does not create a track when there are no metrics', () => {
    fixture.detectChanges();
    const grid = fixture.nativeElement.querySelector('.metrics-grid') as HTMLElement;

    expect(grid.classList.contains('metrics-grid--empty')).toBe(true);
    expect(component.columnCount(4)).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('app-kpi-card').length).toBe(0);
  });
});
