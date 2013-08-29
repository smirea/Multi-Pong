
Point2D.prototype.toObject = function () {
  return {x:this.x, y:this.y};
};

/**
 * A holder for all the sprites in a canvas
 * @param {Canvas} canvas
 */
function Stage (canvas) {
  this.canvas = canvas;
  this.context = this.canvas.getContext('2d');
}
Stage.prototype = {
  sprites: {},
  canvas: null,
  context: null,
  _grid: {
    x: 25,
    y: 25,
    emphasize: 100,
    labels: true,
    style: {
      fillStyle: '#666',
      strokeStyle: '#ccc',
      font: '11px Courier New',
    }
  },
  // Unnamed sprites get an index as a name.
  _spriteIndex: 0,

  get width () {
    return this.canvas.width;
  },

  get height () {
    return this.canvas.height;
  },

  /**
   * Draw a grid before anything else
   * @param  {Number|Object} val Either a number or a {x:, y:} Object
   */
  grid: function (val) {
    if (typeof val == 'number') {
      val = {x:val, y:val};
    }
    for (var key in val) {
      this._grid[key] = val[key];
    }
    return this;
  },

  /**
   * Add an element to the stage
   * @param {string|Sprite} name   The Sprite can optionally be named
   * @param {Sprite} sprite If the first argument is a name, this is the actual Sprite element
   */
  add: function add (name, sprite) {
    sprite = sprite || name;
    name = typeof name == 'string' ? name : ++this._spriteIndex;
    if (!(sprite instanceof Sprite)) {
      throw new Error('Element is not a Sprite:', sprite);
    }
    this.sprites[name] = sprite;
    return this;
  },

  /**
   * Returns a named Sprite from the stage.
   * @param  {String} name
   * @return {Sprite}
   */
  get: function (name) {
    if (!(name in this.sprites)) {
      throw new Error('No sprite named: ' + name);
    }
    return this.sprites[name];
  },

  /**
   * Go through every registered sprite and call its draw method.
   */
  draw: function draw () {
    if (this._grid) {
      this._drawGrid();
    }
    for (var key in this.sprites) {
      this.sprites[key].draw(this);
    }
    return this;
  },

  /**
   * By default clears the whole canvas. Optionally you can clear a part of it
   * @param  {Number} x
   * @param  {Number} y
   * @param  {Number} w
   * @param  {Number} h
   */
  clear: function (x, y, w, h) {
    x = Number.isFinite(x) ? x : 0;
    y = Number.isFinite(y) ? y : 0;
    w = Number.isFinite(w) ? w : this.width;
    h = Number.isFinite(h) ? h : this.height;
    this.context.clearRect(x, y, w, h);
    return this;
  },

  /**
   * Apply a set of styles to the stage.
   * @param  {Object} style
   */
  applyStyle: function applyStyle (style) {
    for (var key in style) {
      this.context[key] = style[key];
    }
  },

  /**
   * Draws a grid
   * @param  {Object} size
   */
  _drawGrid: function (size) {
    size = size || this._grid;
    var ctx = this.context;
    ctx.save();
    this.applyStyle(this._grid.style);
    ctx.beginPath();
    var pos;
    for (var x=size.x; x<this.width; x+=size.x) {
      pos = x + (this._grid.emphasize && x % this._grid.emphasize === 0 ? 0 : 0.5);
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, this.height);
      ctx.stroke();
      if (this._grid.labels) {
        ctx.fillText(x, x + 2, 13);
      }
    }
    for (var y=size.y; y<this.height; y+=size.y) {
      pos = y + (this._grid.emphasize && y % this._grid.emphasize === 0 ? 0 : 0.5);
      ctx.moveTo(0, pos);
      ctx.lineTo(this.width, pos);
      ctx.stroke();
      if (this._grid.labels) {
        ctx.fillText(y, 4, y - 2);
      }
    }
    ctx.closePath();
    ctx.restore();
  }
};

