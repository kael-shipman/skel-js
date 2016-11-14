if (typeof Skel == 'undefined') Skel = {};

Skel.Usercom = function(config) {
  if (Skel.Usercom.instance) throw "You can only have one instance of the Usercom class active. Please use Skel.Usercom.instance to get the current instance";
  Skel.Usercom.instance = this;
  this.config = Skel.Utils.merge(this.config, config || {});
}

Skel.Usercom.prototype = Object.create(Object.prototype);
Skel.Usercom.instance = null;

// Default Configuration
Skel.Usercom.prototype.config = {
  logContainerClass : 'usercom',
  logBaseClass : '-log',
  msgContainerClass : 'msg-container',
  closeLinkClass : 'action-close',
  logTypeAttr : 'data-logType',
  logTimeoutSeconds : 8,
  logTemplateVars : {},
  typeSpecificAttrs : {
    'errors' : {
      'heading' : 'Oh no!'
    },
    'messages' : {
      'heading' : 'Messages'
    }
  },
  logTemplate : '<section class="block usercom-container ##type##-log active" data-logType="##type##"><div class="body-frame"><div class="standard-padding msg-container"><h4>##heading##</h4><div class="action-close">x</div>##msg##</div></div></section>'
}

Skel.Usercom.prototype.scrapeExisting = function() {
  var logs, classes, i, j, type;
  var logContainers = document.getElementsByClassName(this.config.logContainerClass);
  for(i = 0; i < logContainers.length; i++) {
    logs = logContainers[i].children;
    for(j = 0; j < logs.length; j++) {
      type = this.getLogType(logs[j]);
      this.loadCloseLinks(logs[j]);
      this.setLogTimeout(logs[j].getAttribute(this.config.logTypeAttr), (new Date()).getTime() + (this.config.logTimeoutSeconds*1000));
    }
  }
}

Skel.Usercom.prototype.elementMessageHandler = null;

Skel.Usercom.prototype.alert = function(type, msg, elmtSelector, isHtml) {
  if (elmtSelector && this.elementMessageHandler) this.elementMessageHandler(type, msg, elmtSelector, isHtml);
  else {
    var i, j, selector, logHTML, log, templateVars, logContainer, div;
    var usercom = this;

    // Prepare message
    if (!isHtml) msg = '<p>'+msg+'</p>';

    // If log is already showing, add messages to it
    selector = '.' + type + this.config.logBaseClass + ' .' + this.config.msgContainerClass;
    log = document.querySelectorAll(selector);
    if (log.length > 0) {
      div = document.createElement('div');
      div.innerHTML = msg;
      msg = div.children[0];
      for(i = 0; i < log.length; i++) log[i].appendChild(msg);

    // If not showing, create it from template
    } else {
      // Set up template and variables from config
      templateVars = this.config.logTemplateVars || {};
      templateVars['##heading##'] = this.config.typeSpecificAttrs[type]['heading'];
      templateVars['##type##'] = type;
      templateVars['##msg##'] = msg;
      logHTML = this.config.logTemplate;

      // Apply vars to template and attach log to page
      for(i in templateVars) logHTML = logHTML.replace(new RegExp(i, 'g'), templateVars[i]);
      logContainer = document.getElementsByClassName(this.config.logContainerClass);
      for(i = 0; i < logContainer.length; i++) {
        logContainer[i].innerHTML += logHTML;
        log = logContainer[i].getElementsByClassName(type+this.config.logBaseClass);
        for(j = 0; j < log.length; j++) this.loadCloseLinks(log[j]);
      }
    }

    // Reset the timeout for this log
    this.setLogTimeout(type, (new Date()).getTime() + (this.config.logTimeoutSeconds*1000));
  }
}

Skel.Usercom.prototype.loadCloseLinks = function(container) {
  var closeLinks, j, type, containerClass;
  type = this.getLogType(container);
  containerClass = type+this.config.logBaseClass;

  closeLinks = container.getElementsByClassName(this.config.closeLinkClass);
  for (j = 0; j < closeLinks.length; j++) {
    closeLinks[j].addEventListener('click', function(e) { usercom.destroyLog(type, true); });
  }
}

Skel.Usercom.prototype.getLogType = function(container) {
  var type = container.getAttribute(this.config.logTypeAttr);
  if (!type || type == '') throw "Attribute '"+this.config.logTypeAttr+"' must be set on log container! ('Log container' is the element with class '[type]"+this.config.logBaseClass+"')";
  return type;
}

Skel.Usercom.prototype.setLogTimeout = function(type, timeout) {
  var usercom = this;
  if (typeof this.timeouts == 'undefined') this.timeouts = {};
  this.timeouts[type] = timeout;

  if (typeof this.timer == 'undefined' || !this.timer) {
    this.timer = setInterval(function() {
      var living = false;
      var now = (new Date()).getTime();
      for (var x in usercom.timeouts) {
        if (!usercom.timeouts[x]) continue;
        if (usercom.timeouts[x] < now) usercom.destroyLog(x);
        else living = true;
      }
      if (!living) {
        clearInterval(usercom.timer);
        usercom.timer = null;
      }
    }, 200);
  }
}


Skel.Usercom.prototype.destroyLog = function(type, immediate) {
  this.timeouts[type] = null;
  var logs = document.getElementsByClassName(type + this.config.logBaseClass);
  for(var i = 0; i < logs.length; i++) {
    if (immediate) {
      logs[i].parentNode.removeChild(logs[i]);
    } else {
      Skel.Utils.transitionDisplay(logs[i], {
        fadeOutDelay : 2500,
        onFadeOut : (function(elmt) { return function() {
          elmt.parentNode.removeChild(elmt);
        }})(logs[i])
      });
    }
  }
}


