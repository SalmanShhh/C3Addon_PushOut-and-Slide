import { id, addonType } from "../../config.caw.js";
import AddonTypeMap from "../../template/addonTypeMap.js";

// ---------------------------------------------------------------------------
// Stateless geometry helpers (SAT / minimum-translation-vector).
// All push-out is reproduced from documented public collision/geometry APIs.
// No internal engine push-out routine is ever called.
// ---------------------------------------------------------------------------

const MODE_KEYS = ["minimum_push", "axis_x", "axis_y", "nearest_open", "swept"];
// Obstacle source, matching the "Obstacles" combo item order in config.caw.js.
const OBSTACLE_MODES = ["custom", "solids"];
// New combos, matching their item order in config.caw.js.
const MOVEMENT_STYLES = ["top_down", "side_scroller"];
const UP_DIRS = ["up", "down", "left", "right"];
// Unit "up" (away from gravity) vector for each Up direction option.
const UP_VECTORS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const AXIS_RES_MODES = ["minimum", "separate"];
const JUMPTHRU_SOURCES = ["none", "jumpthru", "custom"];
const MAX_PASSES = 4; // bounded de-penetration passes per resolution
const MAX_STEPS = 100; // cap on sub-steps so a teleport cannot explode cost
const EJECT_SAMPLES = 16; // ring samples for the nearest-open search
const MAX_SWEEP_ITERS = 256; // cap on swept-march samples so a huge drag is bounded
const SWEEP_MIN_STEP = 4; // default swept granularity (px) when Step distance is 0

function projectPoly(points, ax, ay) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = points[i][0] * ax + points[i][1] * ay;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return [min, max];
}

function centroid(points) {
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    cx += points[i][0];
    cy += points[i][1];
  }
  const n = points.length || 1;
  return [cx / n, cy / n];
}

function edgeAxes(points) {
  const axes = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const x1 = points[i][0];
    const y1 = points[i][1];
    const x2 = points[(i + 1) % n][0];
    const y2 = points[(i + 1) % n][1];
    const ex = x2 - x1;
    const ey = y2 - y1;
    // edge normal
    const nx = -ey;
    const ny = ex;
    const len = Math.hypot(nx, ny) || 1;
    axes.push([nx / len, ny / len]);
  }
  return axes;
}

// Minimum-translation-vector to separate A out of B (returns unit normal + depth)
function satMTV(pa, pb) {
  let minOverlap = Infinity;
  let mx = 0;
  let my = 0;
  const axes = edgeAxes(pa).concat(edgeAxes(pb));
  for (let i = 0; i < axes.length; i++) {
    const ax = axes[i][0];
    const ay = axes[i][1];
    const a = projectPoly(pa, ax, ay);
    const b = projectPoly(pb, ax, ay);
    const overlap = Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
    if (overlap <= 0) return null; // separating axis -> not overlapping
    if (overlap < minOverlap) {
      minOverlap = overlap;
      mx = ax;
      my = ay;
    }
  }
  const ca = centroid(pa);
  const cb = centroid(pb);
  if ((ca[0] - cb[0]) * mx + (ca[1] - cb[1]) * my < 0) {
    mx = -mx;
    my = -my;
  }
  return { nx: mx, ny: my, depth: minOverlap };
}

// Penetration of A into B along a single fixed axis (for axis_x / axis_y modes)
function penOnAxis(pa, pb, ax, ay) {
  const a = projectPoly(pa, ax, ay);
  const b = projectPoly(pb, ax, ay);
  const overlap = Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
  if (overlap <= 0) return null;
  const ca = centroid(pa);
  const cb = centroid(pb);
  const sign = (ca[0] - cb[0]) * ax + (ca[1] - cb[1]) * ay < 0 ? -1 : 1;
  return { nx: ax * sign, ny: ay * sign, depth: overlap };
}

