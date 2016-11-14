if (typeof Skel ==' undefined') Skel = {};

/**
 * SelectionManager - An Item selection manager
 *
 * At a minimum, a SelectionManager should have an outer container with class "items-viewer",
 * an inner container with class "items-container" and items with class "item" within the
 * "items-container" container. It can also have scroll controls with classes "control forward"
 * and "control backward". All class names can be modified by passing an options object into the constructor.
 *
 * It was conceived as a simple thumbnail manager for an image viewer, and therefore was designed to
 * have a scrolling list of thumbnails that you can click on to select. Clicking on an item generates
 * an "itemClick" event, and the subsequent selection of an item (either as a result of clicking or as
 * a result of a programmatic selection) fires an "itemSelectionChange" event. These events notify any
 * external listeners registered using addEventListener(eventName, HTMLElement). External listeners
 * should implement a method called `respondToEvent(eventType, observable)` to receive the event.
 *
 * While it's possible to set an animator object that implements the SkelAnimator interface, you
 * can also just use CSS transitions to achieve animations, as in the example provided. To use a custom
 * Animator, just create an object with an `animate` function like this:
 * 
 *  void animate(deltaFunction);
 *
 * where `deltaFunction` is a function that receives a single paramter `delta` that indicates the percentage
 * of change, according to the graph implemented by the object.
 *
 * @depends skel-js/Observable
 * @author Kael Shipman <kael.shipman@gmail.com>
 * @license GPLv3
 */


/**
 * SelectionManager constructor.
 *
 * Accomplishes several things:
 *  * Inherits properties from Observable
 *  * Establishes options, overriding defaults with passed in `options` object
 *  * Stores `container`, `itemsContainer`, `items`, and initial `controls`
 *  * Loads controls as click listeners on their HTML elements
 *
 *  @param HTMLElement container - the HTML Element that contains all of the components for the
 *  selection manager
 *  @param Object options - an optional `options` object that overrides default options
 *
 *  @constructor
 */
Skel.SelectionManager = function(container, options) {
  // Inherit from Observable
  Observable.call(this);

  if (!(container instanceof HTMLElement)) throw "'container' must be an HTMLElement object!";

  var mergeOptions = function(targ, src) {
    if (!(targ instanceof Object) || !(src instanceof Object)) throw "Target and Source must both be plain objects in mergeOptions";
    for (var x in src) {
      if (!targ[x] || !(src[x] instanceof Object)) targ[x] = src[x];
      else mergeOptions(targ[x], src[x]);
    }
    return targ;
  }
    
  this.options = mergeOptions({
    selectedClass : "selected",
    itemsContainerClass : "items-container",
    controlForwardClass : "control forward",
    controlBackwardClass : "control backward",
    itemClass : "item",
    squelchWarnings : false
  }, options || {});

  this.controls = {
    forward : [],
    backward : []
  };
  this.itemSelectionChangeListeners = [];
  this.itemClickListeners = [];

  this.container = container;
  this.itemsContainer = container.getElementsByClassName(this.options.itemsContainerClass);
  if (this.itemsContainer.length == 0) throw "Couldn't find any element with class `" + this.options.itemsContainerClass + "`! This should be a div that contains the collection of items.";
  else this.itemsContainer = this.itemsContainer[0];

  var forwards = container.getElementsByClassName(this.options.controlForwardClass);
  var backwards = container.getElementsByClassName(this.options.controlBackwardClass);
  this.items = container.getElementsByClassName(this.options.itemClass);

  var i;
  for (i = 0; i < forwards.length; i++) this.registerControl('forward', forwards[i]);
  for (i = 0; i < backwards.length; i++) this.registerControl('backward', backwards[i]);
  for (i = 0; i < this.items.length; i++) this.registerInternalListener('onItemClick', this.items[i]);

  return this;
}

Skel.SelectionManager.prototype = Object.create(Observable.prototype);

Skel.SelectionManager.prototype.previousItem = null,
Skel.SelectionManager.prototype.selectedItem = null,
Skel.SelectionManager.prototype.currentIndex = null,
Skel.SelectionManager.prototype.scrollAnimator = null,

/** Checks to make sure the minimum requirements for functionality are met */
Skel.SelectionManager.prototype.sanityCheck = function() {
  var disp, msg;
  if (getComputedStyle) disp = getComputedStyle(this.itemsContainer).getPropertyValue("display");
  else if (this.itemsContainer.currentStyle) disp = this.itemsContainer.currentStyle.display;
  if (disp == "static") {
    msg = "WARNING: The items container (." + this.options.itemsContainerClass + ") must be an 'offset Parent' in order for the thumbnail selection scroll to work correctly! To be an offset parent, it must have `display` set to anything other than 'static'";
    if (this.options.squelchWarnings) console.log(msg);
    else throw msg;
  }
}

