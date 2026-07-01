import {
  ADDON_CATEGORY,
  ADDON_TYPE,
  PLUGIN_TYPE,
  PROPERTY_TYPE,
} from "./template/enums.js";
import _version from "./version.js";
export const addonType = ADDON_TYPE.BEHAVIOR;
export const type = PLUGIN_TYPE.OBJECT;
export const id = "salmanshh_pushoutsolid";
export const name = "Push-Out and Slide";
export const version = _version;
export const minConstructVersion = undefined;
export const author = "SalmanShh";
export const website = "https://www.construct.net";
export const documentation = "https://www.construct.net";
export const description =
  "Push an object out of registered solids after you move it: minimum push-out, wall sliding, sub-stepping for fast movement, and a nearest-open-space eject. You drive the movement, this corrects it.";
export const category = ADDON_CATEGORY.MOVEMENTS;

export const hasDomside = false;
export const files = {
  extensionScript: {
    enabled: false, // set to false to disable the extension script
    watch: true, // set to true to enable live reload on changes during development
    targets: ["x86", "x64"],
    // you don't need to change this, the build step will rename the dll for you. Only change this if you change the name of the dll exported by Visual Studio
    name: "MyExtension",
  },
  fileDependencies: [],
  remoteFileDependencies: [],
  cordovaPluginReferences: [],
  cordovaResourceFiles: [],
};

// categories that are not filled will use the folder name
export const aceCategories = {
  Solids: "Solids",
  Jumpthru: "Jump-thru",
  Resolution: "Resolution",
  Surfaces: "Surfaces",
  Configuration: "Configuration",
};

export const info = {
  // icon: "icon.svg",
  Set: {
    // COMMON to all
    CanBeBundled: true,
    IsDeprecated: false,
    GooglePlayServicesEnabled: false,

    // BEHAVIOR only
    IsOnlyOneAllowed: false,

    // PLUGIN world only
    IsResizable: false,
    IsRotatable: false,
    Is3D: false,
    HasImage: false,
    IsTiled: false,
    SupportsZElevation: false,
    SupportsColor: false,
    SupportsEffects: false,
    MustPreDraw: false,

    // PLUGIN object only
    IsSingleGlobal: false,
  },
  // PLUGIN only
  AddCommonACEs: {
    Position: false,
    SceneGraph: false,
    Size: false,
    Angle: false,
    Appearance: false,
    ZOrder: false,
  },
};

// Property declaration order is the index returned by _getInitProperties():
// 0 resolutionMode, 1 resolveOnTick, 2 enableSliding, 3 slideFriction,
// 4 skinWidth, 5 obstacles, 6 movementStyle, 7 jumpthruSource, 8 enabled
// "Enabled" is intentionally kept last in the panel; the constructor reads by
// these indices, so keep this list and the constructor in sync.
// Step distance, up direction, max floor slope, axis resolution and max push per
// tick are intentionally not panel properties; set each with its Set... action.
export const properties = [
  {
    type: PROPERTY_TYPE.COMBO,
    id: "resolutionMode",
    name: "Resolution mode",
    desc: "How the object is pushed out of a wall. 'Minimum push' moves it the shortest way out (best for most games). 'Axis X only' and 'Axis Y only' push it out sideways or up and down only. 'Nearest open space' searches around for the closest free spot (slower; best used through the Eject action). 'Swept' traces the path from the object's last position to where you moved it and stops at the first wall, so a fast move (such as a mouse drag with Drag & Drop) cannot tunnel through or pop out the far side.",
    options: {
      initialValue: "minimum_push",
      items: [
        { minimum_push: "Minimum push" },
        { axis_x: "Axis X only" },
        { axis_y: "Axis Y only" },
        { nearest_open: "Nearest open space" },
        { swept: "Swept (continuous)" },
      ],
    },
  },
  {
    type: PROPERTY_TYPE.CHECK,
    id: "resolveOnTick",
    name: "Resolve on tick",
    desc: "When ticked, the object is automatically pushed out of walls every frame, right after your events move it. Untick it if you instead want to push out only at specific moments using the Resolve now action.",
    options: {
      initialValue: true,
    },
  },
  {
    type: PROPERTY_TYPE.CHECK,
    id: "enableSliding",
    name: "Enable sliding",
    desc: "When ticked, an object pushed against a wall keeps the part of its motion that runs along the wall and glides along it - the same wall behaviour as the built-in 8-Direction behavior (moving or dragging diagonally into a wall slides along it instead of getting stuck). When unticked the object stops dead where it meets the wall and does not glide along it.",
    options: {
      initialValue: true,
    },
  },
  {
    type: PROPERTY_TYPE.PERCENT,
    id: "slideFriction",
    name: "Slide friction",
    desc: "How much the object is slowed as it slides along a wall while Enable sliding is on. 0% glides freely (like ice), higher values feel grippy or draggy, and 100% removes the glide so it effectively stops at the wall. Has no effect when Enable sliding is off, since the object stops dead there either way.",
    options: {
      initialValue: 0,
    },
  },
  {
    type: PROPERTY_TYPE.FLOAT,
    id: "skinWidth",
    name: "Skin width",
    desc: "A tiny gap, in pixels, left between the object and the wall after a push. It stops the two from being counted as touching again next frame, which can otherwise cause a 1 pixel jitter. The default of 0.5 is invisible; raise it slightly if you still see jitter.",
    options: {
      initialValue: 0.5,
      minValue: 0,
    },
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "obstacles",
    name: "Obstacles",
    desc: "Which objects count as walls. 'Custom' uses the object types you register with the Add solid action, so each object can have its own list. 'Solids' instead uses every object that has Construct's built-in Solid behavior, with no setup needed.",
    options: {
      initialValue: "solids",
      items: [{ custom: "Custom" }, { solids: "Solids" }],
    },
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "movementStyle",
    name: "Movement style",
    desc: "Declares the kind of game so contacts can be labelled. 'Top-down' treats every surface the same (no floor/wall/ceiling meaning) - ideal for top-down games. 'Side-scrolling' classifies each contact against the Up direction into floor, wall or ceiling, which powers the Is on floor / Is on wall / Is on ceiling conditions, the On landed / On hit wall / On hit ceiling triggers, slope readouts and jump-thru platforms.",
    options: {
      initialValue: "top_down",
      items: [
        { top_down: "Top-down" },
        { side_scroller: "Side-scrolling" },
      ],
    },
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "jumpthruSource",
    name: "Jump-thru",
    desc: "Adds one-way platforms you can stand on from above but pass through from below or the side. 'None' disables them. 'Jump-thru behavior' uses every object carrying Construct's built-in Jump-thru behavior, with no setup. 'Custom' uses the object types you register with the Add jump-thru action. Needs an Up direction to know which way is 'down onto' the platform.",
    options: {
      initialValue: "none",
      items: [
        { none: "None" },
        { jumpthru: "Jump-thru behavior" },
        { custom: "Custom" },
      ],
    },
  },
  {
    type: PROPERTY_TYPE.CHECK,
    id: "enabled",
    name: "Enabled",
    desc: "Turn the whole behavior on or off. When off, the object is never pushed out of walls. You can change this while the game runs with the Set enabled action.",
    options: {
      initialValue: true,
    },
  },
];
