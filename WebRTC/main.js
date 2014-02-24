/*!
 * OS.js - JavaScript Operating System
 *
 * Copyright (c) 2011-2013, Anders Evenrud <andersevenrud@gmail.com>
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
(function(Application, Window, GUI, Dialogs) {

  // https://www.webrtc-experiment.com/meeting/
  // https://github.com/muaz-khan/WebRTC-Experiment/tree/master/video-conferencing
  // TODO: Update room list periodicaly

  /////////////////////////////////////////////////////////////////////////////
  // USER MEDIA WINDOW
  /////////////////////////////////////////////////////////////////////////////

  /**
   * UserMedia Window Constructor
   */
  var UserMediaWindow = function(app, metadata) {
    Window.apply(this, ['UserMediaWindow', {width: 500, height: 300}, app]);

    // Set window properties and other stuff here
    this._title = 'WebRTC - Local Video';
    this._icon  = 'status/user-available.png';

    this.inited = false;
    this.video = null;
    this._properties.allow_close = false;
    this._properties.allow_maximize = false;
  };

  UserMediaWindow.prototype = Object.create(Window.prototype);

  UserMediaWindow.prototype.init = function(wmRef, app) {
    var root = Window.prototype.init.apply(this, arguments);
    var self = this;

    return root;
  };

  UserMediaWindow.prototype.setup = function(video) {
    if ( this.inited ) {
      return;
    }
    this._getRoot().appendChild(video);
    this.video = video;
    this.inited = true;

    this._resize();
  };

  UserMediaWindow.prototype._resize = function(w, h) {
    if ( !Window.prototype._resize.apply(this, arguments) ) return false;

    if ( this.video ) {
      var root = this._getRoot();
      this.video.width = root.offsetWidth;
      this.video.height = root.offsetHeight;
    }

    return true;
  };

  /////////////////////////////////////////////////////////////////////////////
  // CONFERENCE WINDOW
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Conference Window Constructor
   */
  var ConferenceWindow = function(app, metadata, id) {
    Window.apply(this, ['ConferenceWindow_' + id, {width: 500, height: 300}, app]);

    // Set window properties and other stuff here
    this._title = OSjs.Utils.format('WebRTC - Remote Video ({0})', id);
    this._icon  = 'status/user-available.png';
    this._properties.allow_close = false;
    this._properties.allow_maximize = false;

    this.video = null;
  };

  ConferenceWindow.prototype = Object.create(Window.prototype);

  ConferenceWindow.prototype.init = function(wmRef, app) {
    var root = Window.prototype.init.apply(this, arguments);
    root.className += ' ConferenceWindow';
    return root;
  };

  ConferenceWindow.prototype.setup = function(video) {
    this._getRoot().appendChild(video);
    this.video = video;

    this._resize();
  };

  ConferenceWindow.prototype._resize = function(w, h) {
    if ( !Window.prototype._resize.apply(this, arguments) ) return false;

    if ( this.video ) {
      var root = this._getRoot();
      this.video.width = root.offsetWidth;
      this.video.height = root.offsetHeight;
    }

    return true;
  };

  /////////////////////////////////////////////////////////////////////////////
  // MAIN WINDOW
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Main Window Constructor
   */
  var ApplicationWebRTCWindow = function(app, metadata) {
    Window.apply(this, ['ApplicationWebRTCWindow', {width: 500, height: 300}, app]);

    // Set window properties and other stuff here
    this._title = metadata.name + " (WIP)";
    this._icon  = metadata.icon;

    this.menuBar      = null;
    this.listView     = null;
    this.statusBar    = null;
  };

  ApplicationWebRTCWindow.prototype = Object.create(Window.prototype);

  ApplicationWebRTCWindow.prototype.init = function(wmRef, app) {
    var root = Window.prototype.init.apply(this, arguments);
    var self = this;

    // Create window contents (GUI) here
    this.menuBar = this._addGUIElement(new GUI.MenuBar('WebRTCMenuBar'), root);
    this.menuBar.addItem({name: 'file', title: OSjs._("File")}, [
      {title: OSjs._('Close'), onClick: function() {
        self._close();
      }}
    ]);
    this.menuBar.addItem({name: 'create', title: OSjs._("Create Room")});
    this.menuBar.addItem({name: 'leave', title: OSjs._("Leave Room")});

    this.menuBar.onMenuOpen = function(menu, pos, item) {
      if ( typeof item === 'string' ) { return; } // Backward compability
      if ( item.name == 'create' ) {
        self.onCreateSelect();
      } else if ( item.name == 'leave' ) {
        self.onDestroySelect();
      }
    };

    this.listView = this._addGUIElement(new GUI.ListView('WebRTCRoomList'), root);
    this.listView.setColumns([
      {key: 'roomid',       title: OSjs._('Room ID')},
      {key: 'join',         title: '', type: 'button', domProperties: {width: "40"}}
    ]);

    this.listView.render();

    this.statusBar = this._addGUIElement(new GUI.StatusBar('WebRTCStatus'), root);
    this.statusBar.setText();

    return root;
  };

  ApplicationWebRTCWindow.prototype._inited = function() {
    Window.prototype._inited.apply(this, arguments);

    // Window has been successfully created and displayed.
    // You can start communications, handle files etc. here
  };

  ApplicationWebRTCWindow.prototype.destroy = function() {
    // Destroy custom objects etc. here

    Window.prototype.destroy.apply(this, arguments);
  };

  ApplicationWebRTCWindow.prototype.onCreateSelect = function() {
    var self = this;

    if ( this._appRef.isCreatedRoom() ) {
      alert("Cannot create a room, you have already created one!");
      return;
    }
    if ( this._appRef.isJoinedRoom() ) {
      alert("Cannot create a room, you are currently joined in another!");
      return;
    }

    // Input dialog
    this._appRef._createDialog('Input', ["Room name", ("Room_" + (new Date()).getTime()), function(btn, value) {
      self._focus();
      if ( btn !== 'ok' || !value ) return;
      self._appRef.createRoom(value);
    }], this);
  };

  ApplicationWebRTCWindow.prototype.onDestroySelect = function() {
    this._appRef.disconnect();
  };

  ApplicationWebRTCWindow.prototype.updateStatus = function(txt) {
    if ( this.statusBar ) {
      this.statusBar.setText(txt);
    }

    if ( this.menuBar ) {
      if ( this._appRef.isCreatedRoom() || this._appRef.isJoinedRoom() ) {
        this.menuBar.getItem('create').element.setAttribute('disabled', 'disabled');
        this.menuBar.getItem('leave').element.removeAttribute('disabled');
      } else {
        this.menuBar.getItem('leave').element.setAttribute('disabled', 'disabled');
        this.menuBar.getItem('create').element.removeAttribute('disabled');
      }
    }
  };

  ApplicationWebRTCWindow.prototype.updateRooms = function(list, evRef) {
    if ( this.listView ) {
      var rows = [];
      for ( var i = 0; i < list.length; i++ ) {
        rows.push({
          roomid: list[i].roomid,
          join: 'Join',
          customEvent: (function(room) { // For button
            return function() {
              evRef(room);
            };
          })(list[i])
        });
      }

      this.listView.setRows(rows);
      this.listView.render();
    }
  };

  /////////////////////////////////////////////////////////////////////////////
  // APPLICATION
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Application constructor
   */
  var ApplicationWebRTC = function(args, metadata) {
    Application.apply(this, ['ApplicationWebRTC', args, metadata]);

    // You can set application variables here
    this.mainWindow = null;

    this.roomCreated  = false;
    this.roomJoined   = false;
    this.rooms        = [];
    this.users        = [];
    this.meeting      = null;
  };

  ApplicationWebRTC.prototype = Object.create(Application.prototype);

  ApplicationWebRTC.prototype.destroy = function() {
    // Destroy communication, timers, objects etc. here
    if ( this.meeting ) {
      this.disconnect();
      this.meeting = null;
    }

    return Application.prototype.destroy.apply(this, arguments);
  };

  ApplicationWebRTC.prototype.init = function(core, session, metadata) {
    var self = this;

    Application.prototype.init.apply(this, arguments);

    // Create your main window
    this.mainWindow = this._addWindow(new ApplicationWebRTCWindow(this, metadata));

    // Do other stuff here
    // See 'DefaultApplication' sample in 'helpers.js' for more code
    this.meeting = new Meeting();

    this.meeting.onmeeting = function(room) {
      self.onUpdateRooms(room);
    };

    this.meeting.onaddstream = function (e) {
      if (e.type == 'local') {
        self.onAddStreamLocal(e.video);
      }
      if (e.type == 'remote') {
        self.onAddStreamRemote(e.video);
      }
    };

    this.meeting.openSignalingChannel = function(onmessage) {
      var channel = location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');
      var websocket = new WebSocket('ws://wsnodejs.jit.su:80');
      websocket.onopen = function () {
        websocket.push(JSON.stringify({
          open: true,
          channel: channel
        }));
      };
      websocket.push = websocket.send;
      websocket.send = function (data) {
        if(websocket.readyState != 1) {
          return setTimeout(function() {
            websocket.send(data);
          }, 300);
        }

        websocket.push(JSON.stringify({
          data: data,
          channel: channel
        }));
      };
      websocket.onmessage = function(e) {
        onmessage(JSON.parse(e.data));
      };
      return websocket;
    };

    this.meeting.onuserleft = function(userid) {
      self.onUserLeft(userid);
    };

    this.meeting.check();
    this.mainWindow.updateStatus("Create a new room or join from list");
  };

  ApplicationWebRTC.prototype._onMessage = function(obj, msg, args) {
    Application.prototype._onMessage.apply(this, arguments);

    // Make sure we kill our application if main window was closed
    if ( msg == 'destroyWindow' && obj._name === 'ApplicationWebRTCWindow' ) {
      this.mainWindow = null;
      this.destroy();
    }
  };

  //
  // Actions
  //

  ApplicationWebRTC.prototype.joinRoom = function(room) {
    if ( !this.meeting ) {
      alert("Cannot join a room, WebRTC is not initialized");
      return;
    }
    if ( this.roomJoined ) {
      alert("Cannot join a room, you are already in one!");
      return;
    }
    if ( this.roomCreated ) {
      alert("Cannot join a room, you created one!");
      return;
    }

    this.meeting.meet(room);
    this.roomJoined = true;
    this.mainWindow.updateStatus(OSjs.Utils.format("Joined room '{0}'", room.roomid));
  };

  ApplicationWebRTC.prototype.createRoom = function(name) {
    name = name || 'Anonymous';
    console.warn(">>>", "ApplicationWebRTC::createRoom()", name);

    this.meeting.setup(name);
    this.roomCreated = true;

    this.mainWindow.updateStatus(OSjs.Utils.format("Created room '{0}', waiting for users", name));
  };

  ApplicationWebRTC.prototype.disconnect = function() {
    if ( this.roomCreated || this.roomJoined ) {
      console.warn(">>>", "ApplicationWebRTC::disconnect()");
      if ( this.meeting ) {
        this.meeting.leave();
      }
      if ( this.mainWindow ) {
        var win = this.mainWindow._getChild('UserMediaWindow');
        if ( win ) {
          this.mainWindow._removeChild(win);
        }

        this.mainWindow.updateStatus("Create a new room or join from list");
      }
    }
    this.roomCreated = false;
    this.roomJoined = false;
  };

  //
  // Misc
  //

  ApplicationWebRTC.prototype.isJoinedRoom = function() {
    return this.roomJoined;
  };

  ApplicationWebRTC.prototype.isCreatedRoom = function() {
    return this.roomCreated;
  };

  //
  // Events
  //

  ApplicationWebRTC.prototype.onUserLeft = function(id) {
    console.warn(">>>", "ApplicationWebRTC::onUserLeft()", id);

    if ( this.mainWindow ) {
      var win = this.mainWindow._getChild('ConferenceWindow_' + id);
      if ( win ) {
        this.mainWindow._removeChild(win);
      }
    }

    if ( this.roomJoined ) {
      this.roomJoined = false;
    }
  };

  ApplicationWebRTC.prototype.onAddStreamRemote = function(video) {
    console.warn(">>>", "ApplicationWebRTC::onAddStreamRemote()", video);

    if ( this.mainWindow ) {
      var win = new ConferenceWindow(this, null, video.id);
      this.mainWindow._addChild(win, true);
      win.setup(video);
    }
  };

  ApplicationWebRTC.prototype.onAddStreamLocal = function(video) {
    console.warn(">>>", "ApplicationWebRTC::onAddStreamLocal()", video);

    if ( this.mainWindow ) {
      var win = this.mainWindow._getChild('UserMediaWindow');
      if ( !win ) {
        win = new UserMediaWindow(this, null);
        this.mainWindow._addChild(win, true);
        win.setup(video);
      }
    }
  };

  ApplicationWebRTC.prototype.onUpdateRooms = function(room) {

    for ( var i = 0; i < this.rooms.length; i++ ) {
      if ( this.rooms[i].roomid == room.roomid ) {
        return;
      }
    }
    console.warn(">>>", "ApplicationWebRTC::onUpdateRooms()", room);
    this.rooms.push(room);

    if ( this.mainWindow ) {
      var self = this;
      this.mainWindow.updateRooms(this.rooms, function(room) {
        self.joinRoom(room);
      });
    }
  };

  //
  // EXPORTS
  //
  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationWebRTC = ApplicationWebRTC;

})(OSjs.Core.Application, OSjs.Core.Window, OSjs.GUI, OSjs.Dialogs);
