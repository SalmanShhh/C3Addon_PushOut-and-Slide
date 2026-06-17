export const config = {
  highlight: false,
  isDeprecated: false,
  isTrigger: true,
  isInvertible: false,
  listName: "On pushed out",
  displayText: "{my} On pushed out",
  description:
    "Triggered after a resolution applies a non-zero correction. The LastPush, SurfaceNormal, Slide and OverlapCount expressions describe the correction just applied.",
  params: [],
};

export const expose = false;

export default function () {
  return true;
}