function Sprite (opt) {
  // We need to re-define all object properties that are partially
  // modified by the methods otherwise they will be globally modified.
  var pr = this.__proto__.__proto__;
  while (pr && pr != Object) {
    Object.keys(pr).map(function (k) {
      if (!this.hasOwnProperty(k) && typeof this[k] == 'object' && this[k] !== null &&
        this[k].constructor == Object) {
        this[k] = cloneObject(this[k]);
      }
    }.bind(this));
    pr = pr.__proto__;
  }

  // extend the options
  if (opt) {
    var exclude = [];
    var key;
    if ('style' in opt) {
      for (key in opt.style) {
        this.style[key] = opt.style[key];
      }
      exclude.push('style');
    }
    for (key in opt) {
      if (exclude.indexOf(key) > -1) {
        continue;
      }
      this[key] = opt[key];
    }
  }
}
Sprite.prototype = {
  style: {},
  x: 0,
  y: 0,
  angle: 0,
  normalVisible: false,

  /**
   * Should be avoided whenever possible as it creates considerable overhead.
   */
  get origin () {
    return new Point2D(this.x, this.y);
  },

  /**
   * Angle + 90deg.
   */
  get normal_angle () {
    return this.angle + Math.PI / 2;
  },

  /**
   * Get the minimum number of points to draw the Sprite.
   * (e.g. for Rectangle is 2, for Circle is 1)
   */
  get points () {
    return [new Point2D(this.x, this.y)];
  },

  /**
   * If defined as a method, when performing intersections this method will be
   * used instead of the standard collision detection.
   *
   * When defining this method, one must usually filter between accepted types
   * and throw if an imcompatible class is detected.
   *
   * @param {Sprite} object The object to check the intersection against.
   * @return {Object} {status:'Intersection|Outside', points:[]}
   */
  intersect: null,

  /**
   * Every subclass must re-implement this method and call the super-class
   * for checks. This method does not actual do anything.
   * @param  {Stage} stage
   */
  draw: function (stage) {
    if (!(stage instanceof Stage)) {
      throw new Error('First argument is not an instance of Stage:', stage);
    }
  },

  /**
   * Draws the normal of the Sprite by default.
   * It can be used to draw any vector (any arrow) anywhere though :)
   *
   * Important: Options.origin is relative to the origin of the sprite.
   * Use Options.{x|y} for absolute positioning
   *
   * @param  {Stage} stage
   * @param  {Object} opt   Options. Check the defaults variable in the method.
   */
  draw_normal: function (stage, opt) {
    if (!stage || !(stage instanceof Stage)) {
      throw new Error('Stage not an instance of Stage', stage);
    }
    var defaults = {
      // Origin of the Sprite.
      x: this.x,
      y: this.y,
      // Origin of the base of the vector relative to the origin of the Sprite.
      origin: {x:0, y:0},
      color: '#009900',
      arrow_size: 50,
      angle: this.normal_angle,
      head_size: 10,
      head_angle: Math.PI / 8
    };
    opt = opt || {};
    for (var key in defaults) {
      opt[key] = (key in opt) ? opt[key] : defaults[key];
    }
    var ctx = stage.context;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = opt.color;
    ctx.fillStyle = opt.color;
    ctx.translate(opt.x, opt.y);
    ctx.rotate(opt.angle - Math.PI / 2);
    ctx.translate(opt.origin.x, opt.origin.y);
    ctx.rotate(Math.PI / 2);
    ctx.moveTo(0, 0);
    ctx.lineTo(opt.arrow_size, 0);
    ctx.translate(opt.arrow_size, 0);
    ctx.rotate(Math.PI + opt.head_angle);
    ctx.lineTo(opt.head_size, 0);
    ctx.rotate(-2 * opt.head_angle);
    ctx.lineTo(opt.head_size, 0);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  },
};

/**
 * Rectangle
 * @param {Object} opt Options: {x, y, w, h, angle}
 */
function Rectangle (opt) {
  Sprite.call(this, opt);
}
Rectangle.prototype = {
  __proto__: Sprite.prototype,
  w: 150,
  h: 10,
  style: {},
  get points () {
    return [
      new Point2D(this.x, this.y),
      new Point2D(
        this.x - Math.sin(this.angle) * this.h + Math.cos(this.angle) * this.w,
        this.y + Math.cos(this.angle) * this.h + Math.sin(this.angle) * this.w)
    ];
  },
  draw: function (stage) {
    Sprite.prototype.draw.call(this, stage);
    var ctx = stage.context;
    ctx.save();
    ctx.beginPath();
    stage.applyStyle(this.style);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.rect(0, 0, this.w, this.h);
    ctx.fill();
    ctx.closePath();
    ctx.restore();
    if (this.normalVisible) {
      this.draw_normal(stage);
    }
    return this;
  },
  draw_normal: function (stage, opt) {
    opt = opt ? cloneObject(opt) : {};
    opt.origin = opt.origin || {
      x: this.w / 2,
      y: this.h / 2
    };
    Sprite.prototype.draw_normal.call(this, stage, opt);
  }
};

