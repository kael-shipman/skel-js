if (typeof Skel == 'undefined') Skel = {}

Skel.Stripe = {
  loadForms : function(config) {
    config = Skel.Utils.merge({
      selectors : {
        form : '.stripe-form',
        submitButton : '[type="submit"]',
        key : 'input[name="stripe-public-key"]',
        token : 'input[name="stripe-token"]',
        cardNumber : '.card-number',
        expDate : '.exp-date',
        cvc : '.cvc',
        zipcode : '.zip'
      },
      errorMsgs : {
        timeout : 'Hm... We seem to be having trouble connecting to Stripe, our payment gateway. Please try again later.'
      },
      functions : {
        addSubmitListener : function(form, conf) {
          console.log('Adding listener');
          form.addEventListener('submit', function(e) { conf.functions.formOnSubmit(e, form, config); });
        },

        toggleLoadingIndicator : function(targState, conf) {
          if (!targState) {
            if (document.body.style.cssText.match(/cursor ?: ?wait/)) targState = false;
            else targState = true;
          }
          if (targState == true) document.body.style.cssText += '; cursor: wait !important;';
          else document.body.style.cssText = document.body.style.cssText.replace(/;? ?cursor: ?wait !important;?/g, '');
        },

        formOnSubmit : function(e, form, conf) {
          // Show loading Icon
          conf.functions.toggleLoadingIndicator(true);
          var submits = document.querySelectorAll(conf.selectors.form + ' ' + conf.selectors.submitButton);
          for(var i = 0; i < submits; i++) submits[i].disabled = true;
          e.preventDefault();
          console.log('Prevented submission');

          var key = form.querySelectorAll(conf.selectors.key);
          if (key.length == 0) throw "Can't find stripe key. Searched at '"+conf.selectors.form+" "+conf.selectors.key+"'";
          key = key[0];

          Stripe.setPublishableKey(key.value);
          console.log('Set key: '+key.value);
          Stripe.card.createToken(form, function (stat, response) { conf.functions.stripeReturnHandler(stat, response, form, conf); });
        },

        stripeReturnHandler : function(stat, response, form, conf) {
          var msg, elmt;
          conf.functions.toggleLoadingIndicator(false);
          
          // Now process the return
          if (response.error) { // Oops! There was an error...
            msg = response.error.message;
            if (msg.indexOf('card number') != -1) elmt = conf.selectors.cardNumber;
            else if (msg.indexOf('security') != -1) elmt = conf.selectors.cvc;
            else if (msg.indexOf('expir') != -1) elmt = conf.selectors.expDate;
            else if (msg.indexOf('zip') != -1) elmt = conf.selectors.zipcode;

            // Could target the specific element that's the problem, but no standard way to do that yet
            alert(response.error.message);
            var submits = form.querySelectorAll(conf.selectors.submitButton);
            for(var i = 0; i < submits; i++) submits[i].disabled = false;
          } else {
            form.querySelectorAll(conf.selectors.token)[0].value = response.id;
            form.submit();
          }
        }
      },
      checkInterval : 50,
      apiTimeoutSeconds : 20,
    }, config || {});

    Skel.Stripe.checkCount = 0;
    Skel.Stripe.checker = setInterval(function() {
      Skel.Stripe.checkCount++;
      if (Skel.Stripe.checkCount > (config.apiTimeoutSeconds*1000 / config.checkInterval)) {
        // If we've tried for more than [timeout] seconds, consider it dead and block the form
        clearInterval(Skel.Stripe.checker);
        alert(config.errorMsgs.timeout);
        var submits = document.querySelectorAll(config.selectors.form + ' ' + config.selectors.submitButton);
        for(var i = 0; i < submits.length; i++) submits[i].disabled = true;
      }

      // If Stripe's not ready yet, just return and try again
      if (!Stripe) return;
      else clearInterval(Skel.Stripe.checker);
    }, 50);

    var forms = document.querySelectorAll(config.selectors.form);
    for (var i = 0; i < forms.length; i++) config.functions.addSubmitListener(forms[i], config);
  }
}

