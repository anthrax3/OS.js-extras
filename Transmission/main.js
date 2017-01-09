/*!
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2016, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */
(function(Application, Window, Utils, API, VFS, GUI) {
  'use strict';

  /////////////////////////////////////////////////////////////////////////////
  // WINDOWS
  /////////////////////////////////////////////////////////////////////////////

  function ApplicationTransmissionWindow(app, metadata, scheme, file) {
    Window.apply(this, ['ApplicationTransmissionWindow', {
      icon: metadata.icon,
      title: metadata.name,
      width: 400,
      height: 200
    }, app, scheme, file]);
    this.currentFile = file ? new VFS.File(file) : null;
  }

  ApplicationTransmissionWindow.prototype = Object.create(Window.prototype);
  ApplicationTransmissionWindow.constructor = Window.prototype;

  ApplicationTransmissionWindow.prototype.init = function(wmRef, app, scheme) {
    var root = Window.prototype.init.apply(this, arguments);
    var self = this;

    // Load and set up scheme (GUI) here
    scheme.render(this, 'TransmissionWindow', root);

    var menuMap = {
      MenuOpen: function() {
        API.createDialog('File', {
          mime: [
            'application/x-bittorrent',
            'application/x-scheme-handler/magnet',
            'application/octet-stream'
          ]
        }, function(ev, button, result) {
          if (button !== 'ok' || !result) {
            self._toggleDisabled(false);
          } else {
            /*
            Object {
              path: "home:///.gitignore",
              filename: ".gitignore",
              type: "file",
              size: 0,
              mime: "application/octet-stream",
              id: null,
              ctime: "2016-04-21T02:38:00.699Z",
              mtime: "2016-04-21T02:38:00.699Z"
            }
            */
            self.currentFile = result;
            self.download(scheme);
          }
        }, self);
      },
      MenuOpenUrl: function() {
        API.createDialog('Input', {
          title: 'Open URL',
          message: 'Open torrent URL',
          placeholder: 'magnet:...'
        }, function(ev, button, result) {
          if (button !== 'ok' || !result) {
            self._toggleDisabled(false);
          } else {
            console.log(ev, button, result);
            self.open(scheme, result);
          }
        }, self);
      },
      MenuNew: function() {

      },
      MenuStartAll: function() {

      },
      MenuPauseAll: function() {

      },
      MenuClose: function() {
        self._close(true);
      }
    };

    function menuEvent(ev) {
      if (menuMap[ev.detail.id]) {
        menuMap[ev.detail.id]();
      }
    }

    scheme.find(this, 'SubmenuFile').on('select', menuEvent);

    // Load given file
    if (this.currentFile) {
      if (!API.openFile(this.currentFile, this)) {
        this.currentFile = null;
      }
    }

    return root;
  };

  ApplicationTransmissionWindow.prototype.download = function(scheme) {
  };

  ApplicationTransmissionWindow.prototype.open = function(scheme, magnet) {
    var container = scheme.find(this, 'TransfersContainer').$element;
    var statusbar = scheme.find(this, 'Statusbar');
    var progress = document.createElement('gui-progress-bar');
    GUI.Elements['gui-progress-bar'].build(progress);
    container.appendChild(progress);

    function updateStatusbar(done, peers, downloads) {
      var status = done ? 'Seed(s):' : 'Peer(s):';
      var txt = Utils.format('{0} {1}, Download(s): {2}', status, peers, downloads);
      statusbar.set('value', txt);
    }
    /*
    var $progressBar = document.querySelector('#progressBar')
    var $numPeers = document.querySelector('#numPeers')
    var $downloaded = document.querySelector('#downloaded')
    var $total = document.querySelector('#total')
    var $remaining = document.querySelector('#remaining')
    */
    var torrent;
    var client = new WebTorrent();

    // Sintel, a free, Creative Commons movie
    var torrentId = magnet;

    /*
    client.add(torrentId, function (torrent) {
      // Torrents can contain many files. Let's use the first.
      var file = torrent.files[0]
      console.log(file);

      // Display the file by adding it to the DOM.
      // Supports video, audio, image files, and more!
      file.appendTo('body')
    });
    */
    client.on('warning', onWarning);
    client.on('error', onError);

    torrent = client.add(torrentId, onTorrent);

    function onTorrent() {
      console.log('onTorrent');
      //torrent.files[0].appendTo('#videoWrap .video', onError)
      //torrent.on('wire', onWire)
      torrent.on('done', onDone);

      torrent.on('download', onProgress);
      torrent.on('upload', onProgress);
      setInterval(onProgress, 5000);
      onProgress();
    };

    function onWire(wire) {
      console.log('onWire');
      var id = wire.peerId.toString();
      //graph.add({ id: id, ip: wire.remoteAddress || 'Unknown' })
      //graph.connect('You', id)
      wire.once('close', function() {
        //graph.disconnect('You', id)
        //graph.remove(id)
      });
    };

    function onProgress() {
      console.log('onProgress');
      var percent = Math.round(torrent.progress * 100 * 100) / 100
        //$progressBar.style.width = percent + '%'
      console.log(percent + '%');
      (new OSjs.GUI.Element(progress)).set('value', percent);
      //$numPeers.innerHTML = torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers')
      console.log(torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers'));

      //$downloaded.innerHTML = prettyBytes(torrent.downloaded)
      console.log(torrent.downloaded);
      //$total.innerHTML = prettyBytes(torrent.length)
      console.log(torrent.length);

      var remaining;
      if (torrent.done) {
        remaining = 'Done.';
      } else {
        remaining = moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize();
        remaining = remaining[0].toUpperCase() + remaining.substring(1) + ' remaining.';
      }
      //$remaining.innerHTML = remaining
      console.log(remaining);
      updateStatusbar(torrent.done, torrent.numPeers, torrent.files.length);
    };

    function onDone() {
      //$body.className += ' is-seed'
      console.log('onDone');
      onProgress()
    };

    function onError(err) {
      console.log('onError');
      if (err) {
        window.alert(err)
        console.error(err)
      }
    };

    function onWarning(err) {
      console.log('onWarning');
      if (err) {
        console.error(err)
      }
    };
  };

  ApplicationTransmissionWindow.prototype.updateFile = function(file) {
    Window.prototype.updateFile.apply(this, arguments);
  };

  ApplicationTransmissionWindow.prototype.showFile = function(file, content) {
    Window.prototype.showFile.apply(this, arguments);
    API.action('open', file);
  };

  ApplicationTransmissionWindow.prototype.getFileData = function() {
    return this._scheme.find(this, 'Text').get('value');
  };

  ApplicationTransmissionWindow.prototype._close = function(doit) {
    if (!doit) {
      this._minimize();
      return false;
    }
    Window.prototype._close.apply(this, arguments);
  };

  ApplicationTransmissionWindow.prototype.destroy = function() {
    Window.prototype.destroy.apply(this, arguments);

    this.currentFile = null;
  };

  /////////////////////////////////////////////////////////////////////////////
  // APPLICATION
  /////////////////////////////////////////////////////////////////////////////

  function ApplicationTransmission(args, metadata) {
    Application.apply(this, ['ApplicationTransmission', args, metadata, {
      extension: 'mag',
      mime: 'text/plain',
      filetypes: [{
        label: 'BitTorrent',
        mime: 'application/x-bittorrent',
        extension: '.bit'
      }, {
        label: 'Magnet Link',
        mime: 'application/x-scheme-handler/magnet',
        extension: '.mag'
      }, {
        label: 'Torrent',
        mime: 'application/octet-stream',
        extension: '.torrent'
      }]
    }]);
  }

  ApplicationTransmission.prototype = Object.create(Application.prototype);
  ApplicationTransmission.constructor = Application;

  ApplicationTransmission.prototype.destroy = function() {
    return Application.prototype.destroy.apply(this, arguments);
  };

  ApplicationTransmission.prototype.init = function(settings, metadata) {
    Application.prototype.init.apply(this, arguments);

    var self = this;
    this._loadScheme('./scheme.html', function(scheme) {
      self._addWindow(new ApplicationTransmissionWindow(self, metadata, scheme));
    });
  };

  /////////////////////////////////////////////////////////////////////////////
  // EXPORTS
  /////////////////////////////////////////////////////////////////////////////

  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationTransmission = OSjs.Applications.ApplicationTransmission || {};
  OSjs.Applications.ApplicationTransmission.Class = ApplicationTransmission;

})(OSjs.Core.Application, OSjs.Core.Window, OSjs.Utils, OSjs.API, OSjs.VFS, OSjs.GUI);
