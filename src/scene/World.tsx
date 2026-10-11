import { buildStreetInteractions } from '../game/interaction';
import { DEFAULT_STREET_LAYOUT } from '../game/street';
import { InteractionMarkers } from './InteractionMarkers';
import { Lighting } from './Lighting';
import { PlayerRig } from './PlayerRig';
import { StreetBuildings } from './StreetBuildings';
import { StreetGround } from './StreetGround';
import { StreetProps } from './StreetProps';

/** Half-width of the area that must receive shadows. The street is 80 m by 44 m. */
const SHADOW_EXTENT = 50;

const INTERACTIONS = buildStreetInteractions(DEFAULT_STREET_LAYOUT);

export function World() {
  const street = DEFAULT_STREET_LAYOUT;

  return (
    <>
      <fog attach="fog" args={['#c9d6e3', 180, 520]} />
      <Lighting shadowExtent={SHADOW_EXTENT} />
      <StreetGround street={street} />
      <StreetBuildings buildings={street.buildings} />
      <StreetProps props={street.props} />
      <InteractionMarkers points={INTERACTIONS} />
      <PlayerRig
        colliders={street.colliders}
        bounds={street.bounds}
        spawn={street.spawn}
        spawnHeading={street.spawnHeading}
        interactions={INTERACTIONS}
      />
    </>
  );
}
