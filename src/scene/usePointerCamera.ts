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
 * Collects left-button drags and wheel movement on the game canvas.
 * Returns ONE stable object that is updated in place. While `enabled` is false no listeners
 * are attached and the page keeps its normal scrolling and touch behaviour.
 */
export function usePointerCamera(enabled: boolean): PointerCameraInput {
  const domElement = useThree((state) => state.gl.domElement);
  const [input] = useState(createPointerCameraInput);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let activePointer: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const previousTouchAction = domElement.style.touchAction;
    const previousCursor = domElement.style.cursor;
    domElement.style.touchAction = 'none';
    domElement.style.cursor = 'grab';

    const stopDragging = (): void => {
      if (activePointer !== null && domElement.hasPointerCapture(activePointer)) {
        domElement.releasePointerCapture(activePointer);
      }
      activePointer = null;
      domElement.style.cursor = 'grab';
    };

    const handlePointerDown = (event: PointerEvent): void => {
      if (event.button !== 0 || activePointer !== null) {
        return;
      }
      activePointer = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      domElement.setPointerCapture(event.pointerId);
      domElement.style.cursor = 'grabbing';
    };

    const handlePointerMove = (event: PointerEvent): void => {
      if (event.pointerId !== activePointer) {
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
      // Stops the page from scrolling or zooming while the pointer is over the game.
      event.preventDefault();
      input.wheel += wheelDeltaInPixels(event);
    };

    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointermove', handlePointerMove);
    domElement.addEventListener('pointerup', handlePointerEnd);
    domElement.addEventListener('pointercancel', handlePointerEnd);
    domElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerup', handlePointerEnd);
      domElement.removeEventListener('pointercancel', handlePointerEnd);
      domElement.removeEventListener('wheel', handleWheel);
      stopDragging();
      domElement.style.touchAction = previousTouchAction;
      domElement.style.cursor = previousCursor;
      input.lookX = 0;
      input.lookY = 0;
      input.wheel = 0;
    };
  }, [enabled, domElement, input]);

  return input;
}
