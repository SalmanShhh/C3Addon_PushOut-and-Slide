export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set movement style",
  displayText: "{my} Set movement style to {0}",
  description:
    "Choose whether contacts are labelled. Top-down treats every surface the same; Side-scrolling classifies each contact against the Up direction into floor, wall or ceiling.",
  params: [
    {
      id: "style",
      name: "Style",
      desc: "The movement style to use.",
      type: "combo",
      initialValue: "top_down",
      items: [
        { top_down: "Top-down" },
        { side_scroller: "Side-scrolling" },
      ],
    },
  ],
};

export const expose = true;

export default function (style) {
  this._setMovementStyle(style);
}
