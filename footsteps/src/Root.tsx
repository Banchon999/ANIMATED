import "./fonts";
import { Composition } from "remotion";
import { Film, FILM_LEN, PARTS } from "./Film";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_LEN} fps={30} width={1080} height={1920} />
    {PARTS.map(([id, C, d]) => (
      <Composition key={id} id={id} component={C} durationInFrames={d} fps={30} width={1080} height={1920} />
    ))}
  </>
);
