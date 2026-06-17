export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is on slope",
  displayText: "{my} Is on slope",
  description:
    "True if the object is on a floor that is tilted (not level) - i.e. on floor with a non-zero slope angle. Only meaningful in Side-scrolling movement style.",
  params: [],
};

export const expose = true;

export default function () {
  return !!this._onFloor && Math.abs(this._slopeAngle) > 0.5;
}
