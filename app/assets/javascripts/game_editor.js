//= require vue
//= require jquery
//= require dmuploader.min
//= require interact.min
/*global Vue require interact onAnyOfPages */
/* exported editorVue */


$(function() {
  if (!onAnyOfPages({'games': ['new', 'edit']})) return;

  const Shared = require('onboard-shared');
  const Action = Shared.Action;
  const Game = Shared.Game;

  let eventBus = new Vue();

  Vue.component('game-editor', {
    props: ['game'],
    template: `
    <div>
      <div class="middle">
        <game-view :game="game"></game-view>
      </div>
      <div class="right-settings sidebar">
        <toolbox v-bind:componentClasses="game.manifest.componentClasses" v-on:deckCreated="deckCreationHandler" v-on:classClicked="classClickedHandler"></toolbox>
      </div>
    </div>`,
    methods: {
      classClickedHandler: function (id) {
        let compObj = this.game.generateComponent(id, 0, 0);
        this.$set(this.game.components, compObj.id, compObj.component);
      },
      deckCreationHandler: function(backID, cardIDs) {
        console.log("Creating a deck!");
      }
    },
    mounted: function () {
      eventBus.$on('componentResized', (componentID, width, height, dx, dy) => {
        let classID = this.game.components[componentID].classID;
        this.game.resizeComponentClass(classID, width, height);
        let coords = this.game.getCoords(componentID);
        let movement = new Action.Movement(componentID, coords.x + dx, coords.y + dy);
        this.game.applyAction(movement);
      });
      eventBus.$on('componentDeleted', (id) => {
        this.$delete(this.game.components, id);
      });
    }
  });

  var DeckCreationStages = {
    NOT_CREATING: 0,
    CHOOSING_CARDS: 1,
    CHOOSING_BACK: 2
  };

  Vue.component('toolbox', {
    props: ['componentClasses'],
    template: `
    <div class="toolbox">
      <header>
        <h2>Toolbox</h2>
        <div class="field" v-bind:class="{'no-component-glow': Object.entries(componentClasses).length === 0}" id="image_upload">
          <i class="material-icons">file_upload</i>
          <input type="file" multiple="multiple" name="image" id="image" />
        </div>
      </header>
      <ul v-bind:class="{'creating-deck-component-list': deckCreationStage !== DeckCreationStages.NOT_CREATING}">
        <li class="component" v-for="(componentClass, classID) in componentClasses">
          <div class="toolbox-item" v-on:click="classClicked(classID)">
            <img v-bind:src="'/user_upload/game_images/' + componentClass.imageID + '.png'">
          </div>
        </li>
        <li class="no-component-text" v-if="Object.entries(componentClasses).length === 0">
          Upload new images with the button above
        </li>
      </ul>
      <header>
        <h2>Card Decks</h2>
        <div class="field" v-bind:class="{'no-component-glow': Object.entries(componentClasses).length === 0}">
          <i class="material-icons">add</i>
          <button @click="newCardDeck">Add card deck</button>
        </div>
      </header>
      <section v-if="deckCreationStage === DeckCreationStages.CHOOSING_CARDS">
        <ul>
          <li class="component" v-for="classID in newDeckComponentClasses">
            <div class="toolbox-item" v-on:click="deckClassClicked(classID)">
              <img v-bind:src="'/user_upload/game_images/' + componentClasses[classID].imageID + '.png'">
            </div>
          </li>
          <li class="no-component-text" v-if="Object.entries(newDeckComponentClasses).length === 0">
            Click cards above to add to deck. You may upload new ones if necessary.
          </li>
        </ul>
        <div class="button-horizontal-container" v-if="Object.entries(newDeckComponentClasses).length > 0">
          <button @click="acceptDeckCards" class="button button-left-half">Accept</button>
          <button @click="cancelNewDeck" class="button button-left-half">Cancel</button>
        </div>
      </section>
      <section v-if="deckCreationStage === DeckCreationStages.CHOOSING_BACK">
        <ul>
          <li class="component" v-if="newDeckComponentClassBack !== undefined">
            <div class="toolbox-item">
              <img v-bind:src="'/user_upload/game_images/' + componentClasses[newDeckComponentClassBack].imageID + '.png'">
            </div>
          </li>
          <li class="no-component-text" v-if="newDeckComponentClassBack === undefined">
            Now choose an image for the back of your cards. You may upload a one if necessary.
          </li>
        </ul>
        <div class="button-horizontal-container" v-if="newDeckComponentClassBack !== undefined">
          <button @click="acceptDeck" class="button button-left-half">Accept</button>
          <button @click="cancelNewDeck" class="button button-left-half">Cancel</button>
        </div>
      </section>
    </div>`,
    data: function() {
      return {
        DeckCreationStages: DeckCreationStages,
        deckCreationStage: DeckCreationStages.NOT_CREATING,
        newDeckComponentClasses: [],
        newDeckComponentClassBack: undefined
      }
    },
    methods: {
      classClicked: function (classID) {
        switch (this.deckCreationStage) {
          case DeckCreationStages.NOT_CREATING:
            this.$emit('classClicked', classID);
            break;
          case DeckCreationStages.CHOOSING_CARDS:
            this.newDeckComponentClasses.push(classID);
            break;
          case DeckCreationStages.CHOOSING_BACK:
            this.newDeckComponentClassBack = classID;
            break;
        }
      },
      newCardDeck: function() {
        this.deckCreationStage = DeckCreationStages.CHOOSING_CARDS;
      },
      deckClassClicked: function(classID) {
        this.newDeckComponentClasses.splice(this.newDeckComponentClasses.indexOf(classID), 1);
      },
      acceptDeckCards: function() {
        this.deckCreationStage = DeckCreationStages.CHOOSING_BACK;
      },
      acceptDeck: function() {
        this.$emit('deckCreated', this.newDeckComponentClassBack, this.newDeckComponentClasses);
        this.cancelNewDeck();
      },
      cancelNewDeck: function() {
        this.newDeckComponentClassBack = undefined;
        this.newDeckComponentClasses = [];
        this.deckCreationStage = DeckCreationStages.NOT_CREATING;
      }
    }
  });

  let stateStr = document.getElementById('game_state').value;
  let initialState;

  if (!stateStr) {
    initialState = new Game();
  } else {
    initialState = Shared.deserialiseGame(JSON.parse(stateStr));
  }

  let editorVue = new Vue({
    el: '.editor-panel',
    data: {
      game: initialState
    },
    mounted: function () {
      eventBus.$on('newImage', (imageID, width, height) => {
        let classObj = this.game.generateComponentClass('', imageID, width, height);
        this.$set(this.game.manifest.componentClasses, classObj.id, classObj.compClass);
      });
    }
  });

  document.querySelector('input[type=submit]').addEventListener('click', function () {
    document.getElementById('game_state').value = JSON.stringify(editorVue.game);
  });

  $('#image_upload').dmUploader({
    url: '/games/new_image',
    onUploadSuccess: function (id, data) {
      if (data.error !== undefined) {
        // TODO: Inform user in a nicer way
        alert('Upload failed. Please check you are connected to the internet then try again.');
      } else {
        eventBus.$emit('newImage', data.id, data.width, data.height);
      }
    },
    onFallbackMode: function (msg) {
      alert('Upload script cannot be initialised' + msg);
    }
  });

  interact('.recycle-bin').dropzone({
    accept: '.comp-drag',
    overlap: 0.0000000001,
    ondropactivate: function () {
      document.querySelector('.board-area').classList.add('show-bin');
    },
    ondragenter: function (event) {
      event.target.classList.add('hover');
    },
    ondragleave: function (event) {
      event.target.classList.remove('hover');
    },
    ondrop: function (event) {
      // Remove it from the manifest and delete the element
      /* temporary */
      eventBus.$emit('componentDeleted', event.relatedTarget.id);
      event.target.classList.remove('hover');
    },
    ondropdeactivate: function () {
      document.querySelector('.board-area').classList.remove('show-bin');
    }
  });

  $('#cover_image_upload').dmUploader({
    url: '/games/new_image',
    onUploadSuccess: function (id, data) {
      if (data.error !== undefined) {
        console.log('Upload failed!');
      } else {
        console.log('Succefully uploaded cover image; hash: ' + data.id);
        $('#cover_image').attr('src', '/user_upload/game_images/' + data.id + '.png');
        $('#user_image_hash').val(data.id);
      }
    }
  });


  interact('.comp-drag').resizable({
    onmove : function (event) {
      eventBus.$emit('componentResized', event.target.id, event.rect.width, event.rect.height, event.deltaRect.left, event.deltaRect.top);
    },
    edges: { top: true, left: true, bottom: true, right: true },
    // Aspect ratio resize disabled (buggy)
    preserveAspectRatio: false,
    // Flip component when resized past 0x0
    invert: 'reposition',
    // Limit multiple resizes per element
    maxPerElement: 1
  });

});
