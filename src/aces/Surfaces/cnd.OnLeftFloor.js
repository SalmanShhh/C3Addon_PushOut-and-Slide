export const config = {
  highlight: false,
  isDeprecated: false,
  isTrigger: true,
  isInvertible: false,
  listName: "On left floor",
  displayText: "{my} On left floor",
  description:
    "Triggered on the resolution where the object loses its floor contact (it walked off an edge or was lifted away). Side-scrolling movement style only.",
  params: [],
};

export const expose = false;

export default function () {
  return true;
}
