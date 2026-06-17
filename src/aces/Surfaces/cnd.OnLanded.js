export const config = {
  highlight: false,
  isDeprecated: false,
  isTrigger: true,
  isInvertible: false,
  listName: "On landed",
  displayText: "{my} On landed",
  description:
    "Triggered on the resolution where the object first gains a floor contact (it landed). Side-scrolling movement style only.",
  params: [],
};

export const expose = false;

export default function () {
  return true;
}
