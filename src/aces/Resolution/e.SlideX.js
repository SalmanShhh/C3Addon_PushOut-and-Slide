export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "The X distance of the along-surface movement preserved at the last resolution, in pixels. 0 if no sliding occurred.",
  params: [],
};

export const expose = true;

export default function () {
  return this._slideX;
}
