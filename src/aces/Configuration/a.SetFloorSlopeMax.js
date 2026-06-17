export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set max floor slope",
  displayText: "{my} Set max floor slope to {0} degrees",
  description:
    "Set the steepest surface, in degrees from flat, still counted as a floor (or ceiling) rather than a wall. Also limits how far a jump-thru can tilt and still catch a landing. Clamped to 0-90.",
  params: [
    {
      id: "degrees",
      name: "Degrees",
      desc: "The maximum floor slope in degrees (0 to 90).",
      type: "number",
      initialValue: "45",
    },
  ],
};

export const expose = true;

export default function (degrees) {
  this._setFloorSlopeMax(degrees);
}
