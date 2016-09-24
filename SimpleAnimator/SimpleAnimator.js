
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
SimpleAnimator = function(options) {

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

SimpleAnimator.prototype = Object.create(Object.prototype);
SimpleAnimator.currentAnimations = [];
SimpleAnimator.frameRate = 80;
SimpleAnimator.interval = null;

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
SimpleAnimator.prototype.animate = function(drawFrame, onFinish, duration) {
  // First, make sure we're not overloading
  // TODO: Fix this! It doesn't work yet
  for (var j = 0; j < SimpleAnimator.currentAnimations.length; j++) {
    if (drawFrame == SimpleAnimator.currentAnimations[j]) return;
  }

  var me = this;
  var start = new Date;
  var currentAnimationDuration = duration || this.options.duration;
  SimpleAnimator.currentAnimations.push(function() {
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

  SimpleAnimator.__startTimer();
}

/**
 * A swappable function that defines the graph of time to values.
 *
 * The default is a cubic ease (@see cubicEase)
 *
 * @param Double timePerc - a number between 0 and 1 indicated the percentage of time elapsed.
 * @api
 */
SimpleAnimator.prototype.deltaFunction = function(timePerc) {
  return SimpleAnimator.cubicEase(timePerc);
}

/** The function that starts the timing circuit if it's not already started */
SimpleAnimator.__startTimer = function() {
  if (SimpleAnimator.interval != null) return;
  SimpleAnimator.interval = setInterval(function() {
    var i = 0;
    while (i < SimpleAnimator.currentAnimations.length) {
      if (!SimpleAnimator.currentAnimations[i]()) SimpleAnimator.currentAnimations.splice(i, 1);
      else i++;
    }
    if (i == 0) {
      clearInterval(SimpleAnimator.interval);
      SimpleAnimator.interval = null;
    }
  }, Math.round(1000 / SimpleAnimator.frameRate));
}

/** The function that stops the timing circuit */
SimpleAnimator.__stopTimer = function() {
  if (SimpleAnimator.interval == null) return;
  stopInterval(SimpleAnimator.interval);
  SimpleAnimator.interval = null;
}

/**
 * Stop all animations
 */
SimpleAnimator.prototype.stopAll = function() {
  SimpleAnimator.currentAnimations = [];
}



/**********************************************************
 * Optional Extra Delta functions
 * *******************************************************/

/** A cubic s-curve that gives an ease in and out. */

SimpleAnimator.cubicEase = function(timePerc) {
  if (timePerc < .5) return 4 * Math.pow(timePerc, 3);
  else return (4 * Math.pow(timePerc-1, 3)) + 1;
}

/** A linear animation */
SimpleAnimator.linear = function(timePerc) { return timePerc; }

