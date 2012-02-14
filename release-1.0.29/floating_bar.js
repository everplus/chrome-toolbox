
var $ = (function() {
  var pageElement = function(element) {
      this.element = element;
  };
  pageElement.prototype = {
    element: {},
    setStyle : function(param) {
      if (typeof param === 'object') {
        for (var name in param){
          this.element.style[name] = param[name];
        }
      }
      if (typeof param === 'string') {
        this.element.style.cssText = param;
      }
    },

    addEvent: function(type, listener, useCapture) {
      this.element.addEventListener(type, listener, useCapture);
    },

    removeElement: function() {
      this.element.parentNode.removeChild(this.element)
    }
  };

  var getElement = function(element) {
    var newElement = element;
    if (typeof element === 'string') {
      newElement = document.getElementById(element);
    }
    return newElement;
  };

  return function(element){
    var newElement = getElement(element);
    return !!newElement ? (new pageElement(newElement)) : false;
  };
})();

var imageBarStatus = true;
var videoBarStatus = true;
var floatingBarClass;
var floatingBarMenus;
var openInNewTabStatus = true;
var openInBehindStatus = false;
var isWindowsPlatform =
    navigator.userAgent.toLowerCase().indexOf('windows') > -1;
chrome.extension.onRequest.addListener(function(request, sender, response) {
  if (request.msg == 'restoreVideoAlone') {
    response(floatingBar.restoreVideoWindow());
  } else if (request.msg == 'status') {
    imageBarStatus = eval(request.imageBar);
    videoBarStatus = eval(request.videoBar);
    openInBehindStatus = eval(request.openInBehind); 
    openInNewTabStatus = eval(request.openInNewTab);
    initFloatingBarMenu();
  } else if (request.msg == 'restoreTabTitle') {
    document.title = request.orgTitle;
  }
});

chrome.extension.sendRequest({msg: 'getStatus'}, function(response) {
  if (response.msg == 'status') {
    imageBarStatus = eval(response.imageBar);
    videoBarStatus = eval(response.videoBar);
    openInNewTabStatus = eval(response.openInNewTab);
    openInBehindStatus = eval(response.openInBehind);
    initFloatingBarMenu();
    init();
  }
});

function initFloatingBarMenu() {
  floatingBarMenus = [
    {
      menuID: '001',
      menuName: chrome.i18n.getMessage('view_original_image'),
      imageURL: 'images/floating_bar_orl.png',
      status: imageBarStatus,
      operate: 'showOriginalPicture',
      specialCondition: 'checkCurPictureSize',
      isWindowsOnly: false
    }, {
      menuID: '002',
      menuName: chrome.i18n.getMessage('magnifier'),
      imageURL: 'images/floating_bar_zoom.png',
      status: imageBarStatus,
      operate: 'magnifier',
      isWindowsOnly: false
    }, {
      menuID: '003',
      menuName: chrome.i18n.getMessage('set_wallpaper'),
      imageURL: 'images/floating_bar_bg.png',
      status: imageBarStatus,
      isWindowsOnly: true
    }, {
      menuID: '004',
      menuName: chrome.i18n.getMessage('video_standalone'),
      imageURL: 'images/floating_bar_video.png',
      status: videoBarStatus,
      isWindowsOnly: true
    }, {
      menuID: '005',
      menuName: chrome.i18n.getMessage('save_image'),
      imageURL: 'images/floating_bar_save.png',
      status: imageBarStatus,
      isWindowsOnly: true
    }
  ];

  floatingBarClass = {
    IMG : [
      {
        menu: floatingBarMenus[0], operate: 'showOriginalPicture',
        specialCondition: 'checkCurPictureSize'
      }, {
        menu: floatingBarMenus[1], operate: 'magnifier'
      }, {
        menu: floatingBarMenus[2], operate: 'setAsDesktopBackground'
      }, {
        menu: floatingBarMenus[4], operate: 'saveImage'
      }
    ],

    OBJECT : [{menu: floatingBarMenus[3], operate: 'popupVideo'}],
    EMBED : [{menu: floatingBarMenus[3], operate: 'popupVideo'}],
    VIDEO : [{menu: floatingBarMenus[3], operate: 'popupVideo'}]
  }
}

