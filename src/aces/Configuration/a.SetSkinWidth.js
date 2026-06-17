export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set skin width",
  displayText: "{my} Set skin width to {0} px",
  description:
    "Set the gap kept between this object and solids after a push, in pixels.",
  params: [
    {
      id: "pixels",
      name: "Pixels",
      desc: "The gap kept between this object and solids after a push, in pixels.",
      type: "number",
      initialValue: "0.5",
    },
  ],
};

export const expose = true;

export default function (pixels) {
  this._setSkinWidth(pixels);
}
