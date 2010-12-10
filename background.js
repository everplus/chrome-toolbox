  var fillForm = new FillForm();
  fillForm.createTable();
  var shortcut = new Shortcut();
  shortcut.createTable();
  shortcut.insertRecord(key_util.extension_support_shortcut_map, 0);
  var custom_shortcut_list = [];
  var isCloseWindow = false;
  var wallpaperWindowId = null;
  var plugin = {
    convenience: document.getElementById('plugin_convenience'),
    videoAlone: document.getElementById('plugin_videoAlone'),
    wallpaper: document.getElementById('plugin_wallpaper'),
    browserMute: document.getElementById('plugin_mute'),
    addKeyboardListener: function(input) {
      this.convenience.AddListener(input);
    },
    removeKeyboardListener: function() {
      this.convenience.RemoveListener();
    },
    isOnlyOneTab: function(onlyOneFlag) {
      this.convenience.IsOnlyOneTab(onlyOneFlag);
    },
    setDBClickCloseTab: function(dbClickFlag) {
      this.convenience.SetDBClickCloseTab(dbClickFlag);
    },
    pressBossKey : function() {
      this.convenience.PressBossKey();
    },
    triggerChromeShortcuts: function(virtualKey) {
      this.convenience.TriggerChromeShortcuts(virtualKey)
    },
    updateShortCutList: function(shortcutList) {
      this.convenience.UpdateShortCutList(shortcutList);
    },
    closeChromePrompt: function(flag) {
      this.convenience.CloseChromePrompt(flag);
    },
    showVideoAlone: function(title, orgTitle, parentWindowId, curWindowId,
                              tabId) {
      this.videoAlone.ShowVideoAlone(title, orgTitle, parentWindowId,
          curWindowId, tabId);
    },
    applyWallpaper: function(data, mode) {
      this.wallpaper.ApplyWallPaper(data, mode);
    },
    restoreWallpaper: function() {
      this.wallpaper.RestoreWallPaper();
    },
    setWallpaper: function() {
      this.wallpaper.SetWallPaper();
    },
    muteBrowser: function(muteFlag) {
      this.browserMute.MuteBrowser(muteFlag);
    }


  }
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    switch(request.msg) {
      case 'popupVideoWindow':
        videoAlone.popupWindow(request, sender, request.width, request.height);
        break;
      case 'desktopImage':
        wallpaper.openPreviewWindow(request.imageSrc);
        break;
      case 'getStatus':
        sendResponse({msg: 'status', imageBar: localStorage['imageBar'],
            videoBar: localStorage['videoBar'],
            openInNewTab: localStorage['openInNewTab']});
        break;
      case 'saveForm':
        var formInfo = JSON.stringify(request.formInfo)
        saveOrUpdateForm(request.url, request.title, formInfo);
        break;
      case 'deleteForm':
        fillForm.deleteByUrl(request.url);
        break;
    }
  });

  function setCloseLastOneTabStatus() {
    var isCloseWindow = eval(localStorage['closeLastTab']) && true;
    if (isCloseWindow) {
      chrome.tabs.getAllInWindow(null, function(tabs) {
        if (tabs.length > 1) {
          plugin.isOnlyOneTab(false);
        } else if (tabs.length == 1) {
          plugin.isOnlyOneTab(true);
        }
      });
    } else {
      plugin.isOnlyOneTab(false);
    }
  }

  function beforeLastTabClose() {
    chrome.tabs.getSelected(null, function(tab) {
      if (tab.url != 'chrome://newtab/') {
        chrome.tabs.create({url: 'chrome://newtab/'});
        chrome.tabs.remove(tab.id);
      }
    });
  }

  function closeCurrentTab() {
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.remove(tab.id);
    });
  }

  function dbClickCloseTab() {
    var flag = eval(localStorage['dbclickCloseTab']) && true;
    plugin.setDBClickCloseTab(flag);
  }

  function closeLastTabNotCloseWindow() {
    var closeLastTab = localStorage['closeLastTab'] =
        eval(localStorage['closeLastTab']) && true;
    if (closeLastTab) {
      chrome.tabs.getAllInWindow(null, function(tabs) {
        if (!isCloseWindow && tabs.length == 0) {
          chrome.windows.create({url: 'chrome://newtab/'});
        }
      });
    }
  }

  function updateCloseChromePromptFlag(flag) {
    localStorage['closeChromePrompt'] = flag;
  }

  function executeShortcut(obj) {
    if (obj) {
      switch(obj.operation) {
        case 'bossKey':
          bossKeyExecute();
          break;
        case 'saveForm':
        case 'fillForm':
          fillFormExecute(obj.operation);
          break;
        case 'quickLaunch':
          openBookmarkFolderLinks(obj.relationId);
          break;
        case 'browserMute':
          browserMute();
          break;
        case 'refreshAllTabs':
          refreshAllTabs();
          break;
      }
    }
  }

  function fillFormExecute(operate) {
    chrome.tabs.getSelected(null, function(tab) {
      if (operate == 'saveForm') {
        chrome.tabs.executeScript(null,
          {code: 'sendFormData("' + tab.url + '","' + tab.title + '")'});
      } else if (operate == 'fillForm'){
        fillForm.selectByUrl(tab.url, function(tx, results) {
          if (results.rows.length > 0) {
            var formInfo = results.rows.item(0).formInfo;
            chrome.tabs.executeScript(null,
                {code: 'fillForm(' + formInfo + ')' });
          }
        });
      }
    });
  }

  function bossKeyExecute() {
    plugin.pressBossKey();
  }

  function init() {
    localStorage['imageBar'] = localStorage['imageBar'] || 'true';
    localStorage['openInNewTab'] = localStorage['openInNewTab'] || 'false';
    localStorage['isFirstInstallThisVer'] =
        localStorage['isFirstInstallThisVer'] || 'true';
    if (isWindowsPlatform()) {
      localStorage['closeLastTab'] = localStorage['closeLastTab'] || 'true';
      localStorage['videoBar'] = localStorage['videoBar'] || 'true';
      localStorage['browserMute'] = localStorage['browserMute'] || 'false';
      plugin.muteBrowser(eval(localStorage['browserMute']));
      setBadgeTextByMute();
      localStorage['dbclickCloseTab'] =
          localStorage['dbclickCloseTab'] || 'true';
      localStorage['closeChromePrompt'] =
          localStorage['closeChromePrompt'] || 'true';
      localStorage['quicklyVisitMenu'] =
          localStorage['quicklyVisitMenu'] || '5,15';
      plugin.closeChromePrompt(eval(localStorage['closeChromePrompt']));
      setCloseLastOneTabStatus();
      dbClickCloseTab();
      chrome.tabs.onCreated.addListener(function(tab) {
        setCloseLastOneTabStatus();
      });
      chrome.tabs.onRemoved.addListener(function(tabId) {
        setCloseLastOneTabStatus();
      });
      chrome.windows.onFocusChanged.addListener(function(windowId) {
        setCloseLastOneTabStatus();
      });
    }
  }

  chrome.tabs.onSelectionChanged.addListener(function(tabId) {
    chrome.tabs.sendRequest(tabId, {msg: 'status',
      imageBar: localStorage['imageBar'], videoBar: localStorage['videoBar'],
      openInNewTab: localStorage['openInNewTab']});
  });


  function saveOrUpdateForm(url, title, formInfo) {
    fillForm.selectByUrl(url, function(tx, results) {
      if (results.rows.length > 0) {
        var id = results.rows.item(0).id;
        fillForm.update(formInfo, title, id)
      } else {
        fillForm.insert(url, title, formInfo);
      }
    });
  }

  var wallpaper = {
    orgImage: {data: '', width:0, height: 0},
    compressiveImage: {data: '', width:0, height: 0},

    openPreviewWindow: function(imageSrc) {
      var imageToData = function(image, width, height) {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);
        return canvas.toDataURL('image/png');
      }

      var createWallpaperWindow = function() {
        chrome.windows.create({width: width, height: height,
          url: url, type: 'popup'}, function(window) {
          plugin.setWallpaper();
          wallpaperWindowId = window.id;
        });
      }
      var zoom = 3;
      var offsetWidth = 30;
      var offsetHeight = 100;
      var width = Math.round(window.screen.width / zoom) + offsetWidth;
      var height = Math.round(window.screen.height / zoom) + offsetHeight ;
      var url = chrome.extension.getURL('wallpaper_preview.html');
      var image = new Image();
      image.onload = function() {
        wallpaper.orgImage.data = imageToData(image, image.width, image.height);
        wallpaper.orgImage.width = image.width;
        wallpaper.orgImage.height = image.height;
        wallpaper.compressiveImage.data =  imageToData(image,
            Math.round(image.width / zoom), Math.round(image.height / zoom));
        wallpaper.compressiveImage.width = Math.round(image.width / zoom);
        wallpaper.compressiveImage.height = Math.round(image.height / zoom);
        if (wallpaperWindowId != null) {
          chrome.windows.remove(wallpaperWindowId, function() {
            createWallpaperWindow();
          });
        } else {
          createWallpaperWindow();
        }
      }
      image.src = imageSrc;
    }
  }

  chrome.windows.onRemoved.addListener(function(windowId) {
    if (windowId == wallpaperWindowId) {
      wallpaperWindowId = null;
      console.log('closed:' + wallpaperWindowId);
    }
  });

  var videoAlone = {
    popupWindow: function(request, sender, width, height) {
      var parentWindowId = sender.tab.windowId;
      chrome.windows.create({width: width,
                             height: height + 25,
                             url: '',
                             type: 'normal'}, function(window) {
        chrome.tabs.move(sender.tab.id, {windowId: window.id,
                                         index:1}, function(){
          chrome.tabs.getAllInWindow(window.id, function(tabs) {
            chrome.tabs.remove(tabs[0].id);
            plugin.showVideoAlone(sender.tab.title, request.orgTitle,
                parentWindowId, window.id, sender.tab.id);
            chrome.tabs.sendRequest(sender.tab.id,
                {msg: 'restoreTabTitle', orgTitle: request.orgTitle});
          });
        });
      });
    },

    restore: function(parentWindowId, curWindowId, tabId) {
      var newWindow = null;
      var restoreAllTabs = function(tabs , count) {
        if (tabs[count].id == tabId && ++count >= tabs.length) {
          return;
        }
        chrome.windows.get(parentWindowId, function(window) {
          if (window) {
            chrome.tabs.getAllInWindow(window.id, function(parentTabs){
              chrome.tabs.move(tabs[count].id, {windowId: window.id,
                  index: parentTabs ? parentTabs.length:0 }, function() {
                count++;
                if (tabs.length > count) {
                  restoreAllTabs(tabs, count);
                }
              });
            });
          } else {
            chrome.windows.create({type: 'normal'}, function(window) {
              newWindow = window;
              restoreNoParentWindow(tabs, window.id, count);
            });
          }
        });
      }

      var restoreNoParentWindow = function(tabs, parentWindowId, count) {
        chrome.tabs.move(tabs[count].id, {windowId: parentWindowId, index:0}, function(){
          count++;
          if (tabs.length > count) {
            restoreNoParentWindow(tabs, parentWindowId, count);
          }
        });
      }

      chrome.tabs.getAllInWindow(curWindowId, function(tabs) {
        restoreAllTabs(tabs, 0);
        chrome.tabs.sendRequest(tabId, {msg: 'restoreVideoAlone'}, function(response) {
          if (response && response.msg == 'restoreVideoWindow') {
            chrome.windows.get(parentWindowId, function(window){
              if (window) {
                chrome.tabs.getAllInWindow(window.id, function(curTabs){
                  chrome.tabs.move(tabId, {windowId: window.id,
                      index: curTabs ? curTabs.length:0 }, function() {
                    chrome.tabs.update(tabId, {selected:true});
                  });
                });
              } else {
                // if parent window closed, create a new window
                if (newWindow) {
                  chrome.tabs.move(tabId, {windowId: newWindow.id, index:1}, function(){
                    chrome.tabs.update(tabId, {selected:true});
                    chrome.tabs.getAllInWindow(newWindow.id, function(tabs) {
                      chrome.tabs.remove(tabs[0].id);
                    });
                  });
                } else {
                  chrome.windows.create({type: 'normal'}, function(window) {
                    chrome.tabs.move(tabId, {windowId: window.id, index:1}, function(){
                      chrome.tabs.update(tabId, {selected:true});
                      chrome.tabs.getAllInWindow(window.id, function(tabs) {
                        chrome.tabs.remove(tabs[0].id);
                      });
                    });
                  });
                }
              }
            });
          }
        });
      });
    }
  }

  function browserMute() {
    var muteFlag = eval(localStorage['browserMute']);
    plugin.muteBrowser(!muteFlag);
    localStorage['browserMute'] = !muteFlag;
    setBadgeTextByMute();
  }

  function setBadgeTextByMute() {
    var text = '';
    text = eval(localStorage['browserMute']) ? 'M' : '';
    chrome.browserAction.setBadgeText({text: text});
  }

  function getNPMessage(messageId) {
    var npMessages = [
      {messageId: 1000, message: 'np_message_1000'},

    ];
    var npMessage = {
      1000: 'np_message_1000',
      1001: 'np_message_1001',
      1002: 'np_message_1002',
      1003: 'np_message_1003',
      1004: 'np_message_1004',
      1005: 'np_message_1005',
      1006: 'np_message_1006'
    };
    var message = '';
    if (npMessage[messageId]) {
      message = chrome.i18n.getMessage(npMessage[messageId]);
    }
    return message;
  }

  function redefineBossKey() {
    shortcut.updateShortcut(null, 48);
    chrome.tabs.create({url: 'options.html#bossKey', selected: true});
  }

  function refreshAllTabs() {
    chrome.tabs.getAllInWindow(null, function(tabs) {
      if (tabs) {
        for (var i = 0; i < tabs.length; i++) {
          chrome.tabs.update(tabs[i].id, {url: tabs[i].url});
        }
      }
    });
  }

  init();
