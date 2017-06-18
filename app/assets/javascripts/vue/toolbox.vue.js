Vue.component('toolbox', {
  props: ['game', 'selectedComponentID'],
  template: `
  <div class="toolbox">

    <toolbox-panel v-if="selectedComponentID !== null" :title="'Editing Item <mark>' + selectedComponentID + '</mark>'">
      <form class="item-attrs">
        <label for="position-x-selection"> Position X </label>
        <input type="number" v-bind:value="game.components[selectedComponentID].posX" min="0" id="position-x-selection"
                             v-on:input="componentPropertyChanged(selectedComponentID, 'posX', $event.target.value)" />

        <label for="position-y-selection"> Position Y </label>
        <input type="number" v-bind:value="game.components[selectedComponentID].posY" min="0" id="position-y-selection"
                             v-on:input="componentPropertyChanged(selectedComponentID, 'posY', $event.target.value)" />

       <input type="checkbox" v-bind:checked="game.components[selectedComponentID].locked" id="position-y-locked"
                            v-on:click="componentPropertyChanged(selectedComponentID, 'locked', $event.target.checked)" />
       <label for="position-y-locked">Locked </label>
     </form>
    </toolbox-panel>

    <toolbox-panel :title="'Toolbox'">
      <template slot="header">
        <div class="field" v-bind:class="{'no-component-glow': Object.entries(game.manifest.componentClasses).length === 0}" id="image_upload">
          <i class="material-icons">file_upload</i>
          <input type="file" multiple="multiple" name="image" id="image" />
        </div>
      </template>
      <ul>
        <li class="component" v-for="(componentClass, classID) in game.manifest.componentClasses">
          <div class="toolbox-item" v-on:click="classClicked(classID)">
            <img v-bind:src="'/user_upload/game_images/' + componentClass.imageID + '.png'">
          </div>
        </li>
        <li class="no-component-text" v-if="Object.entries(game.manifest.componentClasses).length === 0">
          Upload new images with the button above
        </li>
      </ul>
    </toolbox-panel>

  </div>`,
  methods: {
    classClicked: function (classID) {
      this.$emit('classClicked', classID);
    },
    componentPropertyChanged: function (id, property, value) {
      this.$emit('componentPropertyChanged', id, property, value);
    }
  }
});

Vue.component('toolbox-panel', {
  props: ['title'],
  template: `
  <section class="panel">
    <header>
      <h2 v-html="title"></h2>
      <slot name="header">
      </slot>
    </header>
    <slot>
      <p>Panel contents</p>
    </slot>
  </section>`
});
