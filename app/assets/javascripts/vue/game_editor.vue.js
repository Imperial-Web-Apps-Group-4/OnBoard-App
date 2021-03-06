const Shared = require('onboard-shared');
const Action    = Shared.Action;
const Component = Shared.Component;

let bus = new Vue();

Vue.component('game-editor', {
  props: ['game'],
  template: `
  <div>
    <div class="middle" @drop="dropHandler" @dragover="e => e.dataTransfer.dropEffect = 'copy'">
      <game-view :game="game" v-bind:selectedComponentID="selectedComponentID"
      v-on:componentClicked="componentClickedHandler"></game-view>
    </div>
    <div class="right-settings sidebar">
      <toolbox v-bind:game="game"
               v-bind:selectedComponentID="selectedComponentID"
               v-on:componentPropertyChanged="componentPropertyChangedHandler"
               v-on:classPropertyChanged="classPropertyChangedHandler"
               v-on:classClicked="newComponent"></toolbox>
    </div>
  </div>`,
  methods: {
    newComponent: function (id, posX = 0, posY = 0) {
      let component = Component.fromClass(id, this.game.getClass(id));
      component.posX = posX;
      component.posY = posY;
      let compSpawn = new Action.ComponentSpawn(null, component);
      compSpawn = this.game.applyAction(compSpawn);
      makeReactive(this.game.components, compSpawn.componentID);
    },
    componentClickedHandler: function (componentID) {
      this.selectedComponentID = componentID;
    },
    componentPropertyChangedHandler: function (id, property, value) {
      this.game.components[id][property] = value;
    },
    classPropertyChangedHandler: function (id, property, value) {
      this.game.manifest.componentClasses[id][property] = value;
    },
    dropHandler: function (event) {
      event.preventDefault();
      let classID = event.dataTransfer.getData('text');
      let compClass = this.game.getClass(classID);
      // Fail if text is not a valid class ID
      if (compClass === undefined) {
        console.warn('No component class with ID "' + classID + '" exists in the game. Aborting drop.');
        return;
      }

      let posX = (event.offsetX - compClass.defaultWidth / 2) || 0;
      let posY = (event.offsetY - compClass.defaultHeight / 2) || 0;
      this.newComponent(classID, posX, posY);
    }
  },
  mounted: function () {
    bus.$on('componentResized', (componentID, width, height, dx, dy) => {
      let resize = new Action.Resize(componentID, width, height);
      let coords = this.game.getCoords(componentID);
      let movement = new Action.Movement(componentID, parseInt(coords.x) + parseInt(dx), parseInt(coords.y) + parseInt(dy));
      this.game.applyActions(resize, movement);
    });
    bus.$on('flipAspectRatioLock', () => {
      let components = this.game.components;
      if (this.selectedComponentID !== null) {
        components[this.selectedComponentID].aspectRatioLock
              = !components[this.selectedComponentID].aspectRatioLock;
      } else {
        Object.keys(components).forEach(function(key) {
          components[key].aspectRatioLock
                = !components[key].aspectRatioLock;
        });
      }
    });
  },
  data: function () {
    return {
      selectedComponentID: null
    };
  }
});

$(function() {
  if (!onAnyOfPages({'games': ['new', 'edit']})) return;

  interact('.comp-drag').resizable({
    onstart: function () {
      this.options.resize.preserveAspectRatio = true;
    },
    onmove: function (event) {
      if ($(event.target).hasClass('locked')) return;
      this.options.resize.preserveAspectRatio = $(event.target).hasClass('maintain-aspect');
      bus.$emit('componentResized', event.target.id, event.rect.width, event.rect.height, event.deltaRect.left, event.deltaRect.top);
    },
    onend: function () {
      this.options.resize.preserveAspectRatio = true;
    },
    edges: {top: true, left: true, bottom: true, right: true},
    // Aspect ratio resize
    preserveAspectRatio: true,
    // Flip component when resized past 0x0
    invert: 'reposition',
    // Limit multiple resizes per element
    maxPerElement: 1
  });

  let shiftHeld = false;
  $(document).on('keydown', function (event) {
    if (event.keyCode === 16) { // Shift key
      if (shiftHeld) return;
      bus.$emit('flipAspectRatioLock');
      shiftHeld = true;

    }
  });

  $(document).on('keyup', function (event) {
    if (event.keyCode === 16) { // Shift key
      shiftHeld = false;
      bus.$emit('flipAspectRatioLock');
    }
  });
});
