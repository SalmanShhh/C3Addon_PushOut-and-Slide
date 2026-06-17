export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "How many resolutions have passed since the object was last on a floor. 0 while on the floor; grows once it leaves. Use it for coyote time (allow a jump for a few ticks after leaving a ledge). Only updates while Resolve on tick is on.",
  params: [],
};

export const expose = true;

export default function () {
  return this._ticksSinceFloor;
}
