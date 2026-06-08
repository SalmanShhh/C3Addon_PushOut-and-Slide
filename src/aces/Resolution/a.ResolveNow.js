export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Resolve now",
  displayText: "Resolve now",
  description:
    "Run one resolution immediately, regardless of Resolve on tick. Triggers On pushed out if a correction is applied, or On became trapped if the object cannot be freed.",
  params: [],
};

export const expose = true;

export default function () {
  this._resolveNow();
}
