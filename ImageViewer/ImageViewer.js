/** ImageViewer - A composite controller for an image viewing mechanism.
 *
 * ImageViewer is meant to be more of a shell that coordinates a number of
 * composed objects. These objects include one or more Thumbnail managers,
 * one or more Canvas managers.
 *
 * The ImageViewer coordinates actions by observing events dispatched by
 * its components. At a minimum, it registers as a listener on Thumbnail
 * selections (onItemSelectionChange), but can also optionally handle
 * other events.
 *
 * @author Kael Shipman <kael.shipman@gmail.com>
 * @license GPLv3
 * @depends skel-js/SelectionManager skel-js/Observable
 * 
 */

ImageViewer = function() {
  return this;
}

ImageViewer.prototype = {
  constructor : ImageViewer,
  thumbManagers : [],
  canvasManagers : [],
  currentIndex : null,

  /**
   * Implementation of listener for selection changes in cnavas and thumb managers.
   *
   * This is the communication bridge between multiple selection managers (for example,
   * a thumb manager and a canvas manager). When the user makes a selection in one
   * selection manager, that selection should be propagated to the other managers. This
   * is accomplished by ImageViewer, rather than the the selection managers themselves,
   * via this method.
   */

  respondToEvent : function(eventType, src) {
    if (eventType == 'itemSelectionChange' && src instanceof SelectionManager) {
      var index = src.getIndexOf(src.selectedItem);

      // Only notify other observers if the selection has actually changed
      // (This is important to avoid infinite bubbling among children)
      if (index != this.currentIndex) {
        this.currentIndex = index;

        // Synchronizes selection across all managers
        for (var i = 0; i < this.canvasManagers.length; i++) {
          if (this.canvasManagers[i] !== src) this.canvasManagers[i].selectItemByIndex(index);
        }
        for (var i = 0; i < this.thumbManagers.length; i++) {
          if (this.thumbManagers[i] !== src) this.thumbManagers[i].selectItemByIndex(index);
        }
        // Notify any extra listeners
        for (var i = 0; i < this.onItemSelectionChangeListeners.length; i++) this.onItemSelectionChangeListeners[i](src);
      }
    }
  },

  /**
   * Registers a thumbnail manager of type SelectionManager
   *
   * Also registers `this` as an onItemSelectionChange listener
   */

  registerThumbnailManager : function(thumbnailManager) {
    if (!(thumbnailManager instanceof SelectionManager)) throw "Thumbnail manager must be of type SelectionManager or descendent";
    thumbnailManager.addEventListener("itemSelectionChange", this);
    this.thumbManagers.push(thumbnailManager);
  },

  /**
   * Registers a canvas manager of type IVCanvasManager
   *
   * Also registers `this` as an onItemSelectionChange listener
   */

  registerCanvasManager : function(canvasManager) {
    canvasManager.addEventListener("itemSelectionChange", this);
    this.canvasManagers.push(canvasManager);
  }
}


