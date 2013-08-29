var stage;
var animation_timeout = null;

window.onload = function onload () {
  stage = new Stage(document.getElementById('canvas'));
  // var len = 50;
  // var no = 10;
  // for (var i=0; i<no; ++i) {
  //   var a = 2 * Math.PI / no * i;
  //   stage.add('spin-'+i, new Rectangle({
  //     x: 200 + len * Math.cos(a),
  //     y: 200 + len * Math.sin(a),
  //     w: 30,
  //     h: 10,
  //     angle: a,
  //   }));
  // }



  var w = stage.width;
  var h = stage.height;
  var o1 = 50;
  stage.
    add(new Rectangle({x:0, y:0, w:w, h:2,})).
    add(new Rectangle({x:0, y:h, w:w, h:2, angle:Math.PI * 3/2})).
    add(new Rectangle({x:w, y:0, w:w, h:2, angle:Math.PI * 1/2})).
    add(new Rectangle({x:w, y:h, w:w, h:2, angle:Math.PI * 2/2})).
    grid(50).
    add(new Rectangle({x:o1, y:o1, w:w-2*o1})).
    add(new Rectangle({x:o1, y:h-o1, w:h-2*o1, angle:Math.PI * 3/2})).
    add(new Rectangle({x:w-o1, y:o1, w:h-2*o1, angle:Math.PI * 1/2})).
    add(new Rectangle({x:w-o1, y:h-o1, w:w-2*o1, angle:Math.PI * 2/2})).
    add(new Rectangle({x:400, y:100, w:150, angle:Math.PI * 5/8})).
    add('ball', new Ball({x:150, y:150})).
    // add(new Polygon({x:300, y:300, radius:150, edges:6, style:{fillStyle:'cyan', lineWidth:10}})).
    add('ray', new Ray({x:300, y:250, angle:Math.PI * 3/8, style:{strokeStyle:'crimson'} })).
    draw();

  var fps_value = 60;
  // fps(fps_value, animate);

  window.addEventListener('keydown', function (event) {
    var ray = stage.get('ray');
    var mul = event.shiftKey ? 5 : 1;
    var redraw = true;
    switch (event.keyCode) {
      case 32: // spacebar
        if (!animation_timeout) {
          fps(fps_value, animate);
        } else {
          clearTimeout(animation_timeout);
          animation_timeout = null;
        }
        break;
      case 38: // up -> increase reflections
        ray.max_reflections += mul;
        console.info('Max reflections: %s', ray.max_reflections);
        break;
      case 40: // down -> decrease reflections
        ray.max_reflections = Math.max(ray.max_reflections - mul, 0);
        console.info('Max reflections: %s', ray.max_reflections);
        break;
     case 37: // left -> decrease fps
        fps_value = Math.max(0, fps_value - 2 * mul);
        fps(fps_value, animate);
        console.info('FPS: %s', fps_value);
        break;
      case 39: // right -> increase fps
        fps_value += (2 * mul);
        fps(fps_value, animate);
        console.info('FPS: %s', fps_value);
        break;
      case 187: // + -> icrease angle
        ray.angle += (Math.PI / 90 * mul);
        console.info('Angle: %s', ray.angle);
        break;
      case 189: // - -> decrease angle
        ray.angle -= (Math.PI / 90 * mul);
        console.info('Angle: %s', ray.angle);
        break;
      default:
        redraw = false;
        console.info('Key pressed: %s', event.keyCode);
    }
    if (redraw) {
      stage.clear().draw();
    }
  });
  stage.canvas.addEventListener('mousemove', function (event) {
    stage.get('ray').x = event.offsetX;
    stage.get('ray').y = event.offsetY;
  });
};

function fps (num, callback) {
  clearTimeout(animation_timeout);
  callback();
  animation_timeout = setTimeout(fps.bind(fps, num, callback), 1000 / num);
}

var angle = 0;
var rotation = 0;
function animate () {
  // var origin = {x:300, y:300};
  // var length = 100;
  // stage.get('ray').x = origin.x + length * Math.cos(angle);
  // stage.get('ray').y = origin.y + length * Math.sin(angle);
  stage.get('ray').angle = rotation;
  angle += Math.PI / 180;
  rotation += Math.PI / 360;
  stage.clear().draw();
}