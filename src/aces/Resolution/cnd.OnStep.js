export const config = {
  highlight: false,
  isDeprecated: false,
  isTrigger: true,
  isInvertible: false,
  listName: "On step",
  displayText: "{my} On step",
  description:
    "Triggered for each step this object moves in, when stepping is enabled. Use it to make additional collision tests during fast movement. StepIndex and StepCount are available, and the object is at the current step's resolved position.",
  params: [],
};

export const expose = false;

export default function () {
  return true;
}
