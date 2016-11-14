if (typeof Skel == 'undefined') Skel = {};

/**
 * SimpleAnimator - a barebones animation framework
 *
 * Derived and adapted from Ilya Kantor's http://javascript.info/tutorial/animation
 * All credit goes to Ilya. All I've done here is roll this into a class with an
 * interface I can count on for other classes.
 */

/**
 * Constructor
 *
 * Establishes instance options and initializes currentAnimations array
 *
 * @param Object options - an optional hash of options to override the defaults
 */
Skel.SimpleAnimator = function(options) {

  var mergeOptions = function(targ, src) {
    if (!(targ instanceof Object) || !(src instanceof Object)) throw "Target and Source must both be plain objects in mergeOptions";
    for (var x in src) {
      if (!targ[x] || !(src[x] instanceof Object)) targ[x] = src[x];
      else mergeOptions(targ[x], src[x]);
    }
    return targ;
  }
    
  this.options = mergeOptions({
    duration : 400,
  }, options || {});
}

Skel.SimpleAnimator.prototype = Object.create(Object.prototype);
Skel.SimpleAnimator.currentAnimations = [];
Skel.SimpleAnimator.frameRate = 80;
Skel.SimpleAnimator.interval = null;

/**
 * animate is the primary function, and is used to start an animation
 *
 * animate marks the start time, then compares the time elapsed each time it is called to
 * the `duration` to get a percentage of time elapsed. It then uses the overridable 
 * `deltaFunction` to determine the value of y given the current time x. Then it passes
 * y (which is a decimal between 0 and 1 determined by the graph function in `deltaFunction`)
 * to the user-passed `drawFrame` function to be translated by the user into values. If
 * `onFinish` is not null, then it is called when x(time) == 1.
 *
 *
 * @param Function drawFrame - a user-defined function that does the work of setting
 *    the values of the various components being animated
 * @param Function onFinish - optional function that fires after the animation completes
 * @param int duration - optional duration of the animation in milliseconds (default is set in
 *    constructor)
 * @api
 */
Skel.SimpleAnimator.prototype.animate = function(drawFrame, onFinish, duration) {
  // First, make sure we're not overloading
  // TODO: Fix this! It doesn't work yet
  for (var j = 0; j < Skel.SimpleAnimator.currentAnimations.length; j++) {
    if (drawFrame == Skel.SimpleAnimator.currentAnimations[j]) return;
  }

  var me = this;
  var start = new Date;
  var currentAnimationDuration = duration || this.options.duration;
  Skel.SimpleAnimator.currentAnimations.push(function() {
    var timeElapsed = new Date - start;
    var timePercentage = timeElapsed / currentAnimationDuration;
    if (timePercentage > 1) timePercentage = 1;

    drawFrame(me.deltaFunction(timePercentage));

    if (timePercentage == 1) {
      if (onFinish) onFinish.call(me);
      return false;
    }
    return true;
  });

  Skel.SimpleAnimator.__startTimer();
}

/**
 * A swappable function that defines the graph of time to values.
 *
 * The default is a cubic ease (@see cubicEase)
 *
 * @param Double timePerc - a number between 0 and 1 indicated the percentage of time elapsed.
 * @api
 */
Skel.SimpleAnimator.prototype.deltaFunction = function(timePerc) {
  return Skel.SimpleAnimator.cubicEase(timePerc);
}

/** The function that starts the timing circuit if it's not already started */
Skel.SimpleAnimator.__startTimer = function() {
  if (Skel.SimpleAnimator.interval != null) return;
  Skel.SimpleAnimator.interval = setInterval(function() {
    var i = 0;
    while (i < Skel.SimpleAnimator.currentAnimations.length) {
      if (!Skel.SimpleAnimator.currentAnimations[i]()) Skel.SimpleAnimator.currentAnimations.splice(i, 1);
      else i++;
    }
    if (i == 0) {
      clearInterval(Skel.SimpleAnimator.interval);
      Skel.SimpleAnimator.interval = null;
    }
  }, Math.round(1000 / Skel.SimpleAnimator.frameRate));
}

/** The function that stops the timing circuit */
Skel.SimpleAnimator.__stopTimer = function() {
  if (Skel.SimpleAnimator.interval == null) return;
  stopInterval(Skel.SimpleAnimator.interval);
  Skel.SimpleAnimator.interval = null;
}

/**
 * Stop all animations
 */
Skel.SimpleAnimator.prototype.stopAll = function() {
  Skel.SimpleAnimator.currentAnimations = [];
}



/**********************************************************
 * Optional Extra Delta functions
 * *******************************************************/

/** A cubic s-curve that gives an ease in and out. */

Skel.SimpleAnimator.cubicEase = function(timePerc) {
  if (timePerc < .5) return 4 * Math.pow(timePerc, 3);
  else return (4 * Math.pow(timePerc-1, 3)) + 1;
}

/** A linear animation */
Skel.SimpleAnimator.linear = function(timePerc) { return timePerc; }

