<img src="./src/icon.svg" width="100" /><br>
# Push-Out and Slide
<i>Push an object out of registered solids after you move it: minimum push-out, wall sliding, sub-stepping for fast movement, and a nearest-open-space eject. You drive the movement, this corrects it.</i> <br>
### Version 1.1.0.0

[<img src="https://placehold.co/200x50/4493f8/FFF?text=Download&font=montserrat" width="200"/>](https://github.com/SalmanShhh/C3Addon_PushOut-and-Slide/releases/download/salmanshh_pushoutsolid-1.1.0.0.c3addon/salmanshh_pushoutsolid-1.1.0.0.c3addon)
<br>
<sub> [See all releases](https://github.com/SalmanShhh/C3Addon_PushOut-and-Slide/releases) </sub> <br>

#### What's New in 1.1.0.0
- **Added:** - Swept (continuous) resolution mode,  traces the move and stops at the first wall; built for Drag & Drop and any large per-tick jump.
- **Added:** - Movement style property (Top-down / Side-scrolling), classifies each contact as floor, wall or ceiling in side-scrolling games.
- **Added:** - Up direction property (Up/Down/Left/Right) for normal, flipped, or sideways gravity.
- **Added:** - Max floor slope property, the angle threshold separating floor/ceiling from wall (also limits jump-thru landing tilt).
- **Added:** - Axis resolution property (Minimum / Separate (gravity axis first)), platformer-stable land-then-touch-wall ordering.
- **Added:** - Jump-thru one-way platforms via Construct's built-in Jump-thru behavior (None / Jump-thru behavior / Custom source), with Add/Remove/Clear jump-thru, Is jump-thru, JumpthruCount, GetJumpthruByIndex
- **Added:** - Surfaces category: conditions Is on floor/wall/ceiling/slope; triggers On landed, On left floor, On hit wall, On hit ceiling; expressions FloorNormalX/Y, SlopeAngle, WallSide, TicksSinceFloor (coyote time).
- **Added:** New Configuration actions: Set movement style, Set up direction, Set max floor slope, Set axis resolution, Set jump-thru source; plus MovementStyle expression.
- **Added:** - New debugger fields
- **Changed:** - Every expression is now exposed to scripting, is fully supported via the ACEs.
- **Changed:** - {my} icon token added to all action/condition/trigger display texts (new and existing)

<sub>[View full changelog](#changelog)</sub>

---
<b><u>Author:</u></b> SalmanShh <br>
<sub>Made using [CAW](https://marketplace.visualstudio.com/items?itemName=skymen.caw) </sub><br>

## Table of Contents
- [Usage](#usage)
- [Examples Files](#examples-files)
- [Properties](#properties)
- [Actions](#actions)
- [Conditions](#conditions)
- [Expressions](#expressions)
---
## Usage
To build the addon, run the following commands:

```
npm i
npm run build
```

To run the dev server, run

```
npm i
npm run dev
```

## Examples Files
| Description | Download |
| --- | --- |
| PushOut example | [<img src="https://placehold.co/120x30/4493f8/FFF?text=Download&font=montserrat" width="120"/>](https://github.com/SalmanShhh/C3Addon_PushOut-and-Slide/raw/refs/heads/main/examples/PushOut%20example.c3p) |

---
## Properties
| Property Name | Description | Type |
| --- | --- | --- |
| Resolution mode | How the object is pushed out of a wall. 'Minimum push' moves it the shortest way out (best for most games). 'Axis X only' and 'Axis Y only' push it out sideways or up and down only. 'Nearest open space' searches around for the closest free spot (slower; best used through the Eject action). 'Swept' traces the path from the object's last position to where you moved it and stops at the first wall, so a fast move (such as a mouse drag with Drag & Drop) cannot tunnel through or pop out the far side. | combo |
| Resolve on tick | When ticked, the object is automatically pushed out of walls every frame, right after your events move it. Untick it if you instead want to push out only at specific moments using the Resolve now action. | check |
| Enable sliding | When ticked, an object pushed against a wall keeps sliding along it instead of stopping dead. For example, walking diagonally into a wall makes the object glide along the wall rather than getting stuck. | check |
| Slide friction | How much the object slows down while sliding along a wall. 0% glides freely (like ice), 100% stops it the moment it touches a wall. Values in between feel grippy or draggy. | percent |
| Step distance | For fast moving objects. Each frame the object's movement is split into small steps of at most this many pixels, so a fast object cannot jump straight through a thin wall. Set it smaller than your thinnest wall. Leave at 0 to turn stepping off. | float |
| Obstacles | Which objects count as walls. 'Custom' uses the object types you register with the Add solid action, so each object can have its own list. 'Solids' instead uses every object that has Construct's built-in Solid behavior, with no setup needed. | combo |
| Skin width | A tiny gap, in pixels, left between the object and the wall after a push. It stops the two from being counted as touching again next frame, which can otherwise cause a 1 pixel jitter. The default of 0.5 is invisible; raise it slightly if you still see jitter. | float |
| Movement style | Declares the kind of game so contacts can be labelled. 'Top-down' treats every surface the same (no floor/wall/ceiling meaning) - ideal for top-down games. 'Side-scrolling' classifies each contact against the Up direction into floor, wall or ceiling, which powers the Is on floor / Is on wall / Is on ceiling conditions, the On landed / On hit wall / On hit ceiling triggers, slope readouts and jump-thru platforms. | combo |
| Up direction | Which screen direction points away from gravity, used to tell a floor from a ceiling in Side-scrolling style (and to land objects on jump-thru platforms). 'Up' is normal gravity (a floor is below you). Use 'Down', 'Left' or 'Right' for flipped or sideways gravity. Ignored in Top-down style. | combo |
| Max floor slope | The steepest surface, in degrees from flat, still counted as a floor (or ceiling) rather than a wall in Side-scrolling style. 45 treats anything up to a 45 degree ramp as walkable ground; a surface steeper than this is a wall. Also sets how far from level a jump-thru can tilt and still catch a landing. | float |
| Axis resolution | How overlaps are cleared. 'Minimum' pushes out along the single shortest direction (best for top-down). 'Separate (gravity axis first)' clears the gravity axis (floors and ceilings) before the cross axis (walls), which gives platformers the stable land-then-touch-wall behaviour and clean corners. | combo |
| Jump-thru | Adds one-way platforms you can stand on from above but pass through from below or the side. 'None' disables them. 'Jump-thru behavior' uses every object carrying Construct's built-in Jump-thru behavior, with no setup. 'Custom' uses the object types you register with the Add jump-thru action. Needs an Up direction to know which way is 'down onto' the platform. | combo |
| Enabled | Turn the whole behavior on or off. When off, the object is never pushed out of walls. You can change this while the game runs with the Set enabled action. | check |


---
## Actions
| Action | Description | Params
| --- | --- | --- |
| Set axis resolution | Choose how overlaps are cleared. Minimum pushes along the single shortest direction (best for top-down). Separate clears the gravity axis before the cross axis, the stable land-then-touch-wall behaviour platformers expect. | Mode             *(combo)* <br> |
| Set max floor slope | Set the steepest surface, in degrees from flat, still counted as a floor (or ceiling) rather than a wall. Also limits how far a jump-thru can tilt and still catch a landing. Clamped to 0-90. | Degrees             *(number)* <br> |
| Set jump-thru source | Choose where one-way platforms come from. None disables them. Jump-thru behavior uses every object with the built-in Jump-thru behavior. Custom uses the types added with Add jump-thru. | Source             *(combo)* <br> |
| Set max push per tick | Set the maximum length of a single correction, in pixels. Set to 0 for no limit. | Pixels             *(number)* <br> |
| Set movement style | Choose whether contacts are labelled. Top-down treats every surface the same; Side-scrolling classifies each contact against the Up direction into floor, wall or ceiling. | Style             *(combo)* <br> |
| Set obstacles | Choose which objects count as walls: Custom uses the types added with Add solid, Solids uses every object with the built-in Solid behavior. | Obstacles             *(combo)* <br> |
| Set resolution mode | Set how the push-out correction is computed. | Mode             *(combo)* <br> |
| Set skin width | Set the gap kept between this object and solids after a push, in pixels. | Pixels             *(number)* <br> |
| Set slide friction | Set the fraction of along-surface speed lost per resolution, from 0 (frictionless) to 1 (full stop). Values are clamped to that range. | Friction             *(number)* <br> |
| Set sliding enabled | Set whether the object slides along solid surfaces instead of stopping at them. | Enabled             *(boolean)* <br> |
| Set step distance | Set the maximum distance moved per step, in pixels. Movement is broken into steps no larger than this. Set to 0 to disable stepping. | Distance             *(number)* <br> |
| Set up direction | Set which screen direction points away from gravity. Used in Side-scrolling style to tell a floor from a ceiling and to land objects on jump-thru platforms. | Direction             *(combo)* <br> |
| Add jump-thru | Add an object type as a one-way platform for this object (used when Jump-thru source is Custom). The object can stand on instances of that type from above but pass through from below or the side. | Object             *(object)* <br> |
| Clear jump-thrus | Remove all object types from this object's jump-thru registry. |  |
| Remove jump-thru | Stop treating an object type as a one-way platform for this object. | Object             *(object)* <br> |
| Eject to nearest open space | Search outward for the closest position where this object overlaps no solid, up to the given radius in pixels, and move it there. Triggers On ejected on success or On eject failed otherwise. | Max radius             *(number)* <br> |
| Resolve now | Run one resolution immediately, regardless of Resolve on tick. Triggers On pushed out if a correction is applied, or On became trapped if the object cannot be freed. |  |
| Set enabled | Set whether the behavior resolves. | Enabled             *(boolean)* <br> |
| Add solid | Add an object type as a solid for this object. Instances of that type will push this object out. Adding the same type twice has no effect. | Object             *(object)* <br> |
| Clear solids | Remove all object types from this object's solid registry. |  |
| Remove solid | Stop treating an object type as a solid for this object. | Object             *(object)* <br> |


---
## Conditions
| Condition | Description | Params
| --- | --- | --- |
| Is jump-thru | True if the given object type is registered as a one-way platform for this object. | Object *(object)* <br> |
| Is enabled | True if the behavior is enabled. |  |
| Is overlapping solid | True if this object currently overlaps at least one registered solid. |  |
| Is sliding | True if the last resolution preserved along-surface movement. |  |
| Is trapped | True if the last resolution left this object wedged against opposing solids. |  |
| On became trapped | Triggered when a resolution cannot free the object because it overlaps solids on opposing sides. OverlapCount reports how many solids it is wedged against. |  |
| On ejected | Triggered after Eject to nearest open space succeeds. LastPushX and LastPushY give the offset from the original to the ejected position. |  |
| On eject failed | Triggered when Eject to nearest open space finds no open position within the radius. The object is left at its original position. |  |
| On pushed out | Triggered after a resolution applies a non-zero correction. The LastPush, SurfaceNormal, Slide and OverlapCount expressions describe the correction just applied. |  |
| On step | Triggered for each step this object moves in, when stepping is enabled. Use it to make additional collision tests during fast movement. StepIndex and StepCount are available, and the object is at the current step's resolved position. |  |
| Is solid | True if the given object type is registered as a solid for this object. | Object *(object)* <br> |
| Is on ceiling | True if the last resolution pushed the object off a ceiling (a surface facing against the Up direction). Only meaningful in Side-scrolling movement style. |  |
| Is on floor | True if the last resolution pushed the object off a floor (a surface facing the Up direction). Only meaningful in Side-scrolling movement style. |  |
| Is on slope | True if the object is on a floor that is tilted (not level) - i.e. on floor with a non-zero slope angle. Only meaningful in Side-scrolling movement style. |  |
| Is on wall | True if the last resolution pushed the object off a wall (a surface too steep to be a floor or ceiling). Only meaningful in Side-scrolling movement style. |  |
| On hit ceiling | Triggered on the resolution where the object first gains a ceiling contact (it bumped its head). Side-scrolling movement style only. |  |
| On hit wall | Triggered on the resolution where the object first gains a wall contact. Read WallSide for which side the wall is on. Side-scrolling movement style only. |  |
| On landed | Triggered on the resolution where the object first gains a floor contact (it landed). Side-scrolling movement style only. |  |
| On left floor | Triggered on the resolution where the object loses its floor contact (it walked off an edge or was lifted away). Side-scrolling movement style only. |  |


---
## Expressions
| Expression | Description | Return Type | Params
| --- | --- | --- | --- |
| MovementStyle | The current movement style key (top_down or side_scroller). | string |  | 
| ResolutionMode | The current resolution mode key (minimum_push, axis_x, axis_y, nearest_open or swept). | string |  | 
| GetJumpthruByIndex | The name of the registered jump-thru object type at the given 0-based index. | string | Index *(number)* <br> | 
| JumpthruCount | The number of object types currently registered as jump-thrus. | number |  | 
| LastPushDistance | The length of the last correction, in pixels. 0 if the last resolution moved nothing. | number |  | 
| LastPushX | The X distance of the last correction, in pixels. | number |  | 
| LastPushY | The Y distance of the last correction, in pixels. | number |  | 
| OverlapCount | The number of distinct solids the object overlapped at the last resolution. | number |  | 
| SlideDistance | The length of the along-surface movement preserved at the last resolution, in pixels. | number |  | 
| SlideX | The X distance of the along-surface movement preserved at the last resolution, in pixels. 0 if no sliding occurred. | number |  | 
| SlideY | The Y distance of the along-surface movement preserved, in pixels. | number |  | 
| StepCount | The number of steps the object moves in during the current tick. 1 when stepping is disabled. | number |  | 
| StepIndex | The index of the current step, starting at 0. Meaningful inside On step. | number |  | 
| SurfaceNormalX | The X component of the unit surface normal the object was pushed off (the push-out direction). 0 if nothing moved. | number |  | 
| SurfaceNormalY | The Y component of the unit surface normal. Use with SurfaceNormalX to detect which side a wall is on. | number |  | 
| GetSolidByIndex | The name of the registered solid object type at the given 0-based index. | string | Index *(number)* <br> | 
| SolidCount | The number of object types currently registered as solids. | number |  | 
| FloorNormalX | The X component of the unit normal of the last floor contact (points away from the floor). 0 if no floor has been contacted. | number |  | 
| FloorNormalY | The Y component of the unit normal of the last floor contact (points away from the floor). 0 if no floor has been contacted. | number |  | 
| SlopeAngle | The signed angle of the current floor relative to level, in degrees. 0 on flat ground; positive when the floor tilts down toward the object's right. Meaningful while Is on floor is true. | number |  | 
| TicksSinceFloor | How many resolutions have passed since the object was last on a floor. 0 while on the floor; grows once it leaves. Use it for coyote time (allow a jump for a few ticks after leaving a ledge). Only updates while Resolve on tick is on. | number |  | 
| WallSide | Which side a contacted wall is on, relative to the Up direction: -1 wall on the object's left, +1 wall on its right, 0 if not on a wall. | number |  | 


---
## Changelog

**1.1.0.0**
- **Added:** - Swept (continuous) resolution mode,  traces the move and stops at the first wall; built for Drag & Drop and any large per-tick jump.
- **Added:** - Movement style property (Top-down / Side-scrolling), classifies each contact as floor, wall or ceiling in side-scrolling games.
- **Added:** - Up direction property (Up/Down/Left/Right) for normal, flipped, or sideways gravity.
- **Added:** - Max floor slope property, the angle threshold separating floor/ceiling from wall (also limits jump-thru landing tilt).
- **Added:** - Axis resolution property (Minimum / Separate (gravity axis first)), platformer-stable land-then-touch-wall ordering.
- **Added:** - Jump-thru one-way platforms via Construct's built-in Jump-thru behavior (None / Jump-thru behavior / Custom source), with Add/Remove/Clear jump-thru, Is jump-thru, JumpthruCount, GetJumpthruByIndex
- **Added:** - Surfaces category: conditions Is on floor/wall/ceiling/slope; triggers On landed, On left floor, On hit wall, On hit ceiling; expressions FloorNormalX/Y, SlopeAngle, WallSide, TicksSinceFloor (coyote time).
- **Added:** New Configuration actions: Set movement style, Set up direction, Set max floor slope, Set axis resolution, Set jump-thru source; plus MovementStyle expression.
- **Added:** - New debugger fields
- **Changed:** - Every expression is now exposed to scripting, is fully supported via the ACEs.
- **Changed:** - {my} icon token added to all action/condition/trigger display texts (new and existing)

**1.0.1.0**

**1.0.0.0**

**0.0.0.0**
- **Added:** Initial release.
