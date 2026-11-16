import { Composition } from "remotion";
import { Demo, TOTAL } from "./Demo";
import { Night, NIGHT_TOTAL } from "./Night";
import { PeopleSheet, PoseSheet, WalkSheet } from "./People";
import { WardrobeSheet } from "./WardrobeSheet";
import { SetSheet, SetSheet2 } from "./SetSheet";
import { Clip, clipFrames, validateClip } from "./Clip";
import { MoodSheet, PCH, PCW, PropCell, PropSheet } from "./MoodSheet";
import { CLIPS } from "../clips";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Demo" component={Demo} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="Night" component={Night} durationInFrames={NIGHT_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="PeopleSheet" component={PeopleSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="WalkSheet" component={WalkSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="WardrobeSheet" component={WardrobeSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="SetSheet" component={SetSheet} defaultProps={{} as { only?: number }} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="SetSheet2" component={SetSheet2} defaultProps={{} as { only?: number }} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="MoodSheet" component={MoodSheet} defaultProps={{} as { only?: number }} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="PropSheet" component={PropSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="PropCell" component={PropCell} defaultProps={{ i: 0 }} durationInFrames={1} fps={30} width={PCW} height={PCH} />
      <Composition id="PoseSheet" component={PoseSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
      {CLIPS.map(validateClip).map((c) => (
        <Composition key={c.id} id={`Clip-${c.id}`} component={Clip} defaultProps={{ script: c }} durationInFrames={clipFrames(c)} fps={30} width={1080} height={1920} />
      ))}
    </>
  );
};
