import { id, addonType } from "../../config.caw.js";
import AddonTypeMap from "../../template/addonTypeMap.js";

// ---------------------------------------------------------------------------
// Stateless geometry helpers (SAT / minimum-translation-vector).
// All push-out is reproduced from documented public collision/geometry APIs.
// No internal engine push-out routine is ever called.
// ---------------------------------------------------------------------------

const MODE_KEYS = ["minimum_push", "axis_x", "axis_y", "nearest_open"];
// Obstacle source, matching the "Obstacles" combo item order in config.caw.js.
const OBSTACLE_MODES = ["custom", "solids"];
const MAX_PASSES = 4; // bounded de-penetration passes per resolution
const MAX_STEPS = 100; // cap on sub-steps so a teleport cannot explode cost
const EJECT_SAMPLES = 16; // ring samples for the nearest-open search

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
      this._worldTypesCache = null; // cached world object types for the Solid-behavior union

      // --- Configuration (read each resolution; change live) ------------
      // Property declaration order from config.caw.js:
      // 0 enabled, 1 resolutionMode, 2 resolveOnTick, 3 enableSliding,
      // 4 slideFriction, 5 stepDistance, 6 obstacles,
      // 7 maxPushPerTick, 8 skinWidth
      const properties = this._getInitProperties();
      if (properties) {
        this._enabled = properties[0] !== false;
        this._resolutionMode = MODE_KEYS[properties[1]] || "minimum_push";
        this._resolveOnTick = properties[2] !== false;
        this._slidingEnabled = properties[3] !== false;
        this._slideFriction = this._clamp01(properties[4] || 0);
        this._stepDistance = Math.max(0, properties[5] || 0);
        this._obstacleMode = OBSTACLE_MODES[properties[6]] || "solids";
        this._maxPushPerTick = Math.max(0, properties[7] || 0);
        this._skinWidth = Math.max(0, properties[8] != null ? properties[8] : 0.5);
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

    _gatherOverlapping(earlyExit) {
      const inst = this.instance;
      const result = [];
      const seen = new Set();
      const rect = this._broadRect();

      const consider = (c, requireSolidBehavior) => {
        if (c === inst || seen.has(c)) return false;
        seen.add(c);
        if (typeof inst.testOverlap !== "function") return false;
        if (requireSolidBehavior && !this._instHasEnabledSolid(c)) return false;
        if (!inst.testOverlap(c)) return false;
        const sat = this._computeSAT(inst, c);
        if (!sat || sat.depth <= 0) return false;
        result.push({ inst: c, nx: sat.nx, ny: sat.ny, depth: sat.depth });
        return true;
      };

      if (this._obstacleMode === "solids") {
        // Solids mode: any object with an enabled built-in Solid behavior,
        // checked per instance at query time (the explicit registry is unused).
        let candidates = [];
        try {
          candidates =
            this.runtime.collisions.getCollisionCandidates(this._worldTypes(), rect) ||
            [];
        } catch (e) {
          candidates = [];
        }
        for (let i = 0; i < candidates.length; i++) {
          if (consider(candidates[i], true) && earlyExit) return result;
        }
      } else {
        // Custom mode: only the object types added via Add solid.
        const explicitTypes = [...this._solidTypes];
        if (explicitTypes.length) {
          let candidates = [];
          try {
            candidates =
              this.runtime.collisions.getCollisionCandidates(explicitTypes, rect) || [];
          } catch (e) {
            candidates = [];
          }
          for (let i = 0; i < candidates.length; i++) {
            if (consider(candidates[i], false) && earlyExit) return result;
          }
        }
      }

      return result;
    }

    _isOverlappingAny() {
      if (!this.instance) return false;
      return this._gatherOverlapping(true).length > 0;
    }

    _computeSAT(a, b) {
      return satMTV(this._quadPoints(a), this._quadPoints(b));
    }

    _computePush(entry, mode) {
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

      let nX = 0;
      let nY = 0;
      let pushedX = 0;
      let pushedY = 0;
      let firstOverlapCount = 0;
      let moved = false;

      for (let pass = 0; pass < MAX_PASSES; pass++) {
        const list = this._gatherOverlapping(false);
        if (pass === 0) firstOverlapCount = list.length;
        if (!list.length) break;
        list.sort((a, b) => b.depth - a.depth); // resolve deepest first
        const push = this._computePush(list[0], mode);
        if (!push || push.dist <= 1e-6) break;
        let dist = push.dist + this._skinWidth;
        if (this._maxPushPerTick > 0) dist = Math.min(dist, this._maxPushPerTick);
        if (dist <= 0) break;
        inst.x += push.nx * dist;
        inst.y += push.ny * dist;
        pushedX += push.nx * dist;
        pushedY += push.ny * dist;
        nX = push.nx;
        nY = push.ny;
        moved = true;
      }

      const trapped = this._isOverlappingAny();
      return {
        nx: nX,
        ny: nY,
        pushX: pushedX,
        pushY: pushedY,
        overlapCount: firstOverlapCount,
        moved,
        trapped,
      };
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

      // Movement applied since the last resolved position drives slide + stepping.
      const startX = this._lastResolvedX;
      const startY = this._lastResolvedY;
      const moveX = inst.x - startX;
      const moveY = inst.y - startY;
      const moveLen = Math.hypot(moveX, moveY);
      const teleport = moveLen > this._teleportThreshold();
      const stepping =
        this._stepDistance > 0 && !teleport && moveLen > this._stepDistance;

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

      if (stepping) {
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

    // ----- Debugger -----------------------------------------------------

    _getDebuggerProperties() {
      const solidNames = [...this._solidTypes].map((t) =>
        t && t.name ? t.name : "?"
      );
      return [
        {
          title: "$Push-Out and Slide - State",
          properties: [
            { name: "$enabled", value: this._enabled, onedit: (v) => this._setEnabled(!!v) },
            { name: "$resolutionMode", value: this._resolutionMode },
            {
              name: "$slidingEnabled",
              value: this._slidingEnabled,
              onedit: (v) => this._setSlidingEnabled(!!v),
            },
            {
              name: "$slideFriction",
              value: this._slideFriction,
              onedit: (v) => this._setSlideFriction(+v),
            },
            {
              name: "$stepDistance",
              value: this._stepDistance,
              onedit: (v) => this._setStepDistance(+v),
            },
            { name: "$isSliding", value: this._isSliding },
            { name: "$isTrapped", value: this._isTrapped },
            { name: "$overlapCount", value: this._overlapCount },
            { name: "$lastPushX", value: this._lastPushX },
            { name: "$lastPushY", value: this._lastPushY },
            { name: "$lastPushDistance", value: this._lastPushDistance },
            { name: "$surfaceNormalX", value: this._surfaceNormalX },
            { name: "$surfaceNormalY", value: this._surfaceNormalY },
            { name: "$stepCount", value: this._stepCount },
          ],
        },
        {
          title: "$Push-Out and Slide - Solids",
          properties: [
            { name: "$obstacleMode", value: this._obstacleMode },
            { name: "$solidCount", value: this._solidTypes.size },
            { name: "$registeredSolids", value: solidNames.join(", ") },
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
      return {
        enabled: this._enabled,
        resolutionMode: this._resolutionMode,
        slidingEnabled: this._slidingEnabled,
        slideFriction: this._slideFriction,
        stepDistance: this._stepDistance,
        obstacleMode: this._obstacleMode,
        maxPushPerTick: this._maxPushPerTick,
        skinWidth: this._skinWidth,
        solids: sids,
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

      this._solidTypes.clear();
      if (Array.isArray(o.solids)) {
        for (let i = 0; i < o.solids.length; i++) {
          const t = this._typeFromSid(o.solids[i]);
          if (t) this._solidTypes.add(t);
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
