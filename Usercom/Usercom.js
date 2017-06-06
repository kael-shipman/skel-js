if (typeof Skel == 'undefined') Skel = {};

Skel.Usercom = function(config) {
  if (Skel.Usercom.instance) throw "You can only have one instance of the Usercom class active. Please use Skel.Usercom.instance to get the current instance";
  Skel.Usercom.instance = this;
  this.config = Skel.Utils.merge(this.config, config || {});
}

Skel.Usercom.prototype = Object.create(Object.prototype);
Skel.Usercom.prototype.timeouts = {};
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
  logTemplate : '<section class="block usercom-container ##type##-log active" data-logType="##type##"><h4>##heading##</h4><div class="action-close">x</div><div class="standard-padding msg-container">##msg##</div></section>'
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

Skel.Usercom.prototype.getLogContainer = function() {
  var container = document.getElementsByClassName(this.config.logContainerClass);
  if (container.length > 0) return container[0];
  else {
    container = document.createElement('div');
    container.className = this.config.logContainerClass;
    document.body.appendChild(container);
    return container;
  }
}


Skel.Usercom.prototype.alert = function(type, heading, msg, sticky, elmtSelector, isHtml) {
  if (elmtSelector && this.elementMessageHandler) this.elementMessageHandler(type, msg, elmtSelector, isHtml);
  else {
    var i, j, selector, logHTML, log, templateVars, logContainer, div, first;
    var usercom = this;

    // Prepare message
    if (!isHtml) msg = '<p class="msg">'+msg+'</p>';

    // If log is already showing, add messages to it
    selector = '.' + type + this.config.logBaseClass + ' .' + this.config.msgContainerClass;
    log = document.querySelectorAll(selector);
    if (log.length > 0) {
      div = document.createElement('div');
      div.innerHTML = msg;
      msg = div.children[0];
      for(i = 0; i < log.length; i++) log[i].appendChild(msg);
      first = false;

    // If not showing, create it from template
    } else {
      // Set up template and variables from config
      templateVars = this.config.logTemplateVars || {};
      templateVars['##heading##'] = heading;
      templateVars['##type##'] = type;
      templateVars['##msg##'] = msg;
      logHTML = this.config.logTemplate;

      // Apply vars to template and attach log to page
      for(i in templateVars) logHTML = logHTML.replace(new RegExp(i, 'g'), templateVars[i]);

      log = document.createElement('div');
      log.innerHTML = logHTML;
      log = log.children[0];

      logContainer = this.getLogContainer();
      logContainer.appendChild(log);
      this.loadCloseLinks(log);

      first = true;
    }

    // Handle stickiness
    if (sticky) this.timeouts[type] = null;
    else if (first || this.timeouts[type]) this.setLogTimeout(type, (new Date()).getTime() + (this.config.logTimeoutSeconds*1000));
  }
}

Skel.Usercom.prototype.alertFromJson = function(json) {
  var type, elmt, msgs, i, j;
  json = JSON.parse(json);
  for (type in json) {
    msgs = [];
    for(elmt in json[type]['elements']) {
      for(i = 0; i < json[type]['elements'][elmt].length; i++) msgs.push(json[type]['elements'][elmt][i]);
    }
    for(i = 0; i < json[type]['general'].length; i++) msgs.push(json[type]['general'][i]);

    for(i = 0; i < msgs.length; i++) this.alert(type, this.config.typeSpecificAttrs[type].heading, msgs[i].msg, false, msgs[i].elmtSelector, msgs[i].isHtml);
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
  var logContainer = this.getLogContainer();
  var logs = logContainer.getElementsByClassName(type + this.config.logBaseClass);
  for(var i = 0; i < logs.length; i++) {
    if (immediate) {
      logs[i].parentNode.removeChild(logs[i]);
      if (logContainer.children.length == 0) logContainer.parentNode.removeChild(logContainer);
    } else {
      Skel.Utils.transitionDisplay(logs[i], {
        disappearDelay : 2500,
        onDisappear : (function(elmt) { return function() {
          elmt.parentNode.removeChild(elmt);
          if (logContainer.children.length == 0) logContainer.parentNode.removeChild(logContainer);
        }})(logs[i])
      });
    }
  }
}