var floatingBar = {
  listeningElements: ['IMG', 'OBJECT', 'EMBED', 'VIDEO'],
  nodeStyles: [],
  curVideoSize: {videoElement: null, height: null, width: null},
  videoAloneFlag: false,
  minWidth: 50,
  minHeight: 50,

  addEvent: function(listener, menuBar) {
    var timer = null;
    var hidden = function() {
     if (timer != null) {
       return;
     }
     timer = window.setTimeout(function() {
        if ($(menuBar.id)) {
          document.body.removeChild($(menuBar.id).element);
        }
      }, 1000);
    };
    var show = function() {
      window.clearTimeout(timer);
      timer = null;
    }
    listener.addEventListener('mouseout', hidden , false)
    menuBar.addEventListener('mouseover', show, false);
    menuBar.addEventListener('mouseout', hidden, false);

  },

  onMouseMove: function(event) {
    var curElement = event.target;
    var curElementName = curElement.tagName;
    if ((curElementName == 'OBJECT' || curElementName == 'EMBED') &&
        curElement.type == 'application/pdf')
      return;
    var checkedElements =
        floatingBar.checkCurrentElement(floatingBarClass, curElementName);

    if (checkedElements && !$('media_floatingBar')) {
      var floatingMenu = document.createElement('div');
      var curElementData = floatingBar.getCurElementData(curElement);
      floatingMenu.id = 'media_floatingBar';
      var floatMenuHeight = 25;
      var floatMenuTop = curElementData.top - floatMenuHeight;
      if (floatMenuTop < 0)
        floatMenuTop = curElementData.bottom;

      var styleProperties = {
        position: 'absolute',
        left: curElementData.left + 'px',
        top: floatMenuTop + 'px'
      };

      $(floatingMenu).setStyle(styleProperties);

      for (var i = 0; i < checkedElements.length; i++) {
        var isWindowsMenu =
            !isWindowsPlatform && checkedElements[i].menu.isWindowsOnly;

        if (!isWindowsMenu && checkedElements[i].menu.status &&
            curElementData.minSizeChecked) {
          var specialConditionReturnValue =  floatingBar.specialCondition(
              checkedElements[i].specialCondition,curElement);
          if (!checkedElements[i].specialCondition ||
              (checkedElements[i].specialCondition &&
              specialConditionReturnValue)) {
            if (curElementName == 'IMG' && magnifier.status) {
              magnifier.openMagnifier(curElement, curElementData);
            }
            var imgElement = floatingBar.createImageMenu(
                checkedElements[i].menu.menuID,
                checkedElements[i].menu.menuName,
                checkedElements[i].menu.imageURL);
            (function(operates) {
              imgElement.onclick = function() {
                floatingBar.operate(operates, curElement,
                    curElementData, floatingMenu);
              }
            })(checkedElements[i].operate);
            floatingMenu.appendChild(imgElement);
          }
        }
      }
      if (!$(floatingMenu.id)) {
        document.body.appendChild(floatingMenu);
        floatingBar.addEvent(curElement, floatingMenu);
      }
    }
  },

  checkCurrentElement: function(listeningElements, curElement) {
    return listeningElements[curElement];
  },

  operate: function(todo, curElement, position, floatingMenu) {
    switch(todo) {
      case 'showOriginalPicture':
        floatingBar.showOriginalPicture(curElement, position, floatingMenu);
        break;
      case 'magnifier': magnifier.openMagnifier(curElement, position);
        break;
      case 'setAsDesktopBackground': floatingBar.sendImageToBg(curElement);
        break;
      case 'popupVideo': floatingBar.popupVideoWindow(curElement, position);
        break;
      case 'saveImage': floatingBar.saveImage(curElement);
        break;
    }
  },

  sendImageToBg: function(element) {
    chrome.extension.sendRequest({msg: 'desktopImage', imageSrc: element.src});
  },

  saveImage: function(element) {
    chrome.extension.sendRequest({msg: 'saveImage', imageSrc: element.src});
  },

  getCurElementData: function(curElement) {
    var curElementData = {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      minSizeChecked: true
    };
    var node = curElement;
    curElementData.width = node.clientWidth;
    curElementData.height = node.clientHeight;
    if (curElementData.width < floatingBar.minWidth ||
        curElementData.height < floatingBar.minHeight) {
      curElementData.minSizeChecked = false;
    }
    
    var range = document.createRange();
    range.setStartBefore(curElement);
    range.setEndAfter(curElement);
    var clientRects = range.getClientRects();
    if (clientRects && clientRects.length == 1) {
      curElementData.top = clientRects[0].top + document.body.scrollTop;
      curElementData.left = clientRects[0].left + document.body.scrollLeft;
      curElementData.bottom = clientRects[0].bottom + document.body.scrollTop;
    }
    return curElementData;
  },

  createImageMenu: function(menuId, menuName, imageURL) {
    var divElement = document.createElement('a');
    divElement.id = menuId;
    divElement.title = menuName;
    var background = 'url(' + chrome.extension.getURL(imageURL) +')';
    $(divElement).setStyle('background-image:' + background);
    return divElement;
  },

  checkCurrentPictureSize: function(curPicture) {
    var curPicture = curPicture;
    if (curPicture) {
      var orlImage = new Image();
      var orlHeight;
      var orlWidth;
      orlImage.src = curPicture.src;
      orlHeight = orlImage.height;
      orlWidth = orlImage.width;
      if (orlHeight == curPicture.clientHeight &&
          orlWidth == curPicture.clientWidth) {
        return false;
      }
      return true;
    }
  },

  specialCondition: function(condition, curElement) {
    var returnValue;
    switch(condition) {
      case 'checkCurPictureSize':
        returnValue = floatingBar.checkCurrentPictureSize(curElement);
        break;
    }
    return returnValue;
  },

  showOriginalPicture: function(curElement, position, floatingMenu) {
    if ($('media_originaPicture')) {
      floatingMenu.removeChild($('media_originaPicture'));
    }
    var imgElement = document.createElement('img');
    imgElement.id = 'media_originaPicture';
    imgElement.src = curElement.src;
    var styleProperties = {clear: 'both',display: 'block',
                           margin: '26px 0 0 0', zIndex: 9999};
    $(imgElement).setStyle(styleProperties);
    floatingMenu.appendChild(imgElement);
  },

  setOtherNodesInvisible: function(element, styles) {
    if (element && element.parentNode != document.documentElement) {
      var nodes = element.parentNode.children;
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].style && nodes[i].style.display != 'none') {
          styles.push({node: nodes[i], display: nodes[i].style.display});
          if (nodes[i] != element) {
            nodes[i].style.display = 'none';
          }
        }
      }
      element = element.parentNode;
      floatingBar.setOtherNodesInvisible(element, styles);
    }
  },

  getComputedStyle: function(element, style) {
    return window.getComputedStyle(element, style)
  },

  popupVideoWindow: function(curElement, position) {
    var curElement = curElement;
    var styles = [];
    var tabTitle;
    styles.push({node: document.body, cssTest: document.body.style.cssText});
    styles.push({node: curElement.parentNode,
                 cssTest: curElement.parentNode.style.cssText});
    var styleProperties = {position: 'fixed',
                           top: 0,
                           left: 0,
                           margin: 0,
                           padding: 0,
                           height: '100%',
                           width: '100%',
                           zIndex: 9999,
                           backgroundColor: '#000000'}
    var objectElement = curElement;
    if (curElement.tagName == 'EMBED' && curElement.parentNode &&
        curElement.parentNode.tagName == 'OBJECT')
      objectElement = curElement.parentNode;                           
    $(objectElement.parentNode).setStyle(styleProperties);
    floatingBar.curVideoSize = {videoElement: curElement,
                                height: curElement.height,
                                width: curElement.width};
    floatingBar.setOtherNodesInvisible(objectElement, styles);

    floatingBar.nodeStyles = styles;
    document.body.height = position.width;
    document.body.width = position.height;
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'hidden';
    tabTitle = document.title;
    document.title += Math.random() * 1000000;
    floatingBar.videoAloneFlag = true;
    window.onresize = function() {
      if (floatingBar.videoAloneFlag) {
        styleProperties = {width: document.documentElement.clientWidth + 'px',
                           height: document.documentElement.clientHeight + 'px'};
        $(curElement).setStyle(styleProperties);
      }
    }
    chrome.extension.sendRequest({msg: 'popupVideoWindow',
                 width:position.width,
                 height: position.height,
                 orgTitle: tabTitle,
                 uniqueTitle: document.title});
  },

  restoreVideoWindow: function() {
    var nodeStyles = floatingBar.nodeStyles;
    var curVideo = floatingBar.curVideoSize.videoElement;
    if (curVideo) {
      curVideo.height = floatingBar.curVideoSize.height;
      curVideo.width = floatingBar.curVideoSize.width;
    }

    for (var i = 0; i < nodeStyles.length; i++) {
      nodeStyles[i].node.style.cssText = nodeStyles[i].cssText;
      nodeStyles[i].node.style.display = nodeStyles[i].display;
    }
    floatingBar.videoAloneFlag = false;
    return {msg: 'restoreVideoWindow'};
  }
};


