if (typeof Skel == 'undefined') Skel = {};

Skel.Utils = {
  /**
   * Recursively merge two objects and return the result
   */
  merge : function(targ, src) {
    if (!(targ instanceof Object) || !(src instanceof Object)) throw "Target and Source must both be plain objects in mergeOptions";
    for (var x in src) {
      if (!targ[x] || !(src[x] instanceof Object)) targ[x] = src[x];
      else Skel.Utils.merge(targ[x], src[x]);
    }
    return targ;
  },

  /**
   * Use CSS transitions together with "display"
   *
   * Since changing the display property (usually toggling between `none` and `block`)
   * messes up CSS transitions, this function simply controls the display property 
   * outside of the CSS class. For example, you can set a dialog box to fade in and 
   * fade out by setting an opacity transition on is active class. This function, then,
   * will set display=none after the active class is removed, and display=block before it
   * is applied again.
   *
   * Set config.disappearDelay to control how long to wait before setting display=none.
   * (config.appearDelay is really just a technical necessity because for some reason
   * the browser wouldn't honor the transition if the classname were added too close to
   * toggling the display).
   *
   * You can also add an action onFadeIn and onFadeOut
   */
  transitionDisplay : function(elmt, config) {
    config = Skel.Utils.merge({
      activeClass : 'active',
      disappearDelay : 500,
      appearDelay : 20,
      onAppear : null,
      onDisappear : null
    }, config || {});
    classes = elmt.classList;
    if (classes.contains(config.activeClass)) {
      classes.remove(config.activeClass);
      setTimeout(function() { elmt.style.display = ''; if (config.onDisappear) config.onDisappear(); }, config.disappearDelay);
    } else {
      elmt.style.display = 'block';
      setTimeout(function() { classes.add(config.activeClass); if (config.onAppear) config.onAppear(); }, config.appearDelay);
    }
  },

  /**
   * This is just a standard function for unmangling email addresses
   *
   * The user-overridable transFunction takes the mangled email address a the argument and should
   * return the correct email address.
   */
  convertEmailAddresses : function(config) {
    config = Skel.Utils.merge({
      targClass : 'email-address',
      addrAttr : 'data-email',
      subjAttr : 'data-subject',
      transFunction : function(email) { return email.replace('-(AT)-','@').replace('-(DOT)-','.'); }
    }, config || {});

    var emails = document.getElementsByClassName(config.targClass);
    for (var i = 0; i < emails.length; i++) {
      if (emails[i].email_address_processed) return true;
      emails[i].email_address_processed = true;
      var txt = emails[i].innerHTML;
      var addr = emails[i].getAttribute(config.addrAttr);
      var subj = emails[i].getAttribute(config.subjAttr);
      if (!addr) {
        addr = config.transFunction(txt);
        txt = addr;
      } else {
        addr = config.transFunction(addr);
      }
      emails[i].innerHTML = '<a href="mailto:' + addr + '?subject="' + encodeURIComponent(subj) + '">' + txt + '</a>';
    }
  },

  /**
   * Load a menu activator
   *
   * Since all apps now have a mobile menu activator, this is just a convenience function for making that
   * activator toggle the menu.
   *
   * The default behavior is to seek a general container above the menu activator element, then use that to find the
   * specific menuItemsContainer within it, then toggle that using Skel.Utils.transitionDisplay.
   */
  loadMenuActivator : function(config) {
    config = Skel.Utils.merge({
      activatorClass : 'menu-activator',
      menuContainerClass : 'main-menu',
      menuItemsContainerClass : 'menu',
      activeClass : 'active',
      activatorFunction : function(e, cnf) {
        var container = e.target.parentNode;
        while (!container.classList.contains(cnf.menuContainerClass) && container.tagName != 'body') container = container.parentNode;

        var menu = container.getElementsByClassName(cnf.menuItemsContainerClass);
        for(var i = 0; i < menu.length; i++) Skel.Utils.transitionDisplay(menu[i], config);
      }
    }, config || {});

    var controls = document.getElementsByClassName(config.activatorClass);
    for(var i = 0; i < controls.length; i++) controls[i].addEventListener('click', function(e) { config.activatorFunction(e, config); });
  },

  /**
   * Load onpage navigation to scroll smoothly and to the right location
   *
   * This assumes that onpage navigation uses URL hashes that point to
   * anchor elements with matching "name" attributes. For example, the link
   * `<a href="#mySection">My Section</a>` would scroll to `<a name="mySection"></a>`
   */
  loadOnpageNavigation : function(config) {
    config = Skel.Utils.merge({
      linkClass : 'onpage-nav',
      menuToggleFunction : false
    }, config || {});

    var links = document.getElementsByClassName(config.linkClass);
    for(var i = 0; i < links.length; i++) {
      if (links[i].onpageNavLoaded) continue;
      links[i].onpageNavLoaded = true;

      links[i].addEventListener('click', function(e) {
        if (config.menuToggleFunction) config.menuToggleFunction(e);
        var sec, elmt;

        // Scroll to location, if we're on the same page
        var windowPath = window.location.pathname;
        var linkPath = e.target.pathname;
        
        //console.log('Window: '+windowPath+'; Link: '+linkPath);
        if (!e.target.hash || linkPath != windowPath) return true;

        sec = e.target.hash.substring(1);
        elmt = document.getElementsByName(sec);
        if (elmt.length == 0) return;
        else elmt = elmt[0];

        Skel.Utils.scrollToElement(elmt);
        history.replaceState({}, elmt.getAttribute('data-page_title'), '#'+sec);

        e.preventDefault();
      });
    }
  },

  /**
   * Smoothly scrolls to an element on the page
   *
   * @dependency Skel.SimpleAnimator
   */
  scrollToElement : function(elmt) {
    var end = Skel.Utils.elementOffset(elmt).top - 100;
    if (end < 0) end = 0;
    var start = document.documentElement.scrollTop || document.body.scrollTop;
    
    var animator = new Skel.SimpleAnimator();
    animator.animate(function(progress) {
      if (start < end) window.scrollTo(0, start*1 + (end-start)*progress);
      else window.scrollTo(0, start*1 - (start-end)*progress);
    });
  },

  /**
   * Finds the offset of an element on the page
   *
   * Ripped from here: http://stackoverflow.com/a/26230989/2065427
   * @author http://stackoverflow.com/users/962634/basil
   */
  elementOffset : function(elmt) {
    var box = elmt.getBoundingClientRect();

    var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft;

    var clientTop = document.documentElement.clientTop || document.body.clientTop || 0;
    var clientLeft = document.documentElement.clientLeft || document.body.clientLeft || 0;

    var top  = box.top +  scrollTop - clientTop;
    var left = box.left + scrollLeft - clientLeft;

    return { top: Math.round(top), left: Math.round(left) };
  },

  createFullscreenApi : function(elmt) {
    var api = {};
    if (document.fullscreenElement) api.fullscreenElement = document.fullscreenElement;
    else if (document.webkitFullscreenElement) api.fullscreenElement = document.webkitFullscreenElement;
    else if (document.mozFullScreenElement) api.fullscreenElement = document.mozFullScreenElement;
    else if (document.msFullscreenElement) api.fullscreenElement = document.msFullscreenElement;

    if (document.fullscreenEnabled) api.fullscreenEnabled = document.fullscreenEnabled;
    else if (document.webkitFullscreenEnabled) api.fullscreenEnabled = document.webkitFullscreenEnabled;
    else if (document.mozFullScreenEnabled) api.fullscreenEnabled = document.mozFullScreenEnabled;
    else if (document.msFullscreenEnabled) api.fullscreenEnabled = document.msFullscreenEnabled;

    if (document.exitFullscreen) api.exitFullscreen = function() { document.exitFullscreen.call(document) };
    else if (document.webkitExitFullscreen) api.exitFullscreen = function() { document.webkitExitFullscreen.call(document) };
    else if (document.mozExitFullScreen) api.exitFullscreen = function() { document.mozExitFullScreen.call(document) };
    else if (document.msExitFullscreen) api.exitFullscreen = function() { document.msExitFullscreen.call(document) };

    if (elmt.requestFullscreen) api.requestFullscreen = function() { elmt.requestFullscreen.call(elmt) };
    else if (elmt.webkitRequestFullscreen) api.requestFullscreen = function() { elmt.webkitRequestFullscreen.call(elmt) };
    else if (elmt.msRequestFullscreen) api.requestFullscreen = function() { elmt.msRequestFullscreen.call(elmt) };
    else if (elmt.mozRequestFullScreen) api.requestFullscreen = function() { elmt.mozRequestFullScreen.call(elmt) };

    return api;
  }
}

