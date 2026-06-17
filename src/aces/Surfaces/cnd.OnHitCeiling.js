export const config = {
  highlight: false,
  isDeprecated: false,
  isTrigger: true,
  isInvertible: false,
  listName: "On hit ceiling",
  displayText: "{my} On hit ceiling",
  description:
    "Triggered on the resolution where the object first gains a ceiling contact (it bumped its head). Side-scrolling movement style only.",
  params: [],
};

export const expose = false;

export default function () {
  return true;
}
