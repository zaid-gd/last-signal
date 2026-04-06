export type PointerLockControlsHandle = {
  connect: (domElement: HTMLElement) => void;
  domElement?: HTMLElement;
  lock: () => Promise<void> | void;
};

let activePointerLockControls: PointerLockControlsHandle | null = null;

export function setActiveShipCameraControls(controls: PointerLockControlsHandle | null) {
  activePointerLockControls = controls;
}

export function clearActiveShipCameraControls(controls: PointerLockControlsHandle | null) {
  if (activePointerLockControls === controls) {
    activePointerLockControls = null;
  }
}

export function requestShipCameraControl() {
  if (typeof document === 'undefined' || document.pointerLockElement) return;
  if (!activePointerLockControls?.domElement) return;

  activePointerLockControls.connect(activePointerLockControls.domElement);
  const lockRequest = activePointerLockControls.lock();
  if (lockRequest) {
    void lockRequest.catch(() => undefined);
  }
}
