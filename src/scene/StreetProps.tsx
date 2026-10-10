import { useMemo } from 'react';
import type { StreetPropSpec } from '../game/street';
import { InstancedBoxes } from './InstancedBoxes';
import { propBoxes } from './propParts';

interface StreetPropsProps {
  props: readonly StreetPropSpec[];
}

export function StreetProps({ props }: StreetPropsProps) {
  const boxes = useMemo(() => props.flatMap((prop) => propBoxes(prop)), [props]);
  return <InstancedBoxes boxes={boxes} />;
}
