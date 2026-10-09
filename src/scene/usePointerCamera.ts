import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';

/**
 * Mouse movement collected since the camera last read it. Updated in place by the listeners
 * below and cleared by whoever consumes it, so reading it every frame causes no React re-renders.
 */
export interface PointerCameraInput {
  /** Pixels dragged horizontally since the last read. Positive is to the right. */
  lookX: number;
  /** Pixels dragged vertically since the last read. Positive is down. */
  lookY: number;
  /** Wheel movement since the last read, in pixels. Positive is scrolling down. */
  wheel: number;
}

export function createPointerCameraInput(): PointerCameraInput {
  return { lookX: 0, lookY: 0, wheel: 0 };
}

/** Wheels can report lines or pages instead of pixels. */
const LINE_HEIGHT_PIXELS = 16;
const PAGE_HEIGHT_PIXELS = 100;

function wheelDeltaInPixels(event: WheelEvent): number {
  if (event.deltaMode === 1) {
    return event.deltaY * LINE_HEIGHT_PIXELS;
  }
  if (event.deltaMode === 2) {
    return event.deltaY * PAGE_HEIGHT_PIXELS;
  }
  return event.deltaY;
}

/**
 * Collects left-button drags and wheel movement over the game view.
 * Returns ONE stable object that is updated in place. While `enabled` is false no listeners
 * are attached and the page keeps its normal scrolling and touch behaviour.
 *
 * Listeners sit on `window` (capture phase) and filter by target, so they keep working even if
 * another element stops the event or the pointer leaves the canvas during a drag.
 */
export function usePointerCamera(enabled: boolean): PointerCameraInput {
  const domElement = useThree((state) => state.gl.domElement);
  const [input] = useState(createPointerCameraInput);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const container = domElement.parentElement ?? domElement;
    let activePointer: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const previousTouchAction = domElement.style.touchAction;
    const previousCursor = domElement.style.cursor;
    domElement.style.touchAction = 'none';
    domElement.style.cursor = 'grab';

    /** True when the event started on the game view and not on a button or other control. */
    const isOverGame = (target: EventTarget | null): boolean => {
      if (!(target instanceof Node) || !container.contains(target)) {
        return false;
      }
      return !(target instanceof Element && target.closest('button, a, input, select, textarea'));
    };

    const stopDragging = (): void => {
      activePointer = null;
      domElement.style.cursor = 'grab';
    };

    const handlePointerDown = (event: PointerEvent): void => {
      if (event.button !== 0 || activePointer !== null || !isOverGame(event.target)) {
        return;
      }
      activePointer = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      domElement.style.cursor = 'grabbing';
    };

    const handlePointerMove = (event: PointerEvent): void => {
      if (event.pointerId !== activePointer) {
        return;
      }
      // If the button was released somewhere we did not see, stop instead of getting stuck.
      if ((event.buttons & 1) === 0) {
        stopDragging();
        return;
      }
      input.lookX += event.clientX - lastX;
      input.lookY += event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
    };

    const handlePointerEnd = (event: PointerEvent): void => {
      if (event.pointerId === activePointer) {
        stopDragging();
      }
    };

    const handleWheel = (event: WheelEvent): void => {
      if (!isOverGame(event.target)) {
        return;
      }
      // Stops the page from scrolling or zooming while the pointer is over the game.
      event.preventDefault();
      input.wheel += wheelDeltaInPixels(event);
    };

    const listenerOptions: AddEventListenerOptions = { capture: true };
    window.addEventListener('pointerdown', handlePointerDown, listenerOptions);
    window.addEventListener('pointermove', handlePointerMove, listenerOptions);
    window.addEventListener('pointerup', handlePointerEnd, listenerOptions);
    window.addEventListener('pointercancel', handlePointerEnd, listenerOptions);
    window.addEventListener('blur', stopDragging);
    window.addEventListener('wheel', handleWheel, { capture: true, passive: false });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, listenerOptions);
      window.removeEventListener('pointermove', handlePointerMove, listenerOptions);
      window.removeEventListener('pointerup', handlePointerEnd, listenerOptions);
      window.removeEventListener('pointercancel', handlePointerEnd, listenerOptions);
      window.removeEventListener('blur', stopDragging);
      window.removeEventListener('wheel', handleWheel, { capture: true });
      activePointer = null;
      domElement.style.touchAction = previousTouchAction;
      domElement.style.cursor = previousCursor;
      input.lookX = 0;
      input.lookY = 0;
      input.wheel = 0;
    };
  }, [enabled, domElement, input]);

  return input;
}
