<template>
   <div class="row" v-if="$store.state.devices.length > 0" >

      <div v-for="(widget, index) in $store.state.selectedDevice.template.widgets" :class="[widget.column]" :key="widget.variable" >
        
        <Rtnumberchart
          v-if="widget.widget == 'numberchart'"
          :config="fixWidget(widget)"
        ></Rtnumberchart>

        <Iotswitch
          v-if="widget.widget == 'switch'"
          :config="fixWidget(widget)"
        ></Iotswitch>

        <Iotbutton
          v-if="widget.widget == 'button'"
          :config="fixWidget(widget)"
        ></Iotbutton>

        <Iotindicator
          v-if="widget.widget == 'indicator'"
          :config="fixWidget(widget)"
        ></Iotindicator>
      </div>
    </div>
</template>
<script>

export default {
    middleware: 'authenticated',
    mounted(){
       this.$store.dispatch('getDevices')
    },
    methods:{
        fixWidget(widget){
            var widgetCopy = JSON.parse(JSON.stringify(widget))
            widgetCopy.selectedDevice.dId = this.$store.state.selectedDevice.dId
            widgetCopy.selectedDevice.name = this.$store.state.selectedDevice.name
            widgetCopy.userId = this.$store.state.selectedDevice.userId
            if (widget.widget == "numberchart") {
              widgetCopy.demo = false
            }
            return widgetCopy
        }
    }
}

</script>