/**
 * Circle.
 * @param {Object} opt Options: {x, y, r}
 */
function Circle (opt) {
  Sprite.call(this, opt);
}
Circle.prototype = {
  __proto__: Sprite.prototype,
  radius: 20,

  intersect: function (elem) {
    if (!elem) { throw new Error('Invalid Sprite:', elem); }
    if (elem instanceof Circle) { return this.intersectCircle(elem); }
    if (elem instanceof Ray) { return this.intersectRay(elem); }
    throw new Error('Intersection with this element not implemented:', elem);
  },

  intersectCircle: function (elem) {
    return Intersection.intersectCircleCircle(
      this.origin, this.radius,
      elem.origin, elem.radius
    );
  },

  intersectRay: function (elem) {
    return Intersection.intersectCircleLine(
      this.origin, this.radius,
      elem.points[0], elem.points[1]
    );
  },

  draw: function (stage) {
    Sprite.prototype.draw.call(this, stage);
    stage.context.save();
    stage.applyStyle(this.style);
    stage.context.beginPath();
    stage.context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    stage.context.fill();
    stage.context.restore();
    return this;
  }
};

function Ball (opt) {
  Circle.call(this, opt);
}
Ball.prototype = {
  __proto__: Circle.prototype,
};

/**
 * Create a n-edged polygon.
 * Configurable setters: edges
 * @param {Object} opt {edges}
 */
function Polygon (opt) {
  Sprite.call(this, opt);
  // Initialize side effects.
  this.edges = this.edges;
}
Polygon.prototype = {
  __proto__: Sprite.prototype,
  _radius: 150,
  _edges: 6,
  _corner_angle: null,
  _edge_length: null,
  _inner_radius: null,
  // Will store all the Sprites that compose this element.
  _sprites: [],

  set radius (val) {
    this._radius = val;
    this._edge_length = Math.cos(this._corner_angle) * this.radius * 2;
    this._inner_radius = Math.sqrt(this.radius*this.radius - this._edge_length*this._edge_length/4);
  },
  get radius () {
    return this._radius;
  },
  set edges (val) {
    this._edges = val;
    this._corner_angle = Math.PI * 2 / this._edges;
    this.radius = this.radius;
    var angle = Math.PI * 3/2;
    var start_angle = (Math.PI - this._corner_angle) / 4;
    for (var i=0; i<this.edges; ++i) {
      this._sprites.push(new Rectangle({
          x: this.x + this.radius * Math.cos(angle + i * this._corner_angle),
          y: this.y + this.radius * Math.sin(angle + i * this._corner_angle),
          w: this._edge_length,
          angle: start_angle,
          style:this.style
      }));
      start_angle += this._corner_angle;
    }
  },
  get edges () {
    return this._edges;
  },
  intersect: function (elem) {
    if (!elem) { throw new Error('Invalid Sprite:', elem); }
    if (elem instanceof Ray) { return this.intersectRay(elem); }
    throw new Error('Intersection with this element not implemented:', elem);
  },
  intersectRay: function (elem) {
    var outer_intersection = Intersection.intersectCircleLine(
      {x:this.x, y:this.y}, this._inner_radius,
      elem.points[0], elem.points[1]
    );
    var inner_intersection = Intersection.intersectCircleLine(
      {x:this.x, y:this.y}, this.radius,
      elem.points[0], elem.points[1]
    );
    if (!outer_intersection.points.length && !inner_intersection.points.length) {
      return {status:'Outside', points:[]};
    }
    var points = [];
    for (var i=0; i<this._sprites.length; ++i) {
      var insc = Intersection.intersectLineLine(
        elem.points[0],
        elem.points[1],
        this._sprites[i].points[0],
        this._sprites[i].points[1]
      );
      if (insc.points.length === 0) { continue; }
      for (var j=0; j<insc.points.length; ++j) {
        points.push(insc.points[j]);
      }
    }
    return {
      status: points.length === 0 ? 'Outside' : 'Intersection',
      points: points
    };
  },
  draw: function (stage) {
    Sprite.prototype.draw.call(this, stage);
    for (var i=0; i<this._sprites.length; ++i) {
      this._sprites[i].draw(stage);
    }
  }
};

/**
 * Ray used for tracing trajectories. Used in testing
 * @param {Object} opt The options
 */
