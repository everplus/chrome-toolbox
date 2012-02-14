chrome.extension.onRequest.addListener(function(request, sender, response) {
  if (request.msg == 'checkForm') {
    response(checkForm());
  }
});

function checkForm() {
  var forms = document.forms;
  if (forms.length > 0) {
    return {msg: 'existForm'};
  } else {
    return {msg: 'noForm'};
  }
}

function IsCreditCardNumber(text) {
  text = text.replace(/\-|\s/g, '');
  var sum = 0;
  var odd = false;
  if (isNaN(text)) {
    return false;
  }
  if (text.length > 17 || text.length < 13) {
    return false;
  }
  for (var i = text.length -1; i >= 0; i--) {
    var digit = parseInt(text.charAt(i));
    if (odd) {
      digit *= 2;
      sum += parseInt(digit / 10) + digit % 10;
    } else {
      sum += digit;
    }
    odd = !odd;
  }
  return (sum % 10) == 0;
}

var formDataCollection = function() {
  var forms = document.forms;
  var formInfo = [];
  for (var i = 0; i < forms.length; i++) {
    var inputs = forms[i].getElementsByTagName('input');
    for (var j = 0; j < inputs.length; j++) {
      var type = inputs[j].type;
      if (type == 'text' || type == 'checkbox' || type == 'radio') {
        var itemInfo = {id: '', name: '', value: '', type: ''};
        itemInfo.type = type;
        if (type == 'checkbox' || type == 'radio') {
          itemInfo.value = inputs[j].checked;
        } else {
          if (!!inputs[j].value && !IsCreditCardNumber(inputs[j].value)) {
            itemInfo.value = inputs[j].value;
          } else {
            continue;
          }
        }
        itemInfo.id = inputs[j].id || '';
        itemInfo.name = inputs[j].name || '';
        formInfo.push(itemInfo);
      }

    }
    var textareas = forms[i].getElementsByTagName('textarea');
    for (var j = 0; j < textareas.length; j++) {
      var itemInfo = {id: '', name: '', value: '', type: 'textarea'};
      if (textareas[j].value != '' && !textareas.getAttribute('readonly')) {
        itemInfo.value = textareas[j].innerHTML;
        itemInfo.id = textareas[j].id || '';
        itemInfo.name = textareas[j].name || '';
        formInfo.push(itemInfo);
      }
    }

    var selects = forms[i].getElementsByTagName('select')
    for (var j = 0; j < selects.length; j++) {
      var itemInfo = {id: '', name: '', value: '', type: 'select'};
      if (selects[j].value != '') {
        itemInfo.value = selects[j].value;
          itemInfo.id = selects[j].id || '';
          itemInfo.name = selects[j].name || '';
        formInfo.push(itemInfo);
      }
    }
  }
  return formInfo;
}

var fillText = function(id, name, value) {
  if (id) {
    document.getElementById(id).value = value
  } else if(name) {
    document.getElementsByName(name)[0].value = value
  }
}

var fillCheckboxAndRadio = function(id, name, value) {
  if (id) {
    document.getElementById(id).checked = value
  } else if(name) {
    document.getElementsByName(name)[0].checked = value
  }
}

var fillSelect = function(id, name, value) {
  if (id) {
    document.getElementById(id).value = value
  } else if(name) {
    document.getElementsByName(name)[0].value = value
  }
}

var fillTextarea = function(id, name, value) {
  if (id) {
    document.getElementById(id).innerHTML = value
  } else if(name) {
    document.getElementsByName(name)[0].innerHTML = value
  }
}

function sendFormData(escapedUrl, escapedTitle) {
  var formInfo = formDataCollection();
  chrome.extension.sendRequest({msg: 'saveForm',formInfo: formInfo,
     url: unescape(escapedUrl), title: unescape(escapedTitle)});
}

var fillForm = function(formInfo) {
  //var formInfoObj = JSON.parse(formInfo);
  for (var i = 0; i < formInfo.length; i++) {
    var type = formInfo[i].type;
    var id = formInfo[i].id;
    var name = formInfo[i].name;
    var value = formInfo[i].value;
    switch(type) {
      case 'text':
        this.fillText(id, name, value);
        break;
      case 'checkbox':
      case 'radio':
        this.fillCheckboxAndRadio(id, name, value);
        break;
      case 'select':
        this.fillSelect(id, name, value);
        break;
      case 'textarea':
        this.fillTextarea(id, name, value);
        break;
    }
  }
}

