//= require vue
//= require config
//= require js.cookie
/* global config */
/* global config NAME USERIDENTIFICATION Cookies */

$(function() {
  if (!onAnyOfPages({'game_sessions': ['edit']})) return;

  const Shared = require('onboard-shared');
  const Message = Shared.Message;
  const Action = Shared.Action;

  /* Create the Vue for the main screen */
  let gameplayVue = new Vue({
    el: '#game-board',
    mounted: function () {
      console.log('Board Vue loaded.');
      this.$on('messageReceived', this.handleMessage.bind(this));
      $('#full-page-loading').fadeOut(500, function() { $('#full-page-loading').remove(); });

      let chatMessages = this.chatMessages;

      if (Cookies.get('helphidden') === 'y') {
        $('.dialog').hide();
        chatMessages.unshift(new Message.ChatMessage('OnBoard', 'To open the help menu, just type /help', true));
      }

      $('.close-dialog').click(function() {
        chatMessages.unshift(new Message.ChatMessage('OnBoard', 'To re-open that help menu, just type /help', true));
        $('.dialog').hide();
        Cookies.set('helphidden', 'y');
      });
    },
    methods: {
      actionAppliedHandler: function (action) {
        socket.send(new Message.GameMessage(action).serialise());
      },
      handleMessage: function (msg) {
        switch (msg.type) {
          case 'game':
            this.applyGameAction(msg.action);
            break;
          case 'chat':
            this.chatMessages.unshift(msg);
            break;
          default:
            console.error('Unrecognised message format. Full message:', msg);
        }
      },
      msgSentHandler: function (msg) {
        if (msg.content === '/help') { $('.dialog').show(); return; }
        socket.send(msg.serialise());
      },
      applyGameAction: function (action) {
        this.game.applyAction(action);
        if (action.type === 'componentSpawn') {
          makeReactive(this.game.components, action.componentID);
        } else if (action.type === 'componentDelete') {
          vueDelete(this.game.components, action.componentID);
        }
      },
      componentRightClicked: function (componentID, component) {
        let action;
        if (!component.owned) {
          action = new Action.TakeOwnership(componentID, USERIDENTIFICATION);
        } else {
          action = new Action.RemoveOwnership(componentID, USERIDENTIFICATION);
        }
        this.game.applyAction(action);
        socket.send((new Message.GameMessage(action)).serialise());
        console.log('Toggling ownership of ' + componentID + ' (' + component.owned + ')');
      }
    },
    data: {
      game: {},
      chatMessages: []
    }
  });

  /* Connect to the game server */
  let gameID = window.location.pathname.match(/games\/(\d+)\//)[1];
  let sessionID = window.location.pathname.match(/\w{26}/)[0];
  let socket = new WebSocket('ws://' + config.gameServer + '/games/' + gameID + '/session/' + sessionID);

  socket.onopen = function () {
    console.log(`Connected to game server. Session ID: ${sessionID}.`);
  };

  // Process handshake message
  socket.onmessage = function (event) {
    let msg = JSON.parse(event.data);
    if (msg.type !== 'init') {
      alert('Game server handshake failed.');
      return;
    }
    if (msg.version !== config.gameServerClientVersion) {
      alert('Game server connection failed (version mismatch).');
      return;
    }

    socket.send(new Message.InitMessage('v3', {'name': NAME}).serialise());
    // Display state from the server in the view
    gameplayVue.game = Shared.deserialiseGame(msg.initialState);
    // Register messages to be forwarded to the board
    this.onmessage = function (event) {
      gameplayVue.$emit('messageReceived', JSON.parse(event.data));
    };
  };
});
