
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

// Setup app data variables and objects

var startTime = (new Date()).getTime();
var currentTime = startTime;

var settings = {
	bounds: 0.1     // % of window width and height to tolerate out of bounds checks
};

var controller = {
	dragging: false,
	currentEntity: false,
	x: false,
	y: false,
	currentSize: $(".size.active").data().size
};

var entities = [];

// Setup RaF cross-browser shim

window.requestAnimFrame = (function(callback) {
	return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
	function(callback) {
		window.setTimeout(callback, 1000 / 60);
	};
})();

// Aliased event functions 

// Mouse/Touch Down
var mdown = function(e) {

	e.preventDefault();
	e.stopPropagation();

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

// Mouse/Touch Move
var mmove = function(e) {

	e.preventDefault();
	e.stopPropagation();

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

// Mouse/Touch Up
var mup = function(e) {

	e.preventDefault();
	e.stopPropagation();

	controller.dragging = false;
	controller.x = false;
	controller.y = false;
	controller.currentEntity = -1;
}

$doc.on('mousedown touchstart', mdown);
$doc.on('mousemove touchmove', mmove);
$doc.on('mouseup touchend touchcancel', mup);

// Click handler for the size selector boxes
$sizes.on('click touchstart', function(e) {
	e.preventDefault();
	e.stopPropagation();

	var $this = $(this);
	$sizes.not(this).removeClass('active');
	$this.addClass('active');
	controller.currentSize = $this.data().size;
});

$(".reset").on('click touchstart', function(e) {
	e.preventDefault();
	e.stopPropagation();

	entities = [];
});

$(".dismiss-intro").on('click touchstart', function(e) {
	e.preventDefault();
	e.stopPropagation();

	$(".intro-wrapper").fadeOut();
});

// Function that is called on every window resize.
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

				// loop through all of the other entities and calculate their effect on this entity
				for(var eI2 in entities) {

					// if this entity is the same as the original entity, or undefined, or is currently
					// still being placed, skip this one
					if(eI2 === eI || eI2 === controller.currentEntity || typeof curE === "undefined" || typeof entities[ eI2 ] === "undefined") continue;

					var curE2 = entities[ eI2 ];
					if(!curE2.status) continue;

					var thisDistance = distance( curE.x, curE.y, curE2.x, curE2.y );
					if( !thisDistance ) continue;

					// force effect = m1 * m2 / distance ^ 2
					var force = (curE.mass * curE2.mass) / Math.pow( thisDistance, 2 );

					// compare the masses to determine the fraction to apply to original object
					force = force * ( curE2.mass / curE.mass ) * timeSince / 2;

					var thisAngle = angle( curE2.x - curE.x, curE2.y - curE.y );

					// if the 2 objects are too close and original is same mass or greater, combine them
					if( thisDistance < 10 && curE.mass >= curE2.mass ) {
						curE.vX = curE.vX - ((curE.vX - curE2.vX) * (curE2.mass / (curE.mass + curE2.mass)));
						curE.vY = curE.vY - ((curE.vY - curE2.vY) * (curE2.mass / (curE.mass + curE2.mass)));
						curE.mass += curE2.mass;
						curE2.status = false;
						continue;
					}

					// ... otherwise, simply apply the effect
					curE.vX = curE.vX + (Math.sin(thisAngle) * force);
					curE.vY = curE.vY + (Math.cos(thisAngle) * force);
				}

				// Actually move entity along
				curE.x = curE.x + (curE.vX * timeSince);
				curE.y = curE.y + (curE.vY * timeSince);

				// Responsive bounds check... remove entities too far off screen
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

			// Draw entity
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

	// Eliminate deleted objects
	for(var eI in entities) {
		if( !entities[ eI ].status ) {
			entities.splice(eI, 1);
		}
	}
	canvasDisplay.width = canvasDisplay.width;
	ctxDisplay.drawImage(canvas, 0, 0);

	requestAnimFrame(redraw);
}

requestAnimFrame(redraw);