function Ray (opt) {
  Sprite.call(this, opt);
}
Ray.prototype = {
  __proto__: Sprite.prototype,
  radius: 5,
  max_reflections: 5,
  style: {
    fillStyle: '#FF0000',
  },

  /**
   * Gets all the Sprites on the Stage that intersect with the ray vector in order
   * with the closest one in intersections[0].
   *
   * @param  {Object} ray   For tracing purposes we don't directly use the instance
   *                          but pass an object which is the current "reflection"
   *                          of the ray. See
   * @param  {Stage} stage
   * @return {Array}        All the intersections sorted.
   */
  get_intersections: function (ray, stage) {
    var intersections = [];

    for (var key in stage.sprites) {
      var elem = stage.sprites[key];
      if (!(elem instanceof Rectangle || elem instanceof Polygon || elem instanceof Circle)) {
        continue;
      }
      if (elem.intersect) {
        intersections.push({
          line: elem,
          intersection: elem.intersectRay(ray)
        });
        continue;
      }
      intersections.push({
        line: elem,
        intersection: Intersection.intersectLineLine(
          ray.points[0], ray.points[1],
          elem.points[0], elem.points[1]
        )
      });
    }

    intersections = intersections.filter(function (data) {
      return  data.intersection.status == 'Intersection' &&
              !(float_equal(ray.x, data.intersection.points[0].x) &&
                float_equal(ray.y, data.intersection.points[0].y));
    });

    intersections.sort(function (a, b) {
      a = a.intersection.points[0];
      b = b.intersection.points[0];
      return float_equal(a.x, b.x) && float_equal(a.y, b.y) ? 0 :
        !float_equal(a.y, b.y) ?
          (ray.dy > 0 ? a.y > b.y : a.y < b.y) :
          (ray.dx > 0 ? a.x > b.x : a.x < b.x);
    });

    // console.log(intersections.map(function(i){ return JSON.stringify(i.intersection.points[0].toObject(), null, 2); }).join("\n"));

    return intersections;
  },

  /**
   * Gets an object used for recursive ray tracing.
   * If no arguments are passed the current Ray's state is used.
   *
   * @param  {Number} x
   * @param  {Number} y
   * @param  {Number} angle
   * @return {Object}
   */
  get_traceable_ray: function (x, y, angle) {
    if (arguments.length === 0) {
      x = this.x;
      y = this.y;
      angle = this.angle;
    }
    angle = angle % (Math.PI * 2);
    var dx = Math.cos(angle);
    var dy = Math.sin(angle);
    return {
      x:x, y:y, angle:angle, dx:dx, dy:dy,
      points: [
        new Point2D(x, y),
        new Point2D(x + 9000 * dx, y + 9000 * dy),
      ]
    };
  },

  /**
   * Draw this.max_reflections reflections of the current Ray.
   * @param  {Stage} stage
   */
  draw: function (stage) {
    Sprite.prototype.draw.call(this, stage);
    var ctx = stage.context;

    ctx.save();
    var ray = this.get_traceable_ray();
    for (var i=0; i<=this.max_reflections; ++i) {
      var intersections = this.get_intersections(ray, stage);
      if (!intersections.length) {
        console.warn('No more intersections!');
        break;
      }
      var data = intersections[0];
      var p = data.intersection.points[0];
      var refl_angle = 2 * data.line.angle - ray.angle;

      this.draw_normal(stage, {x:p.x, y:p.y, angle:data.line.normal_angle});

      // Draw reflection ray.
      ctx.save();
      ctx.beginPath();
      stage.applyStyle(this.style);
      // ctx.globalAlpha = 1.0 - 0.5 * i;
      ctx.moveTo(ray.x, ray.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.closePath();
      ctx.restore();

      // Draw intersection points.
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = 'orange';
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
      ctx.restore();

      ray = this.get_traceable_ray(p.x, p.y, refl_angle);
      this.draw_normal(stage, {x:ray.x, y:ray.y, angle:ray.angle, color:'#0000ff'});
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = 'red';
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    ctx.restore();
    this.draw_normal(stage, {angle: this.angle});
  }
};

function float_equal (f1, f2, precision) {
  precision = precision || 1e-10;
  return Math.abs(f1 - f2) < precision;
}

function cloneObject (obj) {
  if(obj === null || typeof(obj) != 'object') {
    return obj;
  }
  var temp = obj.constructor();
  for(var key in obj) {
    temp[key] = cloneObject(obj[key]);
  }
  return temp;
}

