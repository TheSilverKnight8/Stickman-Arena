import { useMusic } from '../lib/audio/useMusic';
import { GameHome } from '../pages/GameHome';

export function FighterHome() {
  useMusic('menu');
  return (
    <GameHome
      game="fighter"
      about={<>Hits build up damage, and damage makes the next hit knock harder. Knock your opponent off the stage. Three stocks each, three minutes.</>}
      unavailable="The Platfighter is built in Stage 2. Rooms and CPU games for it open then."
      onCreate={() => {}}
      onJoin={() => {}}
    />
  );
}