export default function (parentClass) {
  return class extends parentClass {
    constructor() {
      super();
      if (!this.events) this.events = {};

      // --- Solid registry (per behavior instance) -----------------------
      this._solidTypes = new Set(); // Set<IObjectType>
      this._jumpthruTypes = new Set(); // Set<IObjectType> one-way platforms (Custom source)
      this._worldTypesCache = null; // cached world object types for the Solid-behavior union

      // --- Configuration (read each resolution; change live) ------------
      // Property declaration order from config.caw.js (Enabled is kept last in
      // the panel, so it is the final index):
      // 0 resolutionMode, 1 resolveOnTick, 2 enableSliding, 3 slideFriction,
      // 4 stepDistance, 5 obstacles, 6 skinWidth, 7 movementStyle, 8 upDirection,
      // 9 floorSlopeMax, 10 axisResolution, 11 jumpthruSource, 12 enabled
      // Max push per tick is not a property; it defaults to 0 (no limit) and is
      // changed at runtime with the Set max push per tick action.
      const properties = this._getInitProperties();
      if (properties) {
        this._resolutionMode = MODE_KEYS[properties[0]] || "minimum_push";
        this._resolveOnTick = properties[1] !== false;
        this._slidingEnabled = properties[2] !== false;
        this._slideFriction = this._clamp01(properties[3] || 0);
        this._stepDistance = Math.max(0, properties[4] || 0);
        this._obstacleMode = OBSTACLE_MODES[properties[5]] || "solids";
        this._maxPushPerTick = 0;
        this._skinWidth = Math.max(0, properties[6] != null ? properties[6] : 0.5);
        this._movementStyle = MOVEMENT_STYLES[properties[7]] || "top_down";
        this._upDir = UP_DIRS[properties[8]] || "up";
        this._floorSlopeMax = this._clampAngle(properties[9], 45);
        this._axisResolution = AXIS_RES_MODES[properties[10]] || "minimum";
        this._jumpthruSource = JUMPTHRU_SOURCES[properties[11]] || "none";
        this._enabled = properties[12] !== false;
      } else {
        this._enabled = true;
        this._resolutionMode = "minimum_push";
        this._resolveOnTick = true;
        this._slidingEnabled = true;
        this._slideFriction = 0;
        this._stepDistance = 0;
        this._obstacleMode = "solids";
        this._maxPushPerTick = 0;
        this._skinWidth = 0.5;
        this._movementStyle = "top_down";
        this._upDir = "up";
        this._floorSlopeMax = 45;
        this._axisResolution = "minimum";
        this._jumpthruSource = "none";
      }

      // --- Transient resolution outputs (exposed via expressions) -------
      this._lastPushX = 0;
      this._lastPushY = 0;
      this._lastPushDistance = 0;
      this._surfaceNormalX = 0;
      this._surfaceNormalY = 0;
      this._slideX = 0;
      this._slideY = 0;
      this._slideDistance = 0;
      this._overlapCount = 0;
      this._stepCount = 1;
      this._stepIndex = 0;
      this._isSliding = false;
      this._isTrapped = false;

      // --- Surface classification (Side-scrolling style) ----------------
      this._onFloor = false;
      this._onWall = false;
      this._onCeiling = false;
      this._floorNX = 0; // unit normal of the last floor contact
      this._floorNY = 0;
      this._slopeAngle = 0; // signed degrees of the floor relative to level
      this._wallSide = 0; // -1 wall on the object's left, +1 on its right, 0 none
      this._ticksSinceFloor = 999; // frames since last floor contact (coyote time)
      // Previous-resolution classification, for rising-edge triggers.
      this._wasOnFloor = false;
      this._wasOnWall = false;
      this._wasOnCeiling = false;

      // --- State for sliding / corner stabilisation ---------------------
      this._lastResolvedX = 0;
      this._lastResolvedY = 0;
      this._lastNX = 0; // last raw contact normal (for slide blending)
      this._lastNY = 0;
      this._contactAge = 999;
      this._initialized = false;

      this._setTicking2(true); // resolve after event-sheet movement
    }

    // ----- Lifecycle ----------------------------------------------------

    _postCreate() {
      this._captureRestPosition();
    }

    _captureRestPosition() {
      if (this.instance) {
        this._lastResolvedX = this.instance.x;
        this._lastResolvedY = this.instance.y;
      }
      this._initialized = true;
    }

    _tick2() {
      if (!this._initialized) this._captureRestPosition();
      if (!this._enabled || !this._resolveOnTick) return;
      this._doResolution();
    }

    _release() {
      super._release();
    }

    // ----- Framework trigger / event helpers ---------------------------

    _trigger(method) {
      this.dispatch(method);
      super._trigger(self.C3[AddonTypeMap[addonType]][id].Cnds[method]);
    }

    on(tag, callback, options) {
      if (!this.events[tag]) {
        this.events[tag] = [];
      }
      this.events[tag].push({ callback, options });
    }

    off(tag, callback) {
      if (this.events[tag]) {
        this.events[tag] = this.events[tag].filter(
          (event) => event.callback !== callback
        );
      }
    }

    dispatch(tag) {
      if (this.events[tag]) {
        this.events[tag].forEach((event) => {
          if (event.options && event.options.params) {
            const fn = self.C3[AddonTypeMap[addonType]][id].Cnds[tag];
            if (fn && !fn.call(this, ...event.options.params)) {
              return;
            }
          }
          event.callback();
          if (event.options && event.options.once) {
            this.off(tag, event.callback);
          }
        });
      }
    }

    // ----- Small utilities ---------------------------------------------

    _clamp01(v) {
      v = +v;
      if (!isFinite(v)) return 0;
      if (v < 0) return 0;
      if (v > 1) return 1;
      return v;
    }

    _clampAngle(v, fallback) {
      v = +v;
      if (!isFinite(v)) return fallback;
      if (v < 0) return 0;
      if (v > 90) return 90;
      return v;
    }

    // Unit "up" vector (away from gravity) from the Up direction property.
    _upVec() {
      return UP_VECTORS[this._upDir] || UP_VECTORS.up;
    }

    // Whether floor/wall/ceiling classification is active this run.
    _classifyEnabled() {
      return this._movementStyle === "side_scroller";
    }

    // ----- Contact classification (floor / wall / ceiling) --------------

    // Reset per-resolution classification before a fresh _doResolution pass.
    _beginClassification() {
      this._wasOnFloor = this._onFloor;
      this._wasOnWall = this._onWall;
      this._wasOnCeiling = this._onCeiling;
      this._onFloor = false;
      this._onWall = false;
      this._onCeiling = false;
      this._wallSide = 0;
      // _floorNX/_floorNY/_slopeAngle persist until a new floor contact replaces them.
    }

    // Label a single applied push normal (unit, pointing away from the surface
    // toward this object) as floor, ceiling or wall, relative to the up vector.
    _classifyNormal(nx, ny) {
      if (!this._classifyEnabled()) return;
      const l = Math.hypot(nx, ny);
      if (l <= 1e-6) return;
      nx /= l;
      ny /= l;
      const up = this._upVec();
      const dotUp = nx * up[0] + ny * up[1]; // +1 floor, -1 ceiling
      const cosMax = Math.cos((this._floorSlopeMax * Math.PI) / 180);
      if (dotUp >= cosMax) {
        this._onFloor = true;
        this._floorNX = nx;
        this._floorNY = ny;
        // Signed slope angle: + when the floor tips toward the object's right.
        const right = [-up[1], up[0]];
        const tilt = Math.acos(Math.max(-1, Math.min(1, dotUp))) * (180 / Math.PI);
        this._slopeAngle = nx * right[0] + ny * right[1] < 0 ? tilt : -tilt;
      } else if (dotUp <= -cosMax) {
        this._onCeiling = true;
      } else {
        this._onWall = true;
        const right = [-up[1], up[0]];
        // Pushed toward -right means the wall is on the object's right.
        this._wallSide = nx * right[0] + ny * right[1] > 0 ? -1 : 1;
      }
    }

    _teleportThreshold() {
      const inst = this.instance;
      const w = inst ? inst.width || 0 : 0;
      const h = inst ? inst.height || 0 : 0;
      return Math.max(2000, Math.max(w, h) * 8);
    }

    _nearestOpenRadius() {
      const inst = this.instance;
      const w = inst ? inst.width || 16 : 16;
      const h = inst ? inst.height || 16 : 16;
      return Math.max(16, Math.max(w, h));
    }

    _quadPoints(inst) {
      let q = null;
      if (typeof inst.getBoundingQuad === "function") q = inst.getBoundingQuad();
      else if (typeof inst.getQuad === "function") q = inst.getQuad();
      if (!q) {
        // last-resort axis-aligned fallback
        const bb = inst.getBoundingBox();
        return [
          [bb.left, bb.top],
          [bb.right, bb.top],
          [bb.right, bb.bottom],
          [bb.left, bb.bottom],
        ];
      }
      return [
        [q.p1.x, q.p1.y],
        [q.p2.x, q.p2.y],
        [q.p3.x, q.p3.y],
        [q.p4.x, q.p4.y],
      ];
    }

    _worldTypes() {
      if (this._worldTypesCache) return this._worldTypesCache;
      const arr = [];
      try {
        for (const t of this.runtime.objects) {
          const plugin = t && t.plugin;
          const isWorld = plugin ? plugin.isWorldType !== false : true;
          if (isWorld) arr.push(t);
        }
      } catch (e) {
        /* ignore */
      }
      this._worldTypesCache = arr;
      return arr;
    }

    _instHasEnabledSolid(inst) {
      const bag = inst && inst.behaviors;
      if (!bag) return false;
      let list;
      try {
        list = Object.values(bag);
      } catch (e) {
        return false;
      }
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        if (
          b &&
          b.behaviorType &&
          b.behaviorType.name === "Solid" &&
          b.isEnabled !== false
        ) {
          return true;
        }
      }
      return false;
    }

    // ----- Candidate gathering (documented broadphase + narrowphase) ----

    _broadRect() {
      const bb = this.instance.getBoundingBox();
      const m = 4 + this._skinWidth;
      return {
        left: bb.left - m,
        top: bb.top - m,
        right: bb.right + m,
        bottom: bb.bottom + m,
      };
    }

    // Reach the collision engine from either the behavior or the host instance.
    _collisions() {
      if (this.runtime && this.runtime.collisions) return this.runtime.collisions;
      if (this.instance && this.instance.runtime && this.instance.runtime.collisions)
        return this.instance.runtime.collisions;
      return null;
    }

    // Broadphase candidates for the given types. Falls back to a full
    // getAllInstances scan if the collision engine is not reachable.
    _collisionCandidates(types, rect) {
      if (!types || !types.length) return [];
      const col = this._collisions();
      if (col && typeof col.getCollisionCandidates === "function") {
        try {
          const c = col.getCollisionCandidates(types, rect);
          if (c) return c;
        } catch (e) {
          /* fall through to a full scan */
        }
      }
      const out = [];
      for (const t of types) {
        if (t && typeof t.getAllInstances === "function") {
          const all = t.getAllInstances();
          for (let i = 0; i < all.length; i++) out.push(all[i]);
        }
      }
      return out;
    }

    _gatherOverlapping(earlyExit, includeJumpthru) {
      const inst = this.instance;
      const result = [];
      const seen = new Set();

      const consider = (c) => {
        if (!c || c === inst || seen.has(c)) return false;
        seen.add(c);
        if (typeof inst.testOverlap !== "function" || !inst.testOverlap(c)) return false;
        const sat = this._computeSAT(inst, c);
        if (!sat || sat.depth <= 0) return false;
        result.push({ inst: c, nx: sat.nx, ny: sat.ny, depth: sat.depth });
        return true;
      };

      if (this._obstacleMode === "solids") {
        // Use the documented Solid overlap test: it returns an overlapping
        // Solid-behavior instance (or null) with no type enumeration. The
        // bounded resolution loop calls this repeatedly to clear several solids.
        if (typeof inst.testOverlapSolid === "function") {
          consider(inst.testOverlapSolid());
        } else {
          // Fallback for runtimes without testOverlapSolid: scan world types
          // and keep only instances carrying an enabled Solid behavior.
          const candidates = this._collisionCandidates(this._worldTypes(), this._broadRect());
          for (let i = 0; i < candidates.length; i++) {
            if (!this._instHasEnabledSolid(candidates[i])) continue;
            if (consider(candidates[i]) && earlyExit && !includeJumpthru) return result;
          }
        }
      } else {
        // Custom mode: only the object types added via Add solid.
        const explicitTypes = [...this._solidTypes];
        if (explicitTypes.length) {
          const candidates = this._collisionCandidates(explicitTypes, this._broadRect());
          for (let i = 0; i < candidates.length; i++) {
            if (consider(candidates[i]) && earlyExit && !includeJumpthru) return result;
          }
        }
      }

      if (includeJumpthru) this._gatherJumpthru(result, seen);
      return result;
    }

    // Append one-way platform contacts that the object is currently landing on.
    // A jump-thru only blocks when the push would lift the object up onto it
    // (a floor-like normal) and the object came down onto it from above, so it
    // can still be passed through from below or the side.
    _gatherJumpthru(result, seen) {
      if (this._jumpthruSource === "none") return;
      const inst = this.instance;
      if (typeof inst.testOverlap !== "function") return;

      let candidates;
      if (this._jumpthruSource === "custom") {
        const types = [...this._jumpthruTypes];
        if (!types.length) return;
        candidates = this._collisionCandidates(types, this._broadRect());
      } else {
        // "jumpthru": every instance carrying an enabled Jump-thru behavior.
        candidates = this._collisionCandidates(this._worldTypes(), this._broadRect());
      }

      const up = this._upVec();
      const cosMax = Math.cos((this._floorSlopeMax * Math.PI) / 180);
      // Where the object was before this tick's movement (for the from-above test).
      const prevDX = this._lastResolvedX - inst.x;
      const prevDY = this._lastResolvedY - inst.y;

      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        if (!c || c === inst || seen.has(c)) continue;
        if (this._jumpthruSource === "jumpthru" && !this._instHasEnabledJumpthru(c)) continue;
        seen.add(c);
        if (!inst.testOverlap(c)) continue;
        const sat = this._computeSAT(inst, c);
        if (!sat || sat.depth <= 0) continue;
        // Only a floor-like (upward) push counts as landing on the platform.
        if (sat.nx * up[0] + sat.ny * up[1] < cosMax) continue;
        // Must have come from above: the object's previous footprint cleared
        // the platform's top edge along the up axis.
        if (!this._cameFromAbove(c, prevDX, prevDY, up)) continue;
        result.push({ inst: c, nx: sat.nx, ny: sat.ny, depth: sat.depth, oneWay: true });
      }
    }

    // True if the object, at its previous position (current + delta), was clear
    // of solid "other" on the up side - i.e. resting above it, not embedded.
    _cameFromAbove(other, dx, dy, up) {
      const pa = this._quadPoints(this.instance);
      const pb = this._quadPoints(other);
      // Shift the object's quad back to where it was before this tick's move.
      const prev = pa.map((p) => [p[0] + dx, p[1] + dy]);
      const aProj = projectPoly(prev, up[0], up[1]);
      const bProj = projectPoly(pb, up[0], up[1]);
      // On the up axis, "above" means the object's trailing (down) edge was at
      // or beyond the platform's top edge. A small tolerance absorbs skin width.
      return aProj[0] >= bProj[1] - (this._skinWidth + 1);
    }

    _instHasEnabledJumpthru(inst) {
      const bag = inst && inst.behaviors;
      if (!bag) return false;
      let list;
      try {
        list = Object.values(bag);
      } catch (e) {
        return false;
      }
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        if (
          b &&
          b.behaviorType &&
          b.behaviorType.name === "Jumpthru" &&
          b.isEnabled !== false
        ) {
          return true;
        }
      }
      return false;
    }

    _isOverlappingAny() {
      if (!this.instance) return false;
      // Open space is defined by solids only; one-way platforms never trap.
      return this._gatherOverlapping(true, false).length > 0;
    }

    _computeSAT(a, b) {
      return satMTV(this._quadPoints(a), this._quadPoints(b));
    }

    _computePush(entry, mode) {
      // One-way platforms always pop straight out along their floor normal, so a
      // fixed-axis mode can never shove the object sideways through one.
      if (entry.oneWay) {
        return { nx: entry.nx, ny: entry.ny, dist: entry.depth };
      }
      if (mode === "axis_x" || mode === "axis_y") {
        const pa = this._quadPoints(this.instance);
        const pb = this._quadPoints(entry.inst);
        const p =
          mode === "axis_x" ? penOnAxis(pa, pb, 1, 0) : penOnAxis(pa, pb, 0, 1);
        if (!p) return null;
        return { nx: p.nx, ny: p.ny, dist: p.depth };
      }
      // minimum_push (and any fallback): use the MTV computed by SAT
      return { nx: entry.nx, ny: entry.ny, dist: entry.depth };
    }

    // ----- Core de-penetration at the current position ------------------

    _resolveOverlaps() {
      const inst = this.instance;
      const mode = this._resolutionMode;

      if (mode === "nearest_open") {
        const res = this._ringEject(this._nearestOpenRadius());
        const overlapCount = res.overlapCount;
        return {
          nx: res.nx,
          ny: res.ny,
          pushX: res.dx,
          pushY: res.dy,
          overlapCount,
          moved: res.moved,
          trapped: !res.success && overlapCount > 0,
        };
      }

      const firstOverlapCount = this._gatherOverlapping(false, true).length;
      const acc = { nX: 0, nY: 0, pushX: 0, pushY: 0, moved: false };

      // "Separate" axis resolution clears the gravity axis (floors/ceilings)
      // before the cross axis (walls), which is the stable behaviour platformers
      // expect. Each contact is still cleared along its own minimum-translation
      // normal; only the order changes. It applies to the general modes only.
      const separate =
        this._axisResolution === "separate" &&
        mode !== "axis_x" &&
        mode !== "axis_y";
      this._depenGenericInto(acc, mode, separate);

      const trapped = this._isOverlappingAny();
      return {
        nx: acc.nX,
        ny: acc.nY,
        pushX: acc.pushX,
        pushY: acc.pushY,
        overlapCount: firstOverlapCount,
        moved: acc.moved,
        trapped,
      };
    }

    // Apply one push vector, accumulate it, and label the contact it cleared.
    _applyPushInto(acc, push) {
      const inst = this.instance;
      let dist = push.dist + this._skinWidth;
      if (this._maxPushPerTick > 0) dist = Math.min(dist, this._maxPushPerTick);
      if (dist <= 0) return false;
      inst.x += push.nx * dist;
      inst.y += push.ny * dist;
      acc.pushX += push.nx * dist;
      acc.pushY += push.ny * dist;
      acc.nX = push.nx;
      acc.nY = push.ny;
      acc.moved = true;
      this._classifyNormal(push.nx, push.ny);
      return true;
    }

    // Clear overlaps over a bounded number of passes. Each pass resolves one
    // contact along its minimum-translation normal. With gravityFirst on, the
    // contact most aligned with the up axis (floors/ceilings) is resolved before
    // the rest (walls), giving platformers the stable land-then-touch-wall feel.
    _depenGenericInto(acc, mode, gravityFirst) {
      const up = gravityFirst ? this._upVec() : null;
      for (let pass = 0; pass < MAX_PASSES; pass++) {
        const list = this._gatherOverlapping(false, true);
        if (!list.length) break;
        if (gravityFirst) {
          list.sort((a, b) => {
            const aa = Math.abs(a.nx * up[0] + a.ny * up[1]);
            const ba = Math.abs(b.nx * up[0] + b.ny * up[1]);
            if (Math.abs(aa - ba) > 1e-3) return ba - aa; // gravity-aligned first
            return b.depth - a.depth; // then deepest
          });
        } else {
          list.sort((a, b) => b.depth - a.depth); // resolve deepest first
        }
        const push = this._computePush(list[0], mode);
        if (!push || push.dist <= 1e-6) break;
        if (!this._applyPushInto(acc, push)) break;
      }
    }

    // ----- Sliding (preserve along-surface movement) --------------------

    _clearSlide() {
      this._slideX = 0;
      this._slideY = 0;
      this._slideDistance = 0;
      this._isSliding = false;
    }

    // Keep the part of this segment's movement that runs along the contacted
    // surface. The push-out (along the normal) already preserves the tangential
    // motion; here we optionally damp it (friction) or cancel it (no sliding).
    _applySlide(segX, segY, res) {
      this._clearSlide();

      if (this._resolutionMode === "nearest_open") return;
      if (!(res.nx || res.ny)) return;

      const inst = this.instance;
      const rlen = Math.hypot(res.nx, res.ny) || 1;
      const rnx = res.nx / rlen;
      const rny = res.ny / rlen;

      // Blend with the recent contact normal to bridge corner axis-flips
      let nx = rnx;
      let ny = rny;
      if (this._contactAge < 6 && (this._lastNX || this._lastNY)) {
        const bx = this._lastNX + (rnx - this._lastNX) * 0.5;
        const by = this._lastNY + (rny - this._lastNY) * 0.5;
        const bl = Math.hypot(bx, by);
        if (bl > 1e-4) {
          nx = bx / bl;
          ny = by / bl;
        }
      }

      const dot = segX * nx + segY * ny;
      let slideX = segX - dot * nx;
      let slideY = segY - dot * ny;

      if (!this._slidingEnabled) {
        // Stop at first contact: remove the tangential progress from this move.
        inst.x -= slideX;
        inst.y -= slideY;
        return;
      }

      if (this._slideFriction > 0) {
        inst.x -= slideX * this._slideFriction;
        inst.y -= slideY * this._slideFriction;
        slideX *= 1 - this._slideFriction;
        slideY *= 1 - this._slideFriction;
      }

      this._slideX = slideX;
      this._slideY = slideY;
      this._slideDistance = Math.hypot(slideX, slideY);
      this._isSliding = this._slideDistance > 0.05;
    }

    // ----- One full resolution (single position or sub-stepped path) ----

    // Resolve overlaps for one movement segment: push out, slide along the
    // surface, then push out again to clear anything the slide ran into.
    // Returns the combined correction for the segment.
    _resolveSegment(segX, segY) {
      const r1 = this._resolveOverlaps();
      this._applySlide(segX, segY, r1);
      const r2 = this._resolveOverlaps(); // clear overlaps the slide caused
      const nx = r1.nx || r2.nx;
      const ny = r1.ny || r2.ny;
      this._recordContact(nx, ny, r1.overlapCount || r2.overlapCount);
      return {
        pushX: r1.pushX + r2.pushX,
        pushY: r1.pushY + r2.pushY,
        nx,
        ny,
        overlapCount: r1.overlapCount,
        moved: r1.moved || r2.moved,
        trapped: r2.trapped,
        hadContact: r1.overlapCount > 0 || r2.overlapCount > 0,
      };
    }

    // Combine two segment results (a start de-penetration and a contact result).
    _mergeSeg(a, b) {
      return {
        pushX: a.pushX + b.pushX,
        pushY: a.pushY + b.pushY,
        nx: b.nx || a.nx,
        ny: b.ny || a.ny,
        overlapCount: Math.max(a.overlapCount, b.overlapCount),
        moved: a.moved || b.moved,
        trapped: b.trapped,
        hadContact: a.hadContact || b.hadContact,
      };
    }

    // Swept ("continuous") resolution. March from the last resolved position to
    // the dragged target in safe increments and stop at the first solid contact,
    // sliding the remaining motion along it. Because it stops at the entry side,
    // a fast drag can neither tunnel through a thin wall nor pop out the far
    // side. The march is capped so an arbitrarily large jump stays bounded.
    _sweepPath(startX, startY, targetX, targetY) {
      const inst = this.instance;

      // Clear any residual overlap at the start (e.g. a wall moved into the
      // object since last tick) without projecting a slide from it.
      inst.x = startX;
      inst.y = startY;
      const startSeg = this._resolveSegment(0, 0);
      const originX = inst.x;
      const originY = inst.y;

      const toX = targetX - originX;
      const toY = targetY - originY;
      const dist = Math.hypot(toX, toY);
      if (dist <= 1e-4) {
        // No travel this tick; settle in place (also catches jump-thru landings).
        return this._mergeSeg(startSeg, this._resolveSegment(0, 0));
      }

      // Granularity is Step distance when set, else adaptive. Either way the
      // sample count is clamped so the last increment always reaches the target.
      let step =
        this._stepDistance > 0
          ? this._stepDistance
          : Math.max(SWEEP_MIN_STEP, dist / MAX_SWEEP_ITERS);
      let iters = Math.max(1, Math.ceil(dist / step));
      if (iters > MAX_SWEEP_ITERS) {
        iters = MAX_SWEEP_ITERS;
        step = dist / iters;
      }
      const ux = toX / dist;
      const uy = toY / dist;

      let safeX = originX;
      let safeY = originY;
      for (let i = 1; i <= iters; i++) {
        const d = i < iters ? i * step : dist; // last sample lands exactly on target
        inst.x = originX + ux * d;
        inst.y = originY + uy * d;
        if (this._isOverlappingAny()) {
          // First contact: push out and slide the remaining intended motion.
          const contactSeg = this._resolveSegment(targetX - inst.x, targetY - inst.y);
          // Entry-side guarantee: if it could not be freed (a coarse step landed
          // it deep, or it wedged), fall back to the last clear point so it can
          // never end up on the far side of the wall.
          if (this._isOverlappingAny()) {
            inst.x = safeX;
            inst.y = safeY;
          }
          return this._mergeSeg(startSeg, contactSeg);
        }
        safeX = inst.x;
        safeY = inst.y;
      }

      // Reached the target with no solid in the way; settle (handles jump-thru).
      return this._mergeSeg(startSeg, this._resolveSegment(0, 0));
    }

    // Publish the correction described by a result into the expression fields.
    _writeOutputs(pushX, pushY, nx, ny, overlapCount, trapped) {
      this._lastPushX = pushX;
      this._lastPushY = pushY;
      this._lastPushDistance = Math.hypot(pushX, pushY);
      this._setUnitNormal(nx, ny);
      this._overlapCount = overlapCount;
      this._isTrapped = trapped;
    }

    _doResolution() {
      const inst = this.instance;
      if (!inst) return;

      this._beginClassification();

      // Movement applied since the last resolved position drives slide + stepping.
      const startX = this._lastResolvedX;
      const startY = this._lastResolvedY;
      const moveX = inst.x - startX;
      const moveY = inst.y - startY;
      const moveLen = Math.hypot(moveX, moveY);
      // Swept mode handles any jump size itself, so it bypasses the teleport and
      // stepping classification below.
      const swept = this._resolutionMode === "swept";
      const teleport = !swept && moveLen > this._teleportThreshold();
      const stepping =
        !swept &&
        this._stepDistance > 0 &&
        !teleport &&
        moveLen > this._stepDistance;

      // Accumulate each segment's correction for the post-tick On pushed out.
      let totalPushX = 0;
      let totalPushY = 0;
      let aggNX = 0;
      let aggNY = 0;
      let maxOverlap = 0;
      let anyMoved = false;
      let anyTrapped = false;
      let anyContact = false;
      const accumulate = (seg) => {
        totalPushX += seg.pushX;
        totalPushY += seg.pushY;
        if (seg.nx || seg.ny) {
          aggNX = seg.nx;
          aggNY = seg.ny;
        }
        if (seg.overlapCount > maxOverlap) maxOverlap = seg.overlapCount;
        anyMoved = anyMoved || seg.moved;
        anyTrapped = anyTrapped || seg.trapped;
        anyContact = anyContact || seg.hadContact;
      };

      if (swept) {
        // Cast from the last resolved position to the dragged target, stopping
        // at the first solid contact. Robust against fast drags (Drag & Drop).
        this._stepCount = 1;
        this._stepIndex = 0;
        accumulate(this._sweepPath(startX, startY, inst.x, inst.y));
      } else if (stepping) {
        const stepCount = Math.min(
          MAX_STEPS,
          Math.max(1, Math.ceil(moveLen / this._stepDistance))
        );
        this._stepCount = stepCount;
        const segX = moveX / stepCount;
        const segY = moveY / stepCount;

        // Replay the move in equal increments from the last resolved position,
        // resolving and firing On step at each one so fast movement is tested.
        inst.x = startX;
        inst.y = startY;
        for (let i = 1; i <= stepCount; i++) {
          inst.x += segX;
          inst.y += segY;
          const seg = this._resolveSegment(segX, segY);
          this._stepIndex = i - 1;
          this._writeOutputs(
            seg.pushX,
            seg.pushY,
            seg.nx,
            seg.ny,
            seg.overlapCount,
            seg.trapped
          ); // outputs reflect this step inside On step
          this._trigger("OnStep");
          accumulate(seg);
        }
      } else if (teleport) {
        // A jump too large to be a step is treated as placement: clear overlap
        // but do not project a slide from the implausible movement.
        this._stepCount = 1;
        this._stepIndex = 0;
        const r = this._resolveOverlaps();
        this._clearSlide();
        this._recordContact(r.nx, r.ny, r.overlapCount);
        accumulate({
          pushX: r.pushX,
          pushY: r.pushY,
          nx: r.nx,
          ny: r.ny,
          overlapCount: r.overlapCount,
          moved: r.moved,
          trapped: r.trapped,
          hadContact: r.overlapCount > 0,
        });
      } else {
        // Normal case: one resolution at the object's final position.
        this._stepCount = 1;
        this._stepIndex = 0;
        accumulate(this._resolveSegment(moveX, moveY));
      }

      // Publish the aggregate correction and remember the corrected position.
      this._writeOutputs(totalPushX, totalPushY, aggNX, aggNY, maxOverlap, anyTrapped);
      if (!anyContact) {
        this._contactAge++;
        this._isSliding = false;
      }
      this._lastResolvedX = inst.x;
      this._lastResolvedY = inst.y;

      if (anyMoved && this._lastPushDistance > 0.0001) this._trigger("OnPushedOut");
      if (anyTrapped) this._trigger("OnBecameTrapped");

      this._fireSurfaceTriggers();
    }

    // Update the coyote-time counter and fire the side-scrolling surface
    // triggers on the tick a contact is gained or lost. Each compares this
    // resolution's classification against the previous one captured in
    // _beginClassification, so they fire on the edge rather than every tick.
    _fireSurfaceTriggers() {
      this._ticksSinceFloor = this._onFloor ? 0 : this._ticksSinceFloor + 1;
      if (!this._classifyEnabled()) return;
      if (this._onFloor && !this._wasOnFloor) this._trigger("OnLanded");
      if (!this._onFloor && this._wasOnFloor) this._trigger("OnLeftFloor");
      if (this._onWall && !this._wasOnWall) this._trigger("OnHitWall");
      if (this._onCeiling && !this._wasOnCeiling) this._trigger("OnHitCeiling");
    }

    // Remember the contact normal so the next segment can blend its slide
    // direction against it, bridging the axis-flip that causes corner jitter.
    _recordContact(nx, ny, overlapCount) {
      if (overlapCount > 0 && (nx || ny)) {
        const l = Math.hypot(nx, ny) || 1;
        this._lastNX = nx / l;
        this._lastNY = ny / l;
        this._contactAge = 0;
      }
    }

    _setUnitNormal(nx, ny) {
      const l = Math.hypot(nx, ny) || 0;
      this._surfaceNormalX = l ? nx / l : 0;
      this._surfaceNormalY = l ? ny / l : 0;
    }

    // ----- Nearest-open-space ring search -------------------------------

    _ringEject(maxRadius) {
      const inst = this.instance;
      const ox = inst.x;
      const oy = inst.y;

      const initial = this._gatherOverlapping(false);
      if (!initial.length) {
        return { moved: false, dx: 0, dy: 0, nx: 0, ny: 0, overlapCount: 0, success: true };
      }

      const step = Math.max(1, this._skinWidth > 0 ? this._skinWidth : 1);
      for (let d = step; d <= maxRadius; d += step) {
        for (let s = 0; s < EJECT_SAMPLES; s++) {
          const ang = (s / EJECT_SAMPLES) * 2 * Math.PI;
          inst.x = ox + Math.cos(ang) * d;
          inst.y = oy + Math.sin(ang) * d;
          if (!this._isOverlappingAny()) {
            const dx = inst.x - ox;
            const dy = inst.y - oy;
            const l = Math.hypot(dx, dy) || 1;
            return {
              moved: true,
              dx,
              dy,
              nx: dx / l,
              ny: dy / l,
              overlapCount: initial.length,
              success: true,
            };
          }
        }
      }

      inst.x = ox;
      inst.y = oy;
      return {
        moved: false,
        dx: 0,
        dy: 0,
        nx: 0,
        ny: 0,
        overlapCount: initial.length,
        success: false,
      };
    }

    // ----- Public methods backing the ACEs ------------------------------

    _addSolidType(objType) {
      if (objType) this._solidTypes.add(objType);
    }

    _removeSolidType(objType) {
      if (objType) this._solidTypes.delete(objType);
    }

    _clearSolidTypes() {
      this._solidTypes.clear();
    }

    _isSolidType(objType) {
      return !!objType && this._solidTypes.has(objType);
    }

    _getSolidNameByIndex(index) {
      const i = Math.floor(+index);
      if (!isFinite(i) || i < 0) return "";
      const t = [...this._solidTypes][i];
      return t && t.name ? t.name : "";
    }

    _addJumpthruType(objType) {
      if (objType) this._jumpthruTypes.add(objType);
    }

    _removeJumpthruType(objType) {
      if (objType) this._jumpthruTypes.delete(objType);
    }

    _clearJumpthruTypes() {
      this._jumpthruTypes.clear();
    }

    _isJumpthruType(objType) {
      return !!objType && this._jumpthruTypes.has(objType);
    }

    _getJumpthruNameByIndex(index) {
      const i = Math.floor(+index);
      if (!isFinite(i) || i < 0) return "";
      const t = [...this._jumpthruTypes][i];
      return t && t.name ? t.name : "";
    }

    _resolveNow() {
      if (!this.instance) return;
      if (!this._initialized) this._captureRestPosition();
      this._doResolution();
    }

    _ejectToNearestOpenSpace(maxRadius) {
      const inst = this.instance;
      if (!inst) return;
      if (!this._initialized) this._captureRestPosition();
      const r = Math.max(0, +maxRadius || 0);
      const res = this._ringEject(r);
      if (res.success) {
        this._lastPushX = res.dx;
        this._lastPushY = res.dy;
        this._lastPushDistance = Math.hypot(res.dx, res.dy);
        this._setUnitNormal(res.dx, res.dy);
        this._overlapCount = 0;
        this._isTrapped = false;
        this._clearSlide();
        this._lastResolvedX = inst.x;
        this._lastResolvedY = inst.y;
        this._trigger("OnEjected");
      } else {
        this._overlapCount = res.overlapCount;
        this._trigger("OnEjectFailed");
      }
    }

    _setEnabled(enabled) {
      this._enabled = !!enabled;
    }

    _setResolutionMode(mode) {
      // Combo params arrive as a 0-based index at runtime; also accept a key.
      if (typeof mode === "number") {
        this._resolutionMode = MODE_KEYS[mode] || "minimum_push";
      } else if (typeof mode === "string" && MODE_KEYS.indexOf(mode) !== -1) {
        this._resolutionMode = mode;
      }
    }

    _setObstacleMode(mode) {
      // Combo params arrive as a 0-based index at runtime; also accept a key.
      if (typeof mode === "number") {
        this._obstacleMode = OBSTACLE_MODES[mode] || "custom";
      } else if (typeof mode === "string" && OBSTACLE_MODES.indexOf(mode) !== -1) {
        this._obstacleMode = mode;
      }
    }

    _setSlidingEnabled(enabled) {
      this._slidingEnabled = !!enabled;
    }

    _setSlideFriction(friction) {
      this._slideFriction = this._clamp01(friction);
    }

    _setStepDistance(distance) {
      const d = +distance;
      this._stepDistance = isFinite(d) && d > 0 ? d : 0;
    }

    _setMaxPushPerTick(pixels) {
      const p = +pixels;
      this._maxPushPerTick = isFinite(p) && p > 0 ? p : 0;
    }

    _setSkinWidth(pixels) {
      const p = +pixels;
      this._skinWidth = isFinite(p) && p > 0 ? p : 0;
    }

    // Combo params arrive as a 0-based index at runtime; also accept a key.
    _comboKey(value, keys, fallback) {
      if (typeof value === "number") return keys[value] || fallback;
      if (typeof value === "string" && keys.indexOf(value) !== -1) return value;
      return null;
    }

    _setMovementStyle(style) {
      const k = this._comboKey(style, MOVEMENT_STYLES, "top_down");
      if (k) this._movementStyle = k;
    }

    _setUpDirection(dir) {
      const k = this._comboKey(dir, UP_DIRS, "up");
      if (k) this._upDir = k;
    }

    _setFloorSlopeMax(degrees) {
      this._floorSlopeMax = this._clampAngle(degrees, this._floorSlopeMax);
    }

    _setAxisResolution(mode) {
      const k = this._comboKey(mode, AXIS_RES_MODES, "minimum");
      if (k) this._axisResolution = k;
    }

    _setJumpthruSource(source) {
      const k = this._comboKey(source, JUMPTHRU_SOURCES, "none");
      if (k) this._jumpthruSource = k;
    }

    // ----- Debugger -----------------------------------------------------

    _getDebuggerProperties() {
      return [
        {
          title: "$" + this.behaviorType.name,
          properties: [
            { name: "$enabled", value: this._enabled },
            { name: "$obstacles", value: this._obstacleMode },
            { name: "$resolutionMode", value: this._resolutionMode },
            { name: "$movementStyle", value: this._movementStyle },
            { name: "$axisResolution", value: this._axisResolution },
            { name: "$isSliding", value: this._isSliding },
            { name: "$isTrapped", value: this._isTrapped },
            { name: "$onFloor", value: this._onFloor },
            { name: "$onWall", value: this._onWall },
            { name: "$onCeiling", value: this._onCeiling },
            { name: "$wallSide", value: this._wallSide },
            { name: "$slopeAngle", value: this._slopeAngle },
            { name: "$ticksSinceFloor", value: this._ticksSinceFloor },
            { name: "$overlapCount", value: this._overlapCount },
            { name: "$lastPushDistance", value: this._lastPushDistance },
            { name: "$solidCount", value: this._solidTypes.size },
            { name: "$jumpthruSource", value: this._jumpthruSource },
            { name: "$jumpthruCount", value: this._jumpthruTypes.size },
          ],
        },
      ];
    }

    // ----- Save / Load (config only) ------------------------------------

    _saveToJson() {
      const sids = [];
      for (const t of this._solidTypes) {
        const sid = this._typeSid(t);
        if (sid != null) sids.push(sid);
      }
      const jids = [];
      for (const t of this._jumpthruTypes) {
        const sid = this._typeSid(t);
        if (sid != null) jids.push(sid);
      }
      return {
        enabled: this._enabled,
        resolutionMode: this._resolutionMode,
        slidingEnabled: this._slidingEnabled,
        slideFriction: this._slideFriction,
        stepDistance: this._stepDistance,
        obstacleMode: this._obstacleMode,
        maxPushPerTick: this._maxPushPerTick,
        skinWidth: this._skinWidth,
        movementStyle: this._movementStyle,
        upDir: this._upDir,
        floorSlopeMax: this._floorSlopeMax,
        axisResolution: this._axisResolution,
        jumpthruSource: this._jumpthruSource,
        solids: sids,
        jumpthrus: jids,
      };
    }

    _loadFromJson(o) {
      if (!o) return;
      if (typeof o.enabled === "boolean") this._enabled = o.enabled;
      if (MODE_KEYS.indexOf(o.resolutionMode) !== -1)
        this._resolutionMode = o.resolutionMode;
      if (typeof o.slidingEnabled === "boolean")
        this._slidingEnabled = o.slidingEnabled;
      if (typeof o.slideFriction === "number")
        this._slideFriction = this._clamp01(o.slideFriction);
      if (typeof o.stepDistance === "number")
        this._stepDistance = Math.max(0, o.stepDistance);
      if (OBSTACLE_MODES.indexOf(o.obstacleMode) !== -1)
        this._obstacleMode = o.obstacleMode;
      if (typeof o.maxPushPerTick === "number")
        this._maxPushPerTick = Math.max(0, o.maxPushPerTick);
      if (typeof o.skinWidth === "number")
        this._skinWidth = Math.max(0, o.skinWidth);
      if (MOVEMENT_STYLES.indexOf(o.movementStyle) !== -1)
        this._movementStyle = o.movementStyle;
      if (UP_DIRS.indexOf(o.upDir) !== -1) this._upDir = o.upDir;
      if (typeof o.floorSlopeMax === "number")
        this._floorSlopeMax = this._clampAngle(o.floorSlopeMax, this._floorSlopeMax);
      if (AXIS_RES_MODES.indexOf(o.axisResolution) !== -1)
        this._axisResolution = o.axisResolution;
      if (JUMPTHRU_SOURCES.indexOf(o.jumpthruSource) !== -1)
        this._jumpthruSource = o.jumpthruSource;

      this._solidTypes.clear();
      if (Array.isArray(o.solids)) {
        for (let i = 0; i < o.solids.length; i++) {
          const t = this._typeFromSid(o.solids[i]);
          if (t) this._solidTypes.add(t);
        }
      }

      this._jumpthruTypes.clear();
      if (Array.isArray(o.jumpthrus)) {
        for (let i = 0; i < o.jumpthrus.length; i++) {
          const t = this._typeFromSid(o.jumpthrus[i]);
          if (t) this._jumpthruTypes.add(t);
        }
      }
    }

    _typeSid(t) {
      if (!t) return null;
      if (typeof t.sid === "number") return t.sid;
      if (typeof t.SID === "number") return t.SID;
      return null;
    }

    _typeFromSid(sid) {
      if (sid == null) return null;
      try {
        if (
          this.runtime.sdk &&
          typeof this.runtime.sdk.getObjectClassBySid === "function"
        ) {
          return this.runtime.sdk.getObjectClassBySid(sid) || null;
        }
      } catch (e) {
        /* ignore */
      }
      return null;
    }
  };
}
