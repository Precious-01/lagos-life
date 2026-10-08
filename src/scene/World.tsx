import { useMemo } from 'react';
import { DEFAULT_DISTRICT_CONFIG, generateDistrict } from '../game/district';
import { Buildings } from './Buildings';
import { CameraRig } from './CameraRig';
import { Ground } from './Ground';
import { Lighting } from './Lighting';

export function World() {
  const district = useMemo(() => generateDistrict(DEFAULT_DISTRICT_CONFIG), []);
  const shadowExtent = Math.max(district.width, district.depth) / 2 + 10;

  return (
    <>
      <fog attach="fog" args={['#c9d6e3', 180, 520]} />
      <Lighting shadowExtent={shadowExtent} />
      <Ground district={district} />
      <Buildings buildings={district.buildings} />
      <CameraRig />
    </>
  );
}
