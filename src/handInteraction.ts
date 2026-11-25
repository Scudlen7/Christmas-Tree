type Point = { x: number; y: number };
type Command = 'grab' | 'close' | 'previous' | 'next' | 'assemble' | 'scatter';

export function createHandInteraction() {
  return {
    pinched: false,
    palmSince: undefined as number | undefined,
    palmHandled: false,
    swipe: undefined as { x: number; started: number } | 'done' | undefined,
  };
}

export function readHand(
  state: ReturnType<typeof createHandInteraction>,
  landmarks: readonly Point[] | undefined,
  pose: string | undefined,
  aspectRatio: number,
  viewing: boolean,
  now: number,
): { aim?: Point; command?: Command; rotation: number; pinched: boolean } {
  const wrist = landmarks?.[0];
  const thumb = landmarks?.[4];
  const knuckle = landmarks?.[5];
  const index = landmarks?.[8];
  const little = landmarks?.[17];
  if (!wrist || !thumb || !knuckle || !index || !little) {
    Object.assign(state, createHandInteraction());
    return { rotation: 0, pinched: false };
  }

  const distance = (a: Point, b: Point) => Math.hypot((a.x - b.x) * aspectRatio, a.y - b.y);
  const palmWidth = distance(knuckle, little);
  const gap = palmWidth > 0 ? distance(thumb, index) / palmWidth : Infinity;
  const indexForward = distance(wrist, index) > 0.9 * distance(wrist, knuckle);
  const canPinch = pose !== 'Open_Palm' && pose !== 'Closed_Fist' && indexForward;
  const wasPinched = state.pinched;
  // Release farther apart than the grab threshold so landmark jitter can't repeatedly open a photo.
  state.pinched = wasPinched
    ? gap < 0.6 && pose !== 'Open_Palm' && indexForward
    : canPinch && gap < 0.46;
  const pointing = pose === 'Pointing_Up';
  const aiming = pointing || state.pinched || (canPinch && gap < 0.72);
  const aim = aiming ? { x: 1 - index.x, y: index.y } : undefined;
  let command: Command | undefined;

  if (pose === 'Open_Palm') {
    state.palmSince ??= now;
    if (!state.palmHandled && (!viewing || now - state.palmSince >= 450)) {
      command = viewing ? 'close' : 'scatter';
      state.palmHandled = true;
    }
  } else {
    state.palmSince = undefined;
    state.palmHandled = false;
  }

  if (viewing && pointing && aim && !state.pinched) {
    if (state.swipe !== 'done') {
      if (!state.swipe || now - state.swipe.started > 700) state.swipe = { x: aim.x, started: now };
      const offset = aim.x - state.swipe.x;
      if (Math.abs(offset) >= 0.18) {
        command = offset < 0 ? 'next' : 'previous';
        state.swipe = 'done';
      }
    }
  } else {
    state.swipe = undefined;
  }

  if (!viewing && state.pinched && !wasPinched) command = 'grab';
  if (!viewing && !state.pinched && pose === 'Closed_Fist') command = 'assemble';
  const speed = viewing || aiming ? 0 : (0.5 - wrist.x) * 0.15;
  return { aim, command, rotation: Math.abs(speed) > 0.01 ? speed : 0, pinched: state.pinched };
}
