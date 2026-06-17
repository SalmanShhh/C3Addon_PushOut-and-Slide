export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Eject to nearest open space",
  displayText: "{my} Eject to nearest open space within {0} px",
  description:
    "Search outward for the closest position where this object overlaps no solid, up to the given radius in pixels, and move it there. Triggers On ejected on success or On eject failed otherwise.",
  params: [
    {
      id: "maxRadius",
      name: "Max radius",
      desc: "The maximum distance to search outward, in pixels.",
      type: "number",
      initialValue: "64",
    },
  ],
};

export const expose = true;

export default function (maxRadius) {
  this._ejectToNearestOpenSpace(maxRadius);
}
