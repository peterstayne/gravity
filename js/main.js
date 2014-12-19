
// Setup cache objects

var $win = $(window);
var $doc = $(document);
var winWidth = $win.width();
var winHeight = $win.height();
var $header = $("header");
var headerHeight = $header.height();
var $sizes = $(".size");
var $footer = $("footer");
var $canvas = $("#maincanvas");
var $canvasDisplay = $("#maincanvasDisplay");
var canvas = document.getElementById('maincanvas');
var canvasDisplay = document.getElementById('maincanvasDisplay');

var PI2 = Math.PI * 2; // for drawing circles

var ctx = canvas.getContext('2d');
var ctxDisplay = canvasDisplay.getContext('2d');

// Setup app data objects

var startTime = (new Date()).getTime();
var currentTime = startTime;

var settings = {
	maxMass: 13,
	speedScale: 0,
	bounds: 0.1
};

var controller = {
	dragging: false,
	currentEntity: false,
	x: false,
	y: false,
	currentSize: $(".size.active").data().size
};

var entities = [];

window.requestAnimFrame = (function(callback) {
	return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
	function(callback) {
		window.setTimeout(callback, 1000 / 60);
	};
})();

var mdown = function(e) {
	e.preventDefault();

	controller.dragging = true;
	controller.currentEntity = entities.length;

	if( typeof e.originalEvent.targetTouches !== "undefined" && typeof e.originalEvent.targetTouches[0] !== "undefined" ) {
		controller.x = e.originalEvent.targetTouches[0].clientX;
		controller.y = e.originalEvent.targetTouches[0].clientY - headerHeight;
	} else {
		controller.x = e.clientX;
		controller.y = e.clientY - 120;
	}

	entities[ controller.currentEntity ] = { 
		x: controller.x, 
		y: controller.y, 
		mass: controller.currentSize, 
		speed: 0,
		vX: 0,
		vY: 0,
		status: true
	};
};

var mmove = function(e) {
	e.preventDefault();

	if( controller.dragging ) {

		if( typeof e.originalEvent.targetTouches !== "undefined" && typeof e.originalEvent.targetTouches[0] !== "undefined" ) {
			controller.x = e.originalEvent.targetTouches[0].clientX;
			controller.y = e.originalEvent.targetTouches[0].clientY - headerHeight;
		} else {
			controller.x = e.clientX;
			controller.y = e.clientY - 120;
		}
		var curE = entities[ controller.currentEntity ];

		if( typeof curE === "undefined" || typeof curE.x === "undefined" ) return true;

		curE.vX = controller.x - curE.x;
		curE.vY = controller.y - curE.y;
	}
};

var mup = function(e) {
	e.preventDefault();

	controller.dragging = false;
	controller.x = false;
	controller.y = false;
	controller.currentEntity = -1;
}

$doc.on('mousedown touchstart', mdown);
$doc.on('mousemove touchmove', mmove);
$doc.on('mouseup touchend touchcancel', mup);


$sizes.on('click touchstart', function(e) {
	e.preventDefault();
	var $this = $(this);
	$sizes.not(this).removeClass('active');
	$this.addClass('active');
	controller.currentSize = $this.data().size;
});

$(".reset").on('click touchstart', function(e) {
	e.preventDefault();
	entities = [];
});

$(".dismiss-intro").on('click touchstart', function(e) {
	e.preventDefault();
	$(".intro-wrapper").fadeOut();
});

function resizeDoc() {
	winWidth = $win.width();
	winHeight = $win.height();
	var newCanvasHeight = winHeight - $header.height() - $footer.height();

	canvas.setAttribute('width', winWidth);
	canvas.setAttribute('height', newCanvasHeight);
	canvasDisplay.setAttribute('width', winWidth);
	canvasDisplay.setAttribute('height', newCanvasHeight);
	$canvas.css({ height: newCanvasHeight });
	$canvasDisplay.css({ height: newCanvasHeight });
	canvas.width = canvasDisplay.width = winWidth;
	canvas.height = canvasDisplay.height = newCanvasHeight;

	settings.speedScale = winWidth / 4;
	$sizes.css({ width: winWidth / 3 - 1});
}