var magnifier = {
  zoom: 2,
  status: false,
  canvas: document.createElement('canvas'),

  mouseDown: function(magnifierMask) {
    document.body.removeChild(magnifierMask);
    magnifier.status = false;
  },

  mouseUp: function() {

  },

  mouseMove: function(curElement, position) {
    magnifier.setMagnifierPosition(curElement, position);

  },

  setMagnifierPosition: function(curElement, position) {
    if (!curElement) {
      return;
    }
    var position = position;
    var canvas = this.canvas;
    var image = curElement;

    var img = new Image();
    img.src = curElement.src;
    var positionX = event.pageX - position.left;
    var positionY = event.pageY - position.top;
    var centerX = canvas.width/2;
    var centerY = canvas.height/2;
    var ctx = canvas.getContext('2d');
    var canvasPosX = positionX - centerX;
    var canvasPosY = positionY - centerY;
    var zoomX = image.width * this.zoom / img.width;
    var zoomY = image.height * this.zoom / img.height;
    if (canvasPosX < -centerX)
      canvasPosX = -centerX;
    if (canvasPosY < -centerY)
      canvasPosY = -centerY;
    if (canvasPosX > position.width - centerX)
      canvasPosX =  position.width - centerX;
    if (canvasPosY > position.height - centerY)
      canvasPosY =  position.height - centerY;
    canvas.style.left =  canvasPosX + 'px';
    canvas.style.top =  canvasPosY + 'px';
    canvas.addEventListener('mousemove','',true);

    ctx.globalCompositeOperation = 'source-over';
    var canvasStartX = positionX;
    var canvasStartY = positionY;

    ctx.fillRect(-1, -1, canvas.width+1, canvas.height+1);
    ctx.globalCompositeOperation = 'xor';
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerX, 0, Math.PI*2, true);
    ctx.closePath();
    ctx.fill();

    canvasStartX = (canvasStartX * this.zoom  - centerX) / zoomX ;
    canvasStartY = (canvasStartY * this.zoom  - centerY) / zoomY ;

    if(canvasStartX < 0) {
      canvasStartX = 0;
    } else if(canvasStartX > (image.width*this.zoom - centerX) / zoomX -centerX / this.zoom) {
      canvasStartX = (image.width*this.zoom - centerX) / zoomX - centerX / this.zoom;
    }
    if(canvasStartY < 0) {
      canvasStartY = 0;
    } else if(canvasStartY > (image.height * this.zoom - centerY) / zoomY - centerY / this.zoom) {
      canvasStartY = (image.height*this.zoom - centerY) / zoomY - centerY / this.zoom;
    }
    try {
      ctx.drawImage(image, canvasStartX, canvasStartY, canvas.width/zoomX, canvas.height/zoomY, 0, 0, canvas.width , canvas.height);
    } catch (error) {
      console.log('positionX:' + positionX + ' - canvasStartX:' + canvasStartX);
      console.log('error:' + error);
    }


  },

  openMagnifier: function(curElement, position) {
    var positionAndSize = position;
    var magnifierMask = document.createElement('div');
    var canvas = this.canvas;
    canvas.width = 150;
    canvas.height = 150;
    canvas.id = 'media_magnifier';
    magnifierMask.id = 'media_magnifier_mask';
    var styleProperties = {width: positionAndSize.width + 'px',
                           height: positionAndSize.height + 'px',
                           top: positionAndSize.top + 'px',
                           left: positionAndSize.left + 'px'};
    $(magnifierMask).setStyle(styleProperties);
    if ($(magnifierMask.id)) {
      document.body.removeChild($(magnifierMask.id).element);
    }
    magnifierMask.appendChild(canvas);
    document.body.appendChild(magnifierMask);
    magnifier.status = true;
    magnifierMask.addEventListener('mousemove', function() {
      magnifier.mouseMove(curElement, position);
    }, false);
    magnifierMask.addEventListener('mousedown', function() {
      magnifier.mouseDown(magnifierMask);
    }, false);
    magnifier.setMagnifierPosition(curElement, position);
  }
};

