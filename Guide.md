# Push-Out and Slide - Behavior Guide

Push-Out and Slide is a single purpose collision behavior for Construct 3. You move an object however you like (a Tween, a lerp, a manual Set X/Y, a knockback impulse, a custom velocity system, or just placing it at spawn), and after that movement Push-Out and Slide checks whether the object ended up overlapping anything you registered as a solid. If it did, the behavior computes the smallest correction that returns it to open space and applies it. With sliding on, the part of your movement that ran along the wall is kept, so the object glides past instead of catching. With stepping on, the movement is replayed in small increments and an "On step" trigger fires at each one, so fast movement is tested for collisions along its whole path. The behavior never moves the object on its own: you drive, it corrects.

---

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [Project Setup](#2-project-setup)
3. [Plugin Properties](#3-plugin-properties)
4. [Choosing What Counts as a Wall](#4-choosing-what-counts-as-a-wall)
5. [Resolution: When and How the Push-Out Runs](#5-resolution-when-and-how-the-push-out-runs)
6. [Sliding Along Walls](#6-sliding-along-walls)
7. [Stepping for Fast Movement](#7-stepping-for-fast-movement)
8. [Ejecting From Inside Walls](#8-ejecting-from-inside-walls)
9. [Reading the Correction (Normals, Push, Slide)](#9-reading-the-correction-normals-push-slide)
10. [Actions Reference](#10-actions-reference)
11. [Conditions Reference](#11-conditions-reference)
12. [Expressions Reference](#12-expressions-reference)
13. [Triggers Reference](#13-triggers-reference)
14. [Game Use Cases](#14-game-use-cases)
15. [Using Multiple Behavior Instances](#15-using-multiple-behavior-instances)
16. [C3 Debugger](#16-c3-debugger)
17. [Scripting (C3 Script / JavaScript)](#17-scripting-c3-script--javascript)
18. [Save and Load](#18-save-and-load)
19. [Tips and Common Mistakes](#19-tips-and-common-mistakes)

---

## 1. Core Concepts

### The problem this addon solves

Construct's built in movement behaviors (Platform, 8 Direction, Car, Bullet with bounce) push themselves out of solids automatically because they call the engine's internal push-out routine every step. The moment you move an object *without* one of those behaviors, that automatic correction is gone. A Tweened door, a lerped camera target, a knockback that adds a one frame offset, a dragged puzzle piece, or an object dropped by a generator embeds itself in the geometry, and you are left writing it back out by hand.

Doing that by hand is the tedium this behavior replaces. The usual hand rolled version means per object instance variables tracking "last safe X/Y", nested events testing *Is overlapping* against every wall type, copy pasted "if overlapping, step back along the movement direction" loops that jitter at corners, and a separate tangle of logic for the spawn case where an object appears *inside* a wall. The naive version also stops the object dead at first contact (so it cannot slide) and only resolves at the final position each tick (so a fast object passes straight through thin geometry).

Push-Out and Slide offers a single contract instead: **register the object types that are solid, and after each movement the object will sit flush against them, never inside them, sliding along them where it should and tested for collisions along its path.**

### Key design decisions

- **You drive, the behavior corrects.** It never sets velocity, never reads input, never adds gravity. It runs as a post movement correction pass: once your logic has placed the object for the tick, it tests for overlap and nudges it back out. If you do nothing, it does nothing.
- **Sliding preserves your motion, it does not create motion.** With sliding on, the behavior derives the tick's movement from the change in position and keeps the component that runs along the contacted surface. It adds nothing of its own; it only redirects the movement you applied.
- **Walls come from the Solid behavior or an explicit list.** There is no magic tag. By default (**Obstacles = Solids**) the behavior pushes out of every object with Construct's built in **Solid** behavior, with no registration. Switch **Obstacles** to **Custom** and you instead use *Add solid* to make specific object types solid for this object (and *Remove solid* to stop), giving each object its own list. The two are exclusive, exactly like the Line of Sight behavior's Obstacles property.
- **Per instance registries.** Each behavior instance owns its own list of solids, so a ghost can pass through walls a player cannot, just by registering different types. There is no shared global state. You can even add more than one copy of the behavior to the same object to get separate collision channels with different settings, see [section 15](#15-using-multiple-behavior-instances).
- **Documented APIs only.** Every push-out, slide and step is computed from Construct's public collision query, overlap test and geometry APIs. The behavior never calls the engine's internal push-out routines, so it stays stable across Construct updates.

### Key concepts at a glance

| Term | What it means |
|---|---|
| **Solid** | An object type you registered as solid for this object. This object is pushed out of any instance of a registered type it overlaps. |
| **Resolution** | One de-penetration pass: detect overlap, compute the correction, move the object clear (sliding if enabled), and trigger *On pushed out* if anything moved. |
| **Surface normal** | The unit direction the push-out points, away from the solid surface. The slide is your movement with the normal component removed. |
| **Slide** | Keeping the component of your movement that runs along a contacted surface, so the object glides along the wall instead of stopping. |
| **Step** | Moving in small increments along the tick's movement, resolving and triggering *On step* at each, so fast movement is tested along its path. |
| **Eject** | A one shot outward search (*Eject to nearest open space*) that finds the closest non overlapping position, for the spawn inside a wall case. |

### Scenarios where this addon excels

- **Custom movement objects that still respect walls.** Anything you move by Tween, lerp, sine or hand written velocity gets wall collision without adopting a full movement behavior.
- **Smooth wall sliding without vector math.** Diagonal approaches glide along walls instead of catching, with no per tick tangent/normal decomposition on your part.
- **Fast custom projectiles without tunnelling.** Stepping subdivides the movement so a fast object is tested along its path, and *On step* lets you add hit checks at each increment.
- **Spawn safe placement at scale.** When a generator drops hundreds of objects and some land inside walls, one *Eject to nearest open space* per object relocates each to the nearest gap.
- **Inside corner contact without jitter.** Top down and side on games where objects slide into concave corners settle stably rather than buzzing between axes.
- **Lightweight collision for objects that do not need physics.** Where Physics is overkill, this provides "stays out of walls and slides along them" for the cost of a per tick overlap query.

---

## 2. Project Setup

1. **Install the addon.** In Construct 3 open Menu -> View -> Addon Manager -> Install new addon, and pick `salmanshh_pushoutsolid-1.0.0.0.c3addon`.
2. **Add the behavior.** Select the object you move yourself (the player, a draggable block, a projectile) and in the Properties Bar click *Behaviors -> Add new behavior -> Push-Out and Slide*. Construct gives the behavior a default name on the object; this guide refers to it as `PushOutAndSlide` in expressions and script. Whatever name your editor shows is the one to use, and you can rename it in the Properties Bar (renaming it to `PushOutAndSlide` makes the examples here copy-paste exactly).
3. **Tell it what the walls are.** By default the **Obstacles** property is **Solids**, so any object with Construct's built in Solid behavior is automatically a wall. Give your walls the Solid behavior and there is nothing to register. If you would rather list specific object types yourself (including ones without the Solid behavior), set **Obstacles** to **Custom** and register them with *Add solid*. See [section 4](#4-choosing-what-counts-as-a-wall).
4. **Move the object however you like.** The behavior corrects it after your movement each tick.

A complete first example, using the default Solids mode: a top down player moved by raw keyboard input, kept out of any object that has the Solid behavior.

```
Event: Keyboard: Right arrow is down
  Action: Player | Set X to Self.X + 200 * dt

Event: Keyboard: Up arrow is down
  Action: Player | Set Y to Self.Y - 200 * dt
  // Walls carry the built-in Solid behavior and Obstacles is left at its default (Solids),
  // so no registration is needed. Push-Out and Slide corrects the position after these run.
```

With *Resolve on tick* and *Enable sliding* both on (the defaults), the player now slides along walls instead of stopping dead, and never ends a tick embedded in one.

---

## 3. Plugin Properties

These appear in the Properties Bar when Push-Out and Slide is selected on its object. All of them can be changed live with the matching *Set* action.

| Property | Type | Default | Description |
|---|---|---|---|
| **Enabled** | Boolean | `true` | Whether the behavior resolves at all. Toggle live with *Set enabled*. |
| **Resolution mode** | Dropdown | `Minimum push` | How the correction is computed: `Minimum push`, `Axis X only`, `Axis Y only`, `Nearest open space`. See [section 5](#5-resolution-when-and-how-the-push-out-runs). |
| **Resolve on tick** | Boolean | `true` | When on, the object is checked and corrected every tick after movement. When off, only *Resolve now* resolves. |
| **Enable sliding** | Boolean | `true` | When on, movement along a contacted surface is preserved so the object glides along walls instead of stopping. |
| **Slide friction** | Percent | `0%` | Fraction of along surface speed lost per resolution while sliding. 0% is a frictionless glide; 100% is a full stop. |
| **Step distance** | Float | `0` | Maximum distance moved per step, in pixels. Movement is broken into steps no larger than this, triggering *On step* at each. 0 disables stepping. |
| **Obstacles** | Dropdown | `Solids` | Which objects count as walls. `Solids` (the default) uses every object with Construct's built in Solid behavior, with no setup. `Custom` instead uses the types you register with *Add solid* (each object has its own list). The two modes are exclusive, like the Line of Sight behavior's Obstacles property. |
| **Skin width** | Float | `0.5` | Gap kept between the object and a solid after a push, in pixels, to prevent floating point re-overlap on the next tick. |

> **Max push per tick** is not in the property panel; it defaults to 0 (no limit) and is set from events with the *Set max push per tick* action. See [section 5](#5-resolution-when-and-how-the-push-out-runs).

> Resolution mode, Slide friction, Step distance and Skin width are read fresh on every resolution, so changing them with an action takes effect immediately.

---

## 4. Choosing What Counts as a Wall

The **Obstacles** property decides where the behavior gets its walls, and it works exactly like the Obstacles property on Construct's Line of Sight behavior: it is one mode *or* the other, never both.

### Solids mode (default)

By default Obstacles is **Solids**. Any object that has Construct's built in **Solid** behavior (and has it enabled) is treated as a wall automatically. There is nothing to register: give your walls the Solid behavior and you are done. Because Solids are checked at query time, turning a Solid behavior on or off at runtime is reflected immediately.

```
Properties Bar: Obstacles = Solids   (the default)

Event: Every tick
  Action: Player | Set position to (MouseX, MouseY)
  // The player follows the mouse and is pushed out of every Solid object. No setup events.
```

### Custom mode (you list the types)

Set Obstacles to **Custom** when your walls do not use the Solid behavior, or when you want each object to have its own private list of obstacles. In Custom mode you hand the behavior a list of object types with **Add solid**, and it pushes this object out of any instance of those types. The list is per behavior instance, so two objects can treat different things as solid with no coordination.

```
Event: On start of layout
  Action: Player | Push-Out and Slide: Set obstacles -> Custom
  Action: Player | Push-Out and Slide: Add solid -> Wall
  Action: Player | Push-Out and Slide: Add solid -> Crate
  Action: Player | Push-Out and Slide: Add solid -> Door
  // The player is now pushed out of Walls, Crates and Doors only.
```

Stop treating a type as solid with **Remove solid**, or wipe the whole list with **Clear solids**.

```
Event: Player | Picked up the ghost powerup
  Action: Player | Push-Out and Slide: Remove solid -> Wall
  // The player can now pass through walls while the powerup lasts.
```

You can read the registry back at runtime using the Count plus Index pair, which is the idiomatic Construct way to loop a list:

```
Event: On some debug key pressed
  Action: System | Repeat Player.PushOutAndSlide.SolidCount times
    Action: Debug | Append text -> Player.PushOutAndSlide.GetSolidByIndex(loopindex) & newline
```

> **Gotcha:** The modes are exclusive. In **Solids** mode the *Add solid* registry is ignored; in **Custom** mode objects are walls only if you registered their type, even if they have a Solid behavior. The examples in this guide that call *Add solid* assume Obstacles is set to **Custom**.

> **Gotcha:** *Add solid* takes an object *type*, not an instance. You are saying "all Walls are solid for me", not "this one Wall". Adding the same type twice has no effect.

---

## 5. Resolution: When and How the Push-Out Runs

A **resolution** is one de-penetration pass. The behavior gathers the registered solids near the object, finds the ones it overlaps, computes the smallest correction, and moves the object clear. If anything moved, *On pushed out* fires.

### When it runs

With **Resolve on tick** on (the default), a resolution runs every tick *after* the event sheet has moved the object, so the behavior always sees the object's final position for the frame and corrects from there.

Turn *Resolve on tick* off when you want push-out to happen exactly once after a discrete operation (a teleport, a single drag step, a settling gem). Then nothing happens until you call **Resolve now**.

```
Event: On gem arc finished
  Action: Gem | Push-Out and Slide: Resolve now
  // Push the gem to the surface once, the moment it lands, instead of every tick.
```

### How the correction is computed (Resolution mode)

| Mode key | Behavior |
|---|---|
| `minimum_push` | Push along whichever direction frees the object with the least movement, with corner stabilisation. The general purpose default; sliding applies along the resolved surface. |
| `axis_x` | Only ever push horizontally. For movers constrained to vertical lanes. |
| `axis_y` | Only ever push vertically. For platform style "land on the surface" correction. |
| `nearest_open` | Search outward for the closest non overlapping position rather than pushing on one axis. Sliding does not apply, and it is the most expensive mode; prefer it as a one shot eject. |

Change it live:

```
Event: Player | entered a vertical shaft
  Action: Player | Push-Out and Slide: Set resolution mode -> Axis X only
  // In the shaft, only ever correct sideways so the player can fall freely.
```

### Corner stability and Max push per tick

At a concave corner, a naive shortest axis push flips between X and Y on consecutive ticks and the object visibly buzzes. Push-Out and Slide resolves against the deepest penetrating solid first, blends the slide direction with the previous tick's contact normal, and iterates a bounded number of times per tick so multi wall contacts settle cleanly.

**Max push per tick** caps the length of any single correction. It is not a property; it lives only as the *Set max push per tick* action and defaults to 0 (no limit). Leave it at 0 for instant resolution. Set a small value when an object can end up deeply embedded and you want it eased out over a few ticks instead of snapping:

```
Event: On start of layout
  Action: Enemy | Push-Out and Slide: Set max push per tick -> 8
  // A deeply stuck enemy slides out at most 8 px per tick rather than teleporting clear.
```

---

## 6. Sliding Along Walls

With **Enable sliding** on, the behavior keeps the part of your movement that runs *along* a contacted surface and only cancels the part going *into* it. The result is that a diagonal push against a wall converts smoothly into movement along the wall, instead of the object stopping at first contact.

You do not write any vector math. Move the object straight into a wall at an angle and it glides:

```
Event: Every tick
  Action: Player | Set position to (Self.X + 200*dt, Self.Y + 200*dt)
  // Moving down-right into a vertical wall. With sliding on, the player
  // keeps sliding downward along the wall instead of halting.
```

**Slide friction** decides how much along surface speed is shed per resolution. At 0% the glide is frictionless. At 100% the object stops the moment it touches, exactly as if sliding were off. A middle value gives a draggy, grippy feel:

```
Event: Player | walking on ice
  Action: Player | Push-Out and Slide: Set slide friction -> 0
Event: Player | walking on mud
  Action: Player | Push-Out and Slide: Set slide friction -> 0.6
```

Check whether the last resolution actually slid, and read how far it slid:

```
Event: Player | Push-Out and Slide: Is sliding
  Action: Player | Set animation to "WallSlide"
  Action: Audio | Set Scrape volume to Player.PushOutAndSlide.SlideDistance * 2
```

> **Gotcha:** Sliding only redistributes movement you applied this tick. If the object is not moving, there is nothing to slide. And a huge one frame jump (a teleport) is treated as placement, so no slide is projected from it.

---

## 7. Stepping for Fast Movement

By default a resolution happens once, at the object's final position. That is perfect for normally moving objects, but a very fast object can pass straight through a thin wall in a single tick because it was never *inside* the wall at the moment the check ran.

**Step distance** fixes this. Set it to a value smaller than the thinnest solid and the tick's movement is replayed in increments no larger than that distance. At each increment the behavior resolves push-out and fires **On step**, so you can run your own collision tests at every point along the path.

```
Event: On start of layout
  Action: Bullet | Push-Out and Slide: Add solid -> Wall
  Action: Bullet | Push-Out and Slide: Set step distance -> 8
  // The bullet is tested every 8 px along its path, so it cannot skip a thin wall.

Event: Bullet | Push-Out and Slide: On step
  Event: Bullet | is overlapping Enemy
    Action: Enemy | Subtract 10 from health
    Action: Bullet | Destroy
    // Runs at the exact point along the path where the bullet crosses an enemy.
```

Inside *On step*, **StepIndex** is the current step (starting at 0) and **StepCount** is how many steps this tick was split into. The object is sitting at the current step's resolved position when the trigger fires, so any overlap test you run sees it mid path.

> **Gotchas:**
> - Each step costs a full resolution, so smaller *Step distance* means more work. Pick the largest value that is still smaller than your thinnest wall.
> - Stepping is a sub-stepping mitigation, not continuous collision detection. It samples the path; it does not solve it analytically.
> - With stepping off, *StepCount* is 1 and *On step* never fires.

---

## 8. Ejecting From Inside Walls

Push-out assumes the object is mostly in open space and just clipped a wall. The spawn case is the opposite: an object appears fully *inside* a wall and there is no obvious "out" direction. **Eject to nearest open space** handles that. It searches outward in a ring up to a radius you give and moves the object to the closest position where it overlaps no solid.

```
Event: On start of layout
  System | For each Enemy
    Action: Enemy | Push-Out and Slide: Eject to nearest open space -> 96
    // Every enemy that spawned inside a wall is relocated to the nearest gap within 96 px.

Event: Enemy | Push-Out and Slide: On ejected
  // Optional: react to a successful relocation. LastPushX/Y give the offset moved.

Event: Enemy | Push-Out and Slide: On eject failed
  Action: Enemy | Destroy
  // No open space within the radius: this enemy was boxed in, so remove it.
```

If the object was already in open space, the eject succeeds immediately with a zero offset. Eject ignores Resolution mode and does not slide; it is a one shot relocation, so call it once when you need it rather than every tick.

> **Tip:** Choose a radius of a couple of tiles. Too small and boxed in objects fail; too large and the search is slower and may eject an object surprisingly far.

---

## 9. Reading the Correction (Normals, Push, Slide)

After every resolution the behavior exposes exactly what it did. This is what lets you build reactions like wall jumps, scrape sounds, or dust puffs on the side that was hit.

The **surface normal** is the unit direction the object was pushed, pointing away from the wall. `SurfaceNormalX` and `SurfaceNormalY` together tell you which side a wall is on:

```
Event: Player | Push-Out and Slide: On pushed out
  Event: System | Player.PushOutAndSlide.SurfaceNormalX < 0
    Action: Player | Set "WallOnRight" to true
    // Pushed left means the wall is on the player's right -> offer a wall jump.
  Event: System | Player.PushOutAndSlide.SurfaceNormalX > 0
    Action: Player | Set "WallOnLeft" to true
```

The **last push** is the actual correction vector applied (`LastPushX`, `LastPushY`, `LastPushDistance`). The **slide** is the along surface movement that was preserved (`SlideX`, `SlideY`, `SlideDistance`). **OverlapCount** is how many distinct solids the object was touching.

```
Event: Player | Push-Out and Slide: On pushed out
  Event: System | Player.PushOutAndSlide.LastPushDistance > 4
    Action: Spawn DustPuff at (Player.X, Player.Y)
    // Only puff dust on a meaningful correction, not a sub-pixel nudge.
```

---

## 10. Actions Reference

### Solids

| Action | Description |
|---|---|
| Add solid | Add an object type as a solid for this object. Instances of that type will push this object out. Adding the same type twice has no effect. |
| Remove solid | Stop treating an object type as a solid for this object. |
| Clear solids | Remove all object types from this object's solid registry. |

### Resolution

| Action | Description |
|---|---|
| Resolve now | Run one resolution immediately, regardless of *Resolve on tick*. Triggers *On pushed out* if a correction is applied, or *On became trapped* if the object cannot be freed. |
| Eject to nearest open space | Search outward up to the given radius for the closest position with no solid overlap and move the object there. Triggers *On ejected* or *On eject failed*. |
| Set enabled | Turn the whole behavior on or off. While off it does nothing. |

### Configuration

| Action | Description |
|---|---|
| Set resolution mode | Choose how the push-out is computed (minimum push, axis X, axis Y, or nearest open space). |
| Set obstacles | Choose which objects count as walls: Custom (the registered types) or Solids (objects with the built-in Solid behavior). |
| Set sliding enabled | Turn wall sliding on or off. Off makes the object stop at first contact. |
| Set slide friction | Set how much along surface speed is lost per resolution, from 0 (frictionless) to 1 (full stop). Values are clamped to that range. |
| Set step distance | Set the maximum distance moved per step in pixels. Set to 0 to disable stepping. |
| Set max push per tick | Set the maximum length of a single correction in pixels. Set to 0 for no limit. |
| Set skin width | Set the gap kept between the object and solids after a push, in pixels. |

---

## 11. Conditions Reference

| Condition | Description |
|---|---|
| Is overlapping solid | True if this object currently overlaps at least one registered solid. |
| Is sliding | True if the last resolution preserved along surface movement. |
| Is enabled | True if the behavior is enabled. |
| Is solid | True if the given object type is registered as a solid for this object. |
| Is trapped | True if the last resolution left this object wedged against opposing solids. |

---

## 12. Expressions Reference

| Expression | Returns | Description |
|---|---|---|
| LastPushX | Number | The X distance of the last correction, in pixels. |
| LastPushY | Number | The Y distance of the last correction, in pixels. |
| LastPushDistance | Number | The length of the last correction, in pixels. 0 if nothing moved. |
| SurfaceNormalX | Number | The X component of the unit surface normal (the push-out direction). 0 if nothing moved. |
| SurfaceNormalY | Number | The Y component of the unit surface normal. |
| SlideX | Number | The X distance of the along surface movement preserved at the last resolution. |
| SlideY | Number | The Y distance of the along surface movement preserved. |
| SlideDistance | Number | The length of the along surface movement preserved. |
| OverlapCount | Number | The number of distinct solids the object overlapped at the last resolution. |
| StepCount | Number | The number of steps the object moves in this tick. 1 when stepping is disabled. |
| StepIndex | Number | The index of the current step, starting at 0. Meaningful inside *On step*. |
| SolidCount | Number | The number of object types currently registered as solids. |
| GetSolidByIndex | String | The name of the registered solid object type at the given 0-based index. Parameter: index (Number). |
| ResolutionMode | String | The current resolution mode key (`minimum_push`, `axis_x`, `axis_y` or `nearest_open`). |

---

## 13. Triggers Reference

| Trigger | Description |
|---|---|
| On pushed out | Fires after a resolution applies a non zero correction. The LastPush, SurfaceNormal, Slide and OverlapCount expressions describe what just happened. |
| On became trapped | Fires when a resolution cannot free the object because it overlaps solids on opposing sides. OverlapCount reports how many it is wedged against. |
| On ejected | Fires after *Eject to nearest open space* succeeds. LastPushX/Y give the offset from the original to the ejected position. |
| On eject failed | Fires when *Eject to nearest open space* finds no open position within the radius. The object is left at its original position. |
| On step | Fires for each step when stepping is enabled. Use it to make extra collision tests during fast movement. StepIndex and StepCount are available, and the object is at the current step's resolved position. |

---

## 14. Game Use Cases

> Many examples below use *Add solid*, which only takes effect in **Custom** obstacles mode. Set Obstacles to Custom on the object (or call *Set obstacles -> Custom* once), as shown in 14.2. Examples that rely on the built-in Solid behavior leave Obstacles at its default of **Solids**.

### 14.1 Simplest possible setup: keep a moved object out of walls

**Scenario:** You move an object yourself and just want it to stop ending up inside walls that use the built-in Solid behavior.

```
Event: Every tick
  Action: Player | Set position to (MouseX, MouseY)
  // Obstacles is left at its default (Solids), so every Solid object is a wall.
  // No setup events needed: the player follows the mouse and is pushed out each tick.
```

### 14.2 Top down 8 direction movement with smooth wall sliding

**Scenario:** A guard or player moved by hand written 8 direction code glides along walls and into corners without vibrating.

```
Event: On start of layout
  Action: Player | Push-Out and Slide: Set obstacles -> Custom
  Action: Player | Push-Out and Slide: Add solid -> Wall
  Action: Player | Push-Out and Slide: Add solid -> Crate
  // Custom mode so the Add solid list is used. (Skip these two if your walls
  // have the Solid behavior and you leave Obstacles at its default.)

Event: Every tick
  Local number dx = 0
  Local number dy = 0
  Sub-event: Keyboard: Left is down  -> Set dx to -1
  Sub-event: Keyboard: Right is down -> Set dx to 1
  Sub-event: Keyboard: Up is down    -> Set dy to -1
  Sub-event: Keyboard: Down is down  -> Set dy to 1
  Action: Player | Set position to (Self.X + dx*220*dt, Self.Y + dy*220*dt)
  // Diagonal pushes against a wall convert into sliding. No collision code needed here.
```

### 14.3 Procedural spawn cleanup

**Scenario:** A generator places enemies before the wall layout is final, so some land inside tiles.

```
Event: On start of layout
  System | For each Enemy
    Action: Enemy | Push-Out and Slide: Add solid -> WallTile
    Action: Enemy | Push-Out and Slide: Eject to nearest open space -> 128

Event: Enemy | Push-Out and Slide: On eject failed
  Action: Enemy | Destroy
  // Anything still boxed in after the search is removed.
```

### 14.4 Fast projectile that cannot tunnel

**Scenario:** A bullet moved by custom velocity must register hits even at high speed.

```
Event: On start of layout
  Action: Bullet | Push-Out and Slide: Add solid -> Wall
  Action: Bullet | Push-Out and Slide: Set step distance -> 6

Event: Every tick
  Action: Bullet | Set position to (Self.X + Self.VelX*dt, Self.Y + Self.VelY*dt)

Event: Bullet | Push-Out and Slide: On step
  Sub-event: Bullet | is overlapping Enemy
    Action: Enemy | Subtract 25 from health
    Action: Bullet | Destroy
```

### 14.5 Draggable puzzle pieces

**Scenario:** The player drags blocks with the built in Drag & Drop behavior and they should not overlap each other or the frame.

```
Event: On start of layout
  System | For each Block
    Action: Block | Push-Out and Slide: Add solid -> Block
    Action: Block | Push-Out and Slide: Add solid -> Frame
  // Each block treats other blocks and the frame as solid. Drag & Drop moves it,
  // Push-Out and Slide keeps it out and lets it slide against neighbours.
```

> Because the registry is per instance, a block registering "Block" as solid is pushed out of *other* Block instances, not itself.

### 14.6 Wall jump platformer

**Scenario:** A character moved by custom velocity wants to detect which wall it is hugging.

```
Event: On start of layout
  Action: Hero | Push-Out and Slide: Add solid -> Wall

Event: Hero | Push-Out and Slide: On pushed out
  Sub-event: System | Hero.PushOutAndSlide.SurfaceNormalX < -0.7
    Action: Hero | Set "TouchingRightWall" to true
  Sub-event: System | Hero.PushOutAndSlide.SurfaceNormalX > 0.7
    Action: Hero | Set "TouchingLeftWall" to true

Event: Keyboard: On Space pressed
  Sub-event: Hero | "TouchingRightWall" is true
    Action: Hero | Set VelX to -400
    Action: Hero | Set VelY to -600
    // Jump up and away from the wall on the right.
```

### 14.7 Settling a bouncing pickup once

**Scenario:** A coin is launched on an arc and may land inside a rock. Resolve only when it lands.

```
Event: On start of layout
  Action: Coin | Push-Out and Slide: Add solid -> Rock
  Action: Coin | Push-Out and Slide: Set resolve on tick -> (leave OFF in properties)

Event: Coin | Tween "arc" finished
  Action: Coin | Push-Out and Slide: Resolve now
  // One push to the surface the moment the arc ends, so it stays collectable.
```

> Turn *Resolve on tick* off in the Properties Bar for this object so the only correction is the explicit *Resolve now*.

### 14.8 Camera focus target confinement

**Scenario:** An invisible look-at object is lerped toward the player and must stay inside the playable area.

```
Event: On start of layout
  Action: FocusTarget | Push-Out and Slide: Add solid -> OffLimitsVolume

Event: Every tick
  Action: FocusTarget | Set position to (lerp(Self.X, Player.X, 5*dt), lerp(Self.Y, Player.Y, 5*dt))
  // The lerp pulls it toward the player; Push-Out and Slide keeps it out of off-limits volumes,
  // sliding it along the boundary so the camera pan stays smooth.
```

### 14.9 Reuse the project's existing Solid walls

**Scenario:** Your level already uses the built in Solid behavior on walls and you do not want to register them by hand.

```
Properties Bar: Obstacles = Solids   (this is the default, so usually nothing to change)

Event: On start of layout
  // Nothing to register. Every object with an enabled Solid behavior is pushed against.
```

You can also switch at runtime, for example to flip a character between custom obstacles and the project's Solids:

```
Event: Player | entered the solid-walled dungeon
  Action: Player | Push-Out and Slide: Set obstacles -> Solids
Event: Player | returned to the open world
  Action: Player | Push-Out and Slide: Set obstacles -> Custom
```

### 14.10 Vertical lane mover (axis X only)

**Scenario:** An elevator platform should only ever be corrected sideways, never lifted off its rail.

```
Event: On start of layout
  Action: Lift | Push-Out and Slide: Add solid -> ShaftWall
  Action: Lift | Push-Out and Slide: Set resolution mode -> Axis X only
```

### 14.11 Knockback that respects walls

**Scenario:** Getting hit applies a one frame offset that must not shove the player through a wall.

```
Event: Player | On hit by Enemy
  Action: Player | Set position to (Self.X + 60*cos(angle(Enemy.X,Enemy.Y,Self.X,Self.Y)), Self.Y + 60*sin(...))
  // The next resolution this tick clears any wall the knockback pushed into.
```

### 14.12 Temporary ghost mode

**Scenario:** A powerup lets the player phase through walls for a few seconds.

```
Event: Player | On powerup collected
  Action: Player | Push-Out and Slide: Set enabled -> false

Event: Player | "GhostTimer" timer finished
  Action: Player | Push-Out and Slide: Set enabled -> true
  Action: Player | Push-Out and Slide: Eject to nearest open space -> 256
  // When ghosting ends, eject in case the player is currently inside a wall.
```

### 14.13 Detecting a wedged object

**Scenario:** An object squeezed between two closing walls should react instead of vibrating.

```
Event: Crate | Push-Out and Slide: On became trapped
  Action: Crate | Spawn CrushParticles
  Action: Crate | Destroy
  // It is overlapping solids on opposing sides and cannot be freed.
```

### 14.14 Cozy tool reticle that hugs obstacles

**Scenario:** A free floating farming tool cursor must not sit on buildings or fences but should glide along their edges.

```
Event: On start of layout
  Action: Reticle | Push-Out and Slide: Add solid -> Building
  Action: Reticle | Push-Out and Slide: Add solid -> Fence

Event: Every tick
  Action: Reticle | Set position to (MouseX, MouseY)
  // The reticle follows the cursor but slides along the edge of any obstacle.
```

### 14.15 Iterating and displaying the solid list (edge case)

**Scenario:** A debug overlay lists everything the player currently treats as solid.

```
Event: Every tick
  Action: DebugText | Set text to ""
  Action: System | Repeat Player.PushOutAndSlide.SolidCount times
    Action: DebugText | Append text -> Player.PushOutAndSlide.GetSolidByIndex(loopindex) & newline
```

### 14.16 Pushable boxes (Sokoban)

**Scenario:** The player shoves crates around, and each crate must stay out of walls and out of the other crates.

```
Event: On start of layout
  System | For each Crate
    Action: Crate | Push-Out and Slide: Set obstacles -> Custom
    Action: Crate | Push-Out and Slide: Add solid -> Wall
    Action: Crate | Push-Out and Slide: Add solid -> Crate

Event: Player | is overlapping Crate
  Action: Crate | Set position to (Self.X + PlayerMoveX, Self.Y + PlayerMoveY)
  // The crate is shoved, then pushed back out of walls and other crates, so a row of
  // crates cannot be forced into a wall or through each other.
```

### 14.17 Crushed by a moving wall

**Scenario:** A wall slides across the room and should carry the player ahead of it, and crush them if they are trapped against a static wall.

```
Event: Every tick
  Action: MovingWall | Set X to Self.X - 80*dt
  // Player has Obstacles = Solids. As the moving wall overlaps the player, the next
  // resolution pushes the player along in front of it.

Event: Player | Push-Out and Slide: On became trapped
  Action: Player | Subtract 100 from Health
  // Pinned between the moving wall and a static wall: it cannot be freed, so it is crushed.
```

### 14.18 Rolling ball in a tilt maze

**Scenario:** A ball moved by tilt or accelerometer should glide along maze walls instead of catching on them.

```
Event: Every tick
  Action: Ball | Set position to (Self.X + TiltX*300*dt, Self.Y + TiltY*300*dt)
  // Sliding on: the ball rolls along the maze walls and eases around corners.
```

### 14.19 Anti-stacking crowd

**Scenario:** Many wandering NPCs should not pile up on the exact same spot.

```
Event: On start of layout
  System | For each NPC
    Action: NPC | Push-Out and Slide: Set obstacles -> Custom
    Action: NPC | Push-Out and Slide: Add solid -> NPC
    Action: NPC | Push-Out and Slide: Set max push per tick -> 4
  // Each NPC pushes out of the others a few pixels per tick, so a crowd spreads out
  // smoothly instead of overlapping into one blob.
```

### 14.20 Homing missile that hugs walls

**Scenario:** A missile steers toward a target but must wrap around walls rather than stall against them.

```
Event: Every tick
  Action: Missile | Set angle toward (Target.X, Target.Y)
  Action: Missile | Set position to (Self.X + cos(Self.Angle)*400*dt, Self.Y + sin(Self.Angle)*400*dt)
  // Sliding turns a head-on wall hit into movement along the wall, so the missile skims
  // around obstacles on its way to the target.
```

### 14.21 Ghost that ignores walls but not the magic barrier

**Scenario:** An enemy phases through ordinary level walls yet is blocked by one special barrier.

```
Event: On start of layout
  Action: Ghost | Push-Out and Slide: Set obstacles -> Custom
  Action: Ghost | Push-Out and Slide: Add solid -> MagicBarrier
  // Only MagicBarrier is registered, so the ghost drifts through normal walls but is
  // pushed out of the barrier.
```

### 14.22 Confining a fish to its tank

**Scenario:** A Sine-driven fish must stay inside the aquarium glass.

```
Event: On start of layout
  Action: Fish | Push-Out and Slide: Set obstacles -> Custom
  Action: Fish | Push-Out and Slide: Add solid -> TankGlass
  // The Sine behavior wiggles the fish around; Push-Out and Slide keeps it inside the
  // glass, sliding it along the panes at the edges.
```

### 14.23 Safe loot drops

**Scenario:** Loot bursts out where an enemy died and must not land buried in a wall.

```
Event: Enemy | On destroyed
  Action: System | Create Loot at (Enemy.X, Enemy.Y)
  Action: Loot | Push-Out and Slide: Set obstacles -> Custom
  Action: Loot | Push-Out and Slide: Add solid -> Wall
  Action: Loot | Push-Out and Slide: Eject to nearest open space -> 64
  // Any loot that spawned inside a wall is ejected to the nearest open spot.
```

### 14.24 Teleport landing safety

**Scenario:** A blink ability could drop the player into a wall.

```
Event: On Blink pressed
  Action: Player | Set position to (MouseX, MouseY)
  Action: Player | Push-Out and Slide: Eject to nearest open space -> 128

Event: Player | Push-Out and Slide: On eject failed
  Action: Player | Set position to (LastSafeX, LastSafeY)
  // If the blink target is fully boxed in, cancel back to the last safe position.
```

### 14.25 Growing hitbox shoved off walls

**Scenario:** A charge attack grows the player's size; as it grows it must not end up clipping into walls.

```
Event: Charge is held
  Action: Player | Set width to Self.Width + 200*dt
  Action: Player | Set height to Self.Height + 200*dt
  // Resizing changes the bounding box, so the next resolution pushes the enlarged
  // player out of any wall the growth overlapped.
```

### 14.26 Conveyor items on guide rails

**Scenario:** Items ride a conveyor and must stay between the rail edges.

```
Event: Every tick
  Action: Item | Set X to Self.X + ConveyorSpeed*dt
  // Rails registered as solids; sliding keeps each item gliding straight along the rails.
```

### 14.27 Free photo-mode camera clamped to the level

**Scenario:** A detached camera target the player flies around must stay inside the level bounds.

```
Event: Every tick
  Action: CamTarget | Set position to (Self.X + StickX*500*dt, Self.Y + StickY*500*dt)
  // Thin BoundsVolume bars frame the level. The camera target slides along them and
  // cannot leave the playable area.
```

### 14.28 Drag a UI window inside the screen frame

**Scenario:** A draggable window panel must not leave the visible screen.

```
Event: On start of layout
  Action: Window | Push-Out and Slide: Set obstacles -> Custom
  Action: Window | Push-Out and Slide: Add solid -> ScreenEdge
  // Four thin ScreenEdge bars frame the viewport. Drag & Drop moves the window; it is
  // pushed back inside and slides along the edges.
```

### 14.29 Wall-slide that drains stamina

**Scenario:** A climber loses stamina only while actually sliding down a wall.

```
Event: Climber | Push-Out and Slide: Is sliding
  Action: Climber | Subtract 20*dt from Stamina
  // Is sliding is only true on a tick where along-surface movement was preserved.
```

### 14.30 Surface-aware scrape audio

**Scenario:** Play a scrape sound that gets louder the faster the object slides along a wall.

```
Event: Player | Push-Out and Slide: Is sliding
  Action: Audio | Set "scrape" volume to -30 + Player.PushOutAndSlide.SlideDistance*3
  // SlideDistance is the along-surface distance kept this tick, so it tracks slide speed.
```

### 14.31 Snake body segments kept out of walls

**Scenario:** Each body segment follows the one ahead and should not clip walls on tight turns.

```
Event: Every tick
  System | For each Segment
    Action: Segment | Set position toward its leader at SegmentSpeed*dt
  // Each Segment has its own Push-Out and Slide, so a tight turn that would clip a wall
  // is corrected per segment and the whole body hugs the corridor.
```

### 14.32 Mining cart that parks at the end wall

**Scenario:** A cart driven by custom speed along a track should stop cleanly at the wall at the end of the track.

```
Event: Every tick
  Action: Cart | Set X to Self.X + CartSpeed*dt

Event: Cart | Push-Out and Slide: On pushed out
  Action: Cart | Set CartSpeed to 0
  // Hitting the end wall fires On pushed out, so zero the speed and let it park flush.
```

### 14.33 Bumper that hard-stops (no slide)

**Scenario:** In a puck game the puck should stop dead against bumpers, not glide around them.

```
Event: On start of layout
  Action: Puck | Push-Out and Slide: Set obstacles -> Custom
  Action: Puck | Push-Out and Slide: Add solid -> Bumper
  Action: Puck | Push-Out and Slide: Set sliding enabled -> false
  // With sliding off the puck stops flush on contact instead of sliding along the bumper.
```

### 14.34 Tower-defense creeps that do not overlap

**Scenario:** Creeps walking the same path should bunch up into a believable queue rather than stacking exactly.

```
Event: On start of layout
  System | For each Creep
    Action: Creep | Push-Out and Slide: Set obstacles -> Custom
    Action: Creep | Push-Out and Slide: Add solid -> Creep
    Action: Creep | Push-Out and Slide: Set max push per tick -> 4
  // Gentle separation (4 px per tick) keeps a queue looking natural, not a single blob.
```

### 14.35 Build-mode placement check (detection only)

**Scenario:** In a builder, a placement ghost should turn red when it overlaps a placed building, but it must follow the cursor exactly and never be nudged.

```
Properties Bar: Resolve on tick = false   (detection only, no pushing)

Event: On start of layout
  Action: Ghost | Push-Out and Slide: Set obstacles -> Custom
  Action: Ghost | Push-Out and Slide: Add solid -> Building

Event: Every tick
  Action: Ghost | Set position to (round(MouseX/32)*32, round(MouseY/32)*32)
  Sub-event: Ghost | Push-Out and Slide: Is overlapping solid
    Action: Ghost | Set color to Red
  Sub-event: Else
    Action: Ghost | Set color to Green
  // Resolve on tick is off, so the ghost is never moved. We only read Is overlapping
  // solid to validate the placement under the cursor.
```

> This is the "use it purely as an overlap test" pattern: turn *Resolve on tick* off and read *Is overlapping solid*, getting registered-solid detection without any push-out.

### 14.36 Rope or whip tip kept out of geometry

**Scenario:** The tip of a swinging rope, moved by your own swing math, should not poke through walls.

```
Event: Every tick
  Action: RopeTip | Set position to (SwingX, SwingY)
  // Sliding lets the tip skid along a wall it swings into instead of passing through it.
```

### 14.37 Cutscene actor kept off props

**Scenario:** A scripted actor follows waypoints during a cutscene and must not walk through furniture.

```
Event: Every tick (while cutscene is playing)
  Action: Actor | Move toward current waypoint at 120*dt
  // Furniture registered as solids; the actor slides around any prop in its path so the
  // scripted walk never clips through scenery.
```

---

## 15. Using Multiple Behavior Instances

Push-Out and Slide does not restrict itself to one copy per object, so you can add **more than one** Push-Out and Slide behavior to the same object. Each copy is completely independent: its own name, its own **Obstacles** mode and solid list, its own settings (sliding, friction, resolution mode, step distance, max push, skin width), its own state, its own expressions, and its own triggers. That is exactly what you need when one object must treat different *categories* of obstacle differently, because a single instance only has one of each setting.

**When to use more than one instance:**

- **Different settings per category.** One channel slides along level walls while another hard-stops against bodies or bumpers; or different friction, resolution mode, or step distance per category.
- **Independent reactions.** Each instance fires its own *On pushed out* / *On became trapped* and exposes its own *SurfaceNormalX/Y* and *LastPush*, so you can tell "hit a wall" apart from "bumped an enemy" cleanly.

**How they interact each tick.** Every instance runs its own resolution after your movement, in the order the behaviors were added to the object, and the object ends the tick clear of all of them. Each instance measures movement from its own last resolved position, so when two correct in the same tick the later one treats the earlier one's correction as part of the movement. The push-out is still correct either way; if you want the cleanest sliding, put the channel that matters most for sliding lowest in the behavior list (it resolves last), or fold both lists into a single instance.

**Naming.** Rename each instance in the Properties Bar so its actions, expressions, and triggers are easy to address (for example `WallCollide` and `BodyBump`). The examples below assume you renamed them as shown.

### Example A: separate wall and body collision channels

**Scenario:** A top-down character must slide along level walls and use that contact to detect wall jumps, but also be pushed apart from other characters, and the two must never be confused.

Add two Push-Out and Slide behaviors to **Player**, renamed `WallCollide` and `BodyBump`.

```
Event: On start of layout
  // Channel 1: level geometry, used for movement and wall detection
  Action: Player | WallCollide: Set obstacles -> Custom
  Action: Player | WallCollide: Add solid -> Wall
  Action: Player | WallCollide: Add solid -> Door
  Action: Player | WallCollide: Set sliding enabled -> true

  // Channel 2: other characters, used for soft body separation
  Action: Player | BodyBump: Set obstacles -> Custom
  Action: Player | BodyBump: Add solid -> Enemy
  Action: Player | BodyBump: Add solid -> NPC
  Action: Player | BodyBump: Set max push per tick -> 6   // gentle, not a hard shove
```

```
// Wall jump reads ONLY the wall channel, so bumping an enemy never offers a jump.
Event: Player | WallCollide: On pushed out
  Sub-event: System | Player.WallCollide.SurfaceNormalX < -0.7
    Action: Player | Set "WallOnRight" to true
  Sub-event: System | Player.WallCollide.SurfaceNormalX > 0.7
    Action: Player | Set "WallOnLeft" to true

// Bumping a body fires its OWN trigger: play a grunt, with no wall-jump side effects.
Event: Player | BodyBump: On pushed out
  Action: Audio | Play "bump"
```

**Why two instances:** `SurfaceNormalX`, *On pushed out*, and the solid list all belong to a single instance. With one combined list you could not tell a wall hit from a body hit, and the gentle 6 px body separation would also throttle the wall correction. Two channels keep the rules and the readouts separate.

### Example B: different slide rules per obstacle on a draggable piece

**Scenario:** A puzzle piece dragged with Drag & Drop should stop dead against the board frame (so it cannot be forced past the boundary) but glide smoothly along neighbouring pieces.

Add two Push-Out and Slide behaviors to **Piece**, renamed `FrameStop` and `PieceGlide`.

```
Event: On start of layout
  // Hard stop at the board edge: sliding OFF
  Action: Piece | FrameStop: Set obstacles -> Custom
  Action: Piece | FrameStop: Add solid -> BoardFrame
  Action: Piece | FrameStop: Set sliding enabled -> false

  // Smooth glide along other pieces: sliding ON with a little friction
  Action: Piece | PieceGlide: Set obstacles -> Custom
  Action: Piece | PieceGlide: Add solid -> Piece
  Action: Piece | PieceGlide: Set sliding enabled -> true
  Action: Piece | PieceGlide: Set slide friction -> 0.2

// Drag & Drop moves the piece each tick; the two channels then correct it. Against the
// frame it stops flush, against a neighbour it glides with a draggy feel.
```

**Why two instances:** *Enable sliding* is a single per-instance setting, so one instance cannot both hard-stop on the frame and slide along pieces. Splitting the two obstacle categories into two channels with opposite slide settings is the only way to get both feels on the same object.

> Keep the number of instances small. Each one is a separate per-tick collision query, so two or three channels are fine, but do not add a dozen.

---

## 16. C3 Debugger

Push-Out and Slide surfaces a compact summary of its live state in Construct's debugger. Open it with the bug icon during preview (or press F12 in the preview window) and expand the object's behavior to find the **$Push-Out and Slide** section.

| Field | Meaning |
|---|---|
| enabled | Whether the behavior is currently resolving. |
| obstacles | The active obstacle source (`custom` or `solids`). |
| resolutionMode | The active mode key (`minimum_push`, `axis_x`, `axis_y`, `nearest_open`). |
| isSliding | Whether the last resolution slid along a surface. |
| isTrapped | Whether the object is wedged against opposing solids. |
| overlapCount | Number of solids touched at the last resolution. |
| lastPushDistance | Length of the last correction, in pixels (0 if nothing moved). |
| solidCount | Number of registered solid types (used in Custom mode). |

For the full per-axis push, surface normal, slide and step values, read the matching expressions (section 12) in the event sheet.

---

## 17. Scripting (C3 Script / JavaScript)

Push-Out and Slide's actions and state conditions are exposed as methods on the behavior instance, so you can drive the same logic from a C3 Script event or a JavaScript module.

### Accessing the behavior

Reach the behavior through the instance's `behaviors` map. The key is the behavior's name *in your project* (what the editor shows on the object), not the addon ID. These examples use `PushOutAndSlide`; if your project shows a different default name, use that one or rename the behavior to match:

```js
const player = runtime.objects.Player.getFirstInstance();
const push = player.behaviors.PushOutAndSlide;
```

### Calling actions from script

Every action is copied onto the behavior under its PascalCase name (the ACE filename), so calling it from script produces exactly the same effect as the event sheet action:

```js
// Register and configure solids
push.AddSolid(runtime.objects.Wall);
push.AddSolid(runtime.objects.Crate);
push.SetSlidingEnabled(true);
push.SetSlideFriction(0.25);
push.SetStepDistance(8);

// Run a one shot correction or eject
push.ResolveNow();
push.EjectToNearestOpenSpace(96);

// Combo parameters are 0-based indices from script:
// 0 = minimum_push, 1 = axis_x, 2 = axis_y, 3 = nearest_open
push.SetResolutionMode(2); // axis_y only
```

> `AddSolid`, `RemoveSolid` and `IsSolid` take an object type, e.g. `runtime.objects.Wall`.

### Reading state from script

The state conditions are also exposed and return booleans:

```js
if (push.IsOverlappingSolid()) { /* still touching something */ }
if (push.IsSliding()) { /* glided along a surface last resolution */ }
if (push.IsTrapped()) { /* wedged */ }
if (push.IsEnabled()) { /* behavior is on */ }
if (push.IsSolid(runtime.objects.Wall)) { /* Wall is registered */ }
```

> Expressions (LastPushX, SurfaceNormalX, and so on) are not exposed to script. Read those through the event sheet, or compute equivalents from the object's position yourself.

### Listening to triggers from script

Each trigger can be subscribed to with `addEventListener`, using the trigger's method name:

```js
push.addEventListener("OnPushedOut", () => {
  console.log("corrected");
});
push.addEventListener("OnStep", () => {
  // runs per step during fast movement
});
push.addEventListener("OnEjectFailed", () => {
  player.destroy();
});
```

### A complete example

```js
runOnStartup(async (runtime) => {
  runtime.addEventListener("beforeprojectstart", () => {
    const player = runtime.objects.Player.getFirstInstance();
    const push = player.behaviors.PushOutAndSlide;

    push.AddSolid(runtime.objects.Wall);
    push.SetSlidingEnabled(true);
    push.SetStepDistance(8);

    push.addEventListener("OnPushedOut", () => {
      if (push.IsTrapped()) console.warn("player wedged");
    });
  });
});
```

---

## 18. Save and Load

Push-Out and Slide persists its configuration automatically with Construct's save/load system, so a saved game restores the behavior's settings without any work on your part. What is saved:

- enabled, resolution mode, sliding enabled, slide friction, step distance, max push per tick and skin width
- the solid registry, stored as object type identifiers and resolved back to types on load

Transient values (the last push, slide, normal, step counters and the internal last resolved position) are deliberately not saved. They are recomputed on the next resolution, which keeps savegames small and rollback friendly.

> If you register solids in code or actions that always run on Start of Layout, the registry is rebuilt anyway, so the persisted copy simply means a mid layout save restores correctly without re-running your setup.

---

## 19. Tips and Common Mistakes

- **By default, walls must have the Solid behavior.** Obstacles starts in **Solids** mode, so an object is only a wall if it has Construct's built-in Solid behavior. If your walls do not use Solid, or you want a custom list, set **Obstacles** to **Custom** and register types with *Add solid*.
- **Obstacles modes are exclusive.** In **Solids** mode the *Add solid* registry is ignored; in **Custom** mode the built-in Solid behavior is ignored. Pick one per object (or switch at runtime with *Set obstacles*). Examples in this guide that use *Add solid* assume Custom mode.
- **It corrects after your movement, not during.** The resolution runs once the event sheet has moved the object for the tick. Expressions you read in the same tick *before* the resolution reflect the previous tick's correction.
- **Add solid takes a type, not an instance.** You register "Wall", which covers every Wall instance. There is no per instance registration.
- **Fast objects need stepping, not a smaller skin width.** If a projectile tunnels through thin walls, set *Step distance* below the wall thickness. Skin width only prevents re-overlap chatter, not tunnelling.
- **Choose Step distance smaller than your thinnest solid,** and remember every step costs a resolution. Too small wastes CPU; too large lets fast objects skip.
- **nearest_open is expensive.** Use it through *Eject to nearest open space* as a one shot, not as the per tick resolution mode, unless you really need outward search every frame.
- **Turn Resolve on tick off for discrete corrections.** For a teleport, a single drag step or a settling pickup, leave it off and call *Resolve now* exactly when you want the push.
- **Sliding needs movement to redistribute.** A stationary object has nothing to slide. A teleport sized jump is treated as placement and skips sliding on purpose.
- **Per instance registries are a feature.** A block registering its own type as solid is pushed out of other blocks, not itself. Use this to give different objects different collision rules.
- **Use multiple instances for multiple obstacle categories.** Because settings like *Enable sliding*, friction, and resolution mode are per instance, you can add two or more copies of the behavior to one object to treat walls, bodies, and zones differently, each with its own list, triggers, and expressions. See [section 15](#15-using-multiple-behavior-instances). Keep the count small; each instance is its own per tick query.
- **It is not Physics.** Push-Out and Slide keeps an object out of walls and slides it along them. For mass, momentum and stacking, use the Physics behavior instead.
