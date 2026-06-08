export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set step distance",
  displayText: "Set step distance to {0} px",
  description:
    "Set the maximum distance moved per step, in pixels. Movement is broken into steps no larger than this. Set to 0 to disable stepping.",
  params: [
    {
      id: "distance",
      name: "Distance",
      desc: "The maximum distance per step, in pixels. 0 disables stepping.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (distance) {
  this._setStepDistance(distance);
}