function isGoogleLogoutBtn(url) {
  var isLogoutBtn = false;
  var domain = document.domain;
  var googleDomain = /.google.com/;
  if (googleDomain.test(domain) && url.toLowerCase().indexOf('logout') > -1) {
    isLogoutBtn = true;
  }
  return isLogoutBtn;
}

function isGeneralAnchor(anchorElement) {
  var href = anchorElement.href.toLowerCase();
  return href && href.indexOf('javascript:') != 0 && !isGoogleLogoutBtn(href);
}

const MIDDLE_MOUSE_BUTTON = 1;
const RIGHT_MOUSE_BUTTON = 2;
document.addEventListener('click', function(event) {
  if (MIDDLE_MOUSE_BUTTON == event.button ||
      RIGHT_MOUSE_BUTTON == event.button) {
    return;
  }

  if (openInNewTabStatus) {
    var target = event.target;
    while (target.parentNode) {
      if (target.tagName == 'A')
       break;
      target = target.parentNode;
    }

    var tagName = target.tagName;
    if (tagName == 'A' && isGeneralAnchor(target)) {
      chrome.extension.sendRequest({
        msg: 'createNewTab',
        url: target.href,
        selected: !openInBehindStatus
      });
      event.preventDefault();
    }
  }
}, false);

function init() {
  document.addEventListener('mousemove', floatingBar.onMouseMove, false);
}