$win.on('load resize', resizeDoc);
resizeDoc();

function distance(x1, y1, x2, y2) {
	return Math.sqrt( Math.pow( x1 - x2, 2 ) + Math.pow( y1 - y2, 2) );
}

function angle(x1, y1, x2, y2) {
	return Math.atan2(x1, y1, x2, y2);
}

function redraw() {

	var time = (new Date()).getTime() - startTime;
	var timeSince = (time - currentTime) * 0.001; // time since last frame
	currentTime = time;
	var eI = entities.length;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	var red, green;

	if( entities.length ) {

		for(var eI in entities) {

			var curE = entities[ eI ];
			if(!curE.status) continue;

			// if user still dragging a line for this one, don't calculate stuff
			if( eI != controller.currentEntity ){

				for(var eI2 in entities) {

					if(eI2 === eI || eI2 === controller.currentEntity || typeof curE === "undefined" || typeof entities[ eI2 ] === "undefined") continue;

					var curE2 = entities[ eI2 ];
					if(!curE2.status) continue;

					var thisDistance = distance( curE.x, curE.y, curE2.x, curE2.y );
					if( !thisDistance ) continue;
					var force = (curE.mass * curE2.mass) / Math.pow( thisDistance, 2 );
					force = force * ( curE2.mass / curE.mass ) * timeSince / 2;
					var thisAngle = angle( curE2.x - curE.x, curE2.y - curE.y );
					if( thisDistance < 5 && curE.mass >= curE2.mass ) {
						curE.vX = curE.vX - ((curE.vX - curE2.vX) * (curE2.mass / (curE.mass + curE2.mass)));
						curE.vY = curE.vY - ((curE.vY - curE2.vY) * (curE2.mass / (curE.mass + curE2.mass)));
						curE.mass += curE2.mass;
						curE2.status = false;
						continue;
					}
					curE.vX = curE.vX + (Math.sin(thisAngle) * force);
					curE.vY = curE.vY + (Math.cos(thisAngle) * force);
				}

				// move entity along
				curE.x = curE.x + (curE.vX * timeSince);
				curE.y = curE.y + (curE.vY * timeSince);

				// responsive bounds check... remove entities too far off screen
				if( 
					curE.x < -(winWidth * settings.bounds ) ||
					curE.x > (winWidth + winWidth * settings.bounds ) ||
					curE.y < -(winHeight * settings.bounds ) ||
					curE.y > (winHeight + winHeight * settings.bounds )
				) {
					curE.status = false;
					continue;
				}
			}

			// draw entity
			red = green = curE.mass / 3;
			if(red > 255) red = 255;
			green = 255 - green;

			ctx.beginPath();
			ctx.arc( curE.x, curE.y, Math.log(curE.mass) * 2, 0, PI2, false )
			ctx.fillStyle = "rgba(" + ~~red + ", " + ~~green + ", 0, 1)";
			ctx.shadowBlur = 14;
			ctx.shadowColor = 'rgba(255, 230, 180, 1)';
			ctx.fill();
		}

		// if user still dragging a line, draw the line
		if(typeof entities[ controller.currentEntity ] !== "undefined" && controller.dragging && controller.x && controller.y) {
			var curE = entities[ controller.currentEntity ];

			ctx.strokeStyle = "#aa00ff";
			ctx.beginPath();
			ctx.moveTo( controller.x, controller.y );
			ctx.lineTo( curE.x, curE.y );
			ctx.stroke();
		}
	}
	for(var eI in entities) {
		if( !entities[ eI ].status ) {
			entities.splice(eI, 1);
		}
	}
	ctxDisplay.clearRect(0,0,canvasDisplay.width,canvasDisplay.height);
	ctxDisplay.drawImage(canvas, 0, 0);

	requestAnimFrame(redraw);
}

requestAnimFrame(redraw);
