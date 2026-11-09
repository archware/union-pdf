import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopupService } from './popup.service';

describe('PopupService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('closes the popup that owns the action when several are open', () => {
    const service = new PopupService();
    const firstId = service.info('Primero', 'Mensaje');
    const secondId = service.success('Segundo', 'Mensaje');

    service.popups().find((popup) => popup.id === firstId)?.buttons?.[0].action();

    expect(service.popups().find((popup) => popup.id === firstId)?.closing).toBe(true);
    expect(service.popups().find((popup) => popup.id === secondId)?.closing).toBeFalsy();
    vi.advanceTimersByTime(200);
    expect(service.popups().map((popup) => popup.id)).toEqual([secondId]);
  });

  it('uses one identifier and closes a confirmation after accepting it', () => {
    const service = new PopupService();
    let confirmed = false;
    const id = service.confirm({
      title: 'Eliminar el gasto del 12/03',
      message: 'Se retira del arqueo del día. No se puede deshacer.',
      confirmLabel: 'Eliminar el gasto',
      onConfirm: () => { confirmed = true; },
    });

    expect(id).toBe(1);
    service.popups()[0].buttons?.[1].action();
    expect(confirmed).toBe(true);
    vi.advanceTimersByTime(200);
    expect(service.popups()).toEqual([]);
  });

  /*
  Capitulo 7. Un dialogo que pregunta por un acto tiene que empezar en la salida
  segura y nombrar lo que va a pasar: quien lleva cuarenta al dia no lee el
  titulo, lee el boton, y un Intro por inercia no puede ejecutar la accion.
  */
  it('pone el foco inicial en cancelar y nombra el acto en el otro boton', () => {
    const service = new PopupService();

    service.confirm({
      title: 'Anular la solicitud 118',
      message: 'La solicitud deja de poder aprobarse. Queda registrado quién la anuló.',
      confirmLabel: 'Anular la solicitud',
      tone: 'danger',
      onConfirm: () => undefined,
    });

    const [cancelar, confirmar] = service.popups()[0].buttons ?? [];
    expect(cancelar.autofocus).toBe(true);
    expect(cancelar.cancels).toBe(true);
    expect(confirmar.autofocus).toBe(false);
    expect(confirmar.label).toBe('Anular la solicitud');
    // El tono destructivo se ve, no solo se lee.
    expect(confirmar.variant).toBe('danger');
  });

  it('permite pedir el foco en el boton del acto, sin que sea lo normal', () => {
    const service = new PopupService();

    service.confirm({
      title: 'Reintentar el envío',
      message: 'Se vuelve a enviar el comprobante al mismo número.',
      confirmLabel: 'Reintentar',
      initialFocus: 'confirm',
      onConfirm: () => undefined,
    });

    const [cancelar, confirmar] = service.popups()[0].buttons ?? [];
    expect(confirmar.autofocus).toBe(true);
    expect(cancelar.autofocus).toBe(false);
  });

  it('deja a mano la cancelación para quien cierre con Escape', () => {
    const service = new PopupService();
    let cancelado = false;

    service.confirm({
      title: 'Anular la solicitud 118',
      message: 'La solicitud deja de poder aprobarse.',
      confirmLabel: 'Anular la solicitud',
      onConfirm: () => undefined,
      onCancel: () => { cancelado = true; },
    });

    // Es lo que ejecuta Escape en el contenedor: la misma accion del boton, no
    // un cierre mudo que deja al llamador esperando.
    service.popups()[0].buttons?.find((button) => button.cancels)?.action();

    expect(cancelado).toBe(true);
    vi.advanceTimersByTime(200);
    expect(service.popups()).toEqual([]);
  });
});