/**
 * Registers a control.
 *
 * This will normally be either "forward" or "backward", but can accommodate other types of controls,
 * too. To use other controls, you must add an "on[Control]Click" method for each nonstandard control.
 *
 * @param String control - an arbitrary name for the control.
 * @param HTMLElement elmt - an element to be registered as a control.
 */
Skel.SelectionManager.prototype.registerControl = function(control, elmt) {
  // Check to see if it's already been added
  if (!this.controls[control]) this.controls[control] = [];
  for (var i = 0; i < this.controls[control].length; i++) {
    if (this.controls[control][i] == elmt) break;
  }

  // If it hasn't been added yet, add it and load it
  if (i == this.controls[control].length) {
    var me = this;
    var eventName = 'on'+control.substr(0,1).toUpperCase()+control.substr(1)+'Click';
    this.controls[control].push(elmt);
    this.registerInternalListener(eventName, elmt);
  }
  return this;
}

/**
 * Registers a low-level click listener on an element that fires a custom Click event.
 *
 * This is used to register click events on HTML elements for controls and items, among
 * possible other things.
 *
 * @param String eventName - the full name of the event (e.g., `onForwardClick` or `onItemClick`)
 * @param HTMLElement elmt - the element to which the click listener will be attached
 *
 * Note that this is different from `addEventListener` (inherited from Observable) in that
 * `addEventListener` allows any object to be an observer for arbitrary events produced by the
 * object, while `registerInternalListener` is used to register specific controls as an observers of
 * HTML Elements' `click` events. (That is, one is used to register controls, while the other
 * is used to register responders.)
 */
Skel.SelectionManager.prototype.registerInternalListener = function(eventName, elmt) {
  var me = this;

  // Check to see if the event is valid
  if (!this[eventName]) throw 'Error: There are no handlers for `' + eventName + '` on this object.';
  elmt.addEventListener("click", function(e) { me[eventName].call(me, e.target); });
  return this;
}

/** Moves the list forward by one */

Skel.SelectionManager.prototype.onForwardClick = function(elmt) {
  this.scroll(1);
}

/** Moves the list backward by one */

Skel.SelectionManager.prototype.onBackwardClick = function(elmt) {
  this.scroll(-1);
}

/** Selects the item being clicked and notifies select observers */

Skel.SelectionManager.prototype.onItemClick = function(elmt) {
  this.selectItem(elmt);
  this.notifyEventListeners("itemClick");
}

/**
 * Scrolls set of items forward or backward, or optionally to `item`
 *
 * @param int dir - direction of scroll (positive for forward, negative for backward)
 * @param HTMLElement item - The item to scroll into the center
 */

Skel.SelectionManager.prototype.scroll = function(dir, item) {
  // Abstract
  throw "`scroll` is an abstract function that must be implemented. (You may want to use `ScrollingSelectionManager` instead.)";
}

/** Selects an image, implicitly deselecting any currently selected images and notifying observers of the change */

Skel.SelectionManager.prototype.selectItem = function(elmt) {
  // Type check
  if (!(elmt instanceof HTMLElement)) throw "selectItem: `elmt` must be an HTMLElement.";

  // If there's a selected image
  if (this.selectedItem) {
    // If it's the same image, just return
    if (this.selectedItem.isSameNode(elmt)) return;

    // Otherwise, deselect whatever image is currently selected
    this.deselectItem(this.selectedItem, true);
  }

  // Add the "selected" class to the element and register it as selected
  elmt.className += ' '+this.options.selectedClass;
  this.selectedItem = elmt;

  this.scroll(null, this.selectedItem);

  // Notify change listeners
  this.notifyEventListeners("itemSelectionChange");
}

/**
 * Deselects an image, notifying observers of the change
 *
 * @param HTMLElement elmt - The element being deselected (presumably an `item`)
 * @param boolean squelchNotification - flag used to prevent superfluous notifications
 */

Skel.SelectionManager.prototype.deselectItem = function(elmt, squelchNotification) {
  // Type check
  if (!(elmt instanceof HTMLElement)) throw "deselectItem: `elmt` must be an HTMLElement.";

  // Force removal of "selected" class
  elmt.className = (' ' + elmt.className + ' ').replace(new RegExp(" " + this.options.selectedClass + " "), "").trim();

  // Only do the rest if it's actually selected
  if (elmt.isSameNode(this.selectedItem)) {
    // Move element from "selected" to "previous" slot
    this.previousItem = this.selectedItem;
    this.selectedItem = null;

    // If we're not squelching the notification, notify observers
    if (!squelchNotification) this.notifyEventListeners(itemSelectionChange);
  }
}

