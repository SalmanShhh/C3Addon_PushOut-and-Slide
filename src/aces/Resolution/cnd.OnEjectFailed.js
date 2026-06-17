export const config = {
  highlight: false,
  isDeprecated: false,
  isTrigger: true,
  isInvertible: false,
  listName: "On eject failed",
  displayText: "{my} On eject failed",
  description:
    "Triggered when Eject to nearest open space finds no open position within the radius. The object is left at its original position.",
  params: [],
};

export const expose = false;

export default function () {
  return true;
}
