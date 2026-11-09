import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  it('normaliza páginas y tamaños no positivos', () => {
    const component = new PaginationComponent();

    component.pageSize = 0;
    component.page = -5;

    expect(component._pageSize()).toBe(10);
    expect(component.currentPage()).toBe(1);
    expect(component.totalPages()).toBe(1);
  });

  it('muestra un intervalo vacío cuando no existen registros', () => {
    const component = new PaginationComponent();

    component.total = 0;

    expect(component.firstItem()).toBe(0);
    expect(component.lastItem()).toBe(0);
  });

  it('no emite tamaños inválidos', () => {
    const component = new PaginationComponent();
    const emitted: number[] = [];
    component.pageSizeChange.subscribe((size) => emitted.push(size));

    component.onPageSizeChange('0');
    component.onPageSizeChange('-10');
    component.onPageSizeChange('20');

    expect(emitted).toEqual([20]);
  });
});