/** Selects item by index */

Skel.SelectionManager.prototype.selectItemByIndex = function(i) {
  if (!this.items[i]) throw "Invalid index passed to `Skel.SelectionManager.selectItemByIndex`: '" + i +"' when there are " + this.items.length + " items in the collection";
  this.selectItem(this.items[i]);
  return this;
}

/** Gets item index */

Skel.SelectionManager.prototype.getIndexOf = function(elmt) {
  if (!elmt) return -1;
  for (var i = this.items.length - 1; i >= 0; i--) {
    if (this.items[i].isSameNode(elmt)) return i;
  }
  return i;
}











/**
 * ScrollingSelectionManager - Manages selections in a scrolling pane
 *
 * This is a derivative of SelectionManager that adds a smooth scrolling action to
 * forward and backward actions.
 */

Skel.ScrollingSelectionManager = function(container, options) {
  Skel.SelectionManager.call(this, container, options);
}

Skel.ScrollingSelectionManager.prototype = Object.create(Skel.SelectionManager.prototype);

Skel.ScrollingSelectionManager.prototype.scroll = function(dir, item) {
  var me = this;

  // Dealing with negative margins, so things are nonintuitive
  // Reverse dir, since "forward" is actually negative
  dir *= -1;
  var min = (this.itemsContainer.scrollWidth - this.container.clientWidth) * -1;
  var max = 0;
  var interval, currentMargin, newMargin;

  // Figure out what the current margin is
  if (getComputedStyle) currentMargin = getComputedStyle(this.itemsContainer).getPropertyValue("margin-left");
  else if (this.itemsContainer.currentStyle) currentMargin = this.itemsContainer.currentStyle.marginLeft;

  // TODO: Fully implement handling of margins set to units other than px

  var pattern = /^(-?[\d.]+)(\D*)$/;
  var matches = pattern.exec(currentMargin);
  if (!matches) throw "currentMargin set to unintelligible amount (" + currentMargin + ")";

  var marginUnit = matches[2];
  currentMargin = matches[1]*1;

  if (item) {
    // If we're scrolling to an item, calculate its position
    if (!(item instanceof HTMLElement)) throw "`item` passed to Skel.SelectionManager.scroll must be an HTML element within the selection manager's collection";
    interval = (item.offsetLeft + (item.scrollWidth/2) + currentMargin - (this.container.clientWidth/2)) * -1;
  } else {
    // Otherwise, just scroll a good chunk
    // Set interval to 3/4 the width of the viewing window
    interval = this.container.clientWidth * .75;
    interval *= dir;
  }

  // Make sure newMargin is within boundaries
  var newMargin = currentMargin + interval;
  if (newMargin > max) newMargin = max;
  else if (newMargin < min) newMargin = min;

  // Shift the container
  if (this.scrollAnimator) this.scrollAnimator.animate(function(delta) {
    if (newMargin == currentMargin) return;
    var totalDistance = newMargin - currentMargin;
    var frameDistance = totalDistance * delta;
    me.itemsContainer.style.marginLeft = (currentMargin*1 + frameDistance*1) + marginUnit;
  });
  else this.itemsContainer.style.marginLeft = newMargin + marginUnit;

  return this;
}













/**
 * FadingSelectionManager - Manages selections in a stack of elements with fading transitions
 */

Skel.FadingSelectionManager = function(container, options) {
  Skel.SelectionManager.call(this, container, options);
}

Skel.FadingSelectionManager.prototype = Object.create(Skel.SelectionManager.prototype);

Skel.FadingSelectionManager.prototype.scroll = function(dir, item) {
  var me = this;
  var i, prevIndex;
  var targ;
  var fadeIn, fadeOut;

  if (!item) {
    if (this.selectedItem) {
      i = this.getIndexOf(this.selectedItem)*1;
      i += dir*1;
      if (i < 0 || i >= this.items.length) return;
      item = this.items[i];
    } else {
      if (this.items.length) item = this.items[0];
      else return;
      i = 0;
    }
  }

  this.selectItem(item);
  prevIndex = this.getIndexOf(this.previousItem);

  fadeIn = this.selectedItem;
  fadeOut = this.previousItem;
  if (this.scrollAnimator) {
    this.scrollAnimator.animate(function(delta) {
      if (fadeIn) fadeIn.style.opacity = Math.abs(0 - delta);
      if (fadeOut) fadeOut.style.opacity = 1 - delta;
    }, null, 500);
  } else {
    fadeOut.style.opacity = 0;
    fadeIn.style.opacity = 1;
  }

  return this;
}

Skel.FadingSelectionManager.prototype.onItemClick = function(elmt) {
  this.notifyEventListeners("itemClick");
}

