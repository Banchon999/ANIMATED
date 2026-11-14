import { Composition } from "remotion";
import { Demo, TOTAL } from "./Demo";
import { Night, NIGHT_TOTAL } from "./Night";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Demo" component={Demo} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="Night" component={Night} durationInFrames={NIGHT_TOTAL} fps={30} width={1080} height={1920} />
    </>
  );
};
