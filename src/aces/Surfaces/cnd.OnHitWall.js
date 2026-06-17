export const config = {
  highlight: false,
  isDeprecated: false,
  isTrigger: true,
  isInvertible: false,
  listName: "On hit wall",
  displayText: "{my} On hit wall",
  description:
    "Triggered on the resolution where the object first gains a wall contact. Read WallSide for which side the wall is on. Side-scrolling movement style only.",
  params: [],
};

export const expose = false;

export default function () {
  return true;
}
