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
  Resolution: "Resolution",
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
// 0 enabled, 1 resolutionMode, 2 resolveOnTick, 3 enableSliding, 4 slideFriction,
// 5 stepDistance, 6 obstacles, 7 maxPushPerTick, 8 skinWidth
export const properties = [
  {
    type: PROPERTY_TYPE.CHECK,
    id: "enabled",
    name: "Enabled",
    desc: "Turn the whole behavior on or off. When off, the object is never pushed out of walls. You can change this while the game runs with the Set enabled action.",
    options: {
      initialValue: true,
    },
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "resolutionMode",
    name: "Resolution mode",
    desc: "How the object is pushed out of a wall. 'Minimum push' moves it the shortest way out (best for most games). 'Axis X only' and 'Axis Y only' push it out sideways or up and down only. 'Nearest open space' searches around for the closest free spot (slower; best used through the Eject action).",
    options: {
      initialValue: "minimum_push",
      items: [
        { minimum_push: "Minimum push" },
        { axis_x: "Axis X only" },
        { axis_y: "Axis Y only" },
        { nearest_open: "Nearest open space" },
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
    desc: "When ticked, an object pushed against a wall keeps sliding along it instead of stopping dead. For example, walking diagonally into a wall makes the object glide along the wall rather than getting stuck.",
    options: {
      initialValue: true,
    },
  },
  {
    type: PROPERTY_TYPE.PERCENT,
    id: "slideFriction",
    name: "Slide friction",
    desc: "How much the object slows down while sliding along a wall. 0% glides freely (like ice), 100% stops it the moment it touches a wall. Values in between feel grippy or draggy.",
    options: {
      initialValue: 0,
    },
  },
  {
    type: PROPERTY_TYPE.FLOAT,
    id: "stepDistance",
    name: "Step distance",
    desc: "For fast moving objects. Each frame the object's movement is split into small steps of at most this many pixels, so a fast object cannot jump straight through a thin wall. Set it smaller than your thinnest wall. Leave at 0 to turn stepping off.",
    options: {
      initialValue: 0,
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
    type: PROPERTY_TYPE.FLOAT,
    id: "maxPushPerTick",
    name: "Max push per tick",
    desc: "The most the object can be moved by a single push, in pixels. 0 means no limit, so it is pushed fully clear at once. Set a small number so a deeply stuck object eases out over a few frames instead of snapping a long way in one go.",
    options: {
      initialValue: 0,
      minValue: 0,
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
];
