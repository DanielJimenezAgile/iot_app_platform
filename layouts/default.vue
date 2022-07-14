<template>
  <div class="wrapper" :class="{ 'nav-open': $sidebar.showSidebar }">

    <notifications></notifications>

    <side-bar
      :background-color="sidebarBackground"
      short-title="GL"
      title="IoTicos GL"
    >
      <template slot-scope="props" slot="links">

        <sidebar-item
          :link="{
            name: 'Dashboard',
            icon: 'tim-icons icon-chart-pie-36',
            path: '/dashboard'
          }"
        >
        </sidebar-item>

        <sidebar-item
          :link="{
            name: 'Devices',
            icon: 'tim-icons icon-chart-pie-36',
            path: '/devices'
          }"
        >
        </sidebar-item>

        <sidebar-item
          :link="{
            name: 'Alarms',
            icon: 'tim-icons icon-chart-pie-36',
            path: '/alarms'
          }"
        >
        </sidebar-item>

        <sidebar-item
          :link="{
            name: 'Templates',
            icon: 'tim-icons icon-chart-pie-36',
            path: '/templates'
          }"
        >
        </sidebar-item>

        


        
      </template>
    </side-bar>
 

    <div class="main-panel" :data="sidebarBackground">
      <dashboard-navbar></dashboard-navbar>
      <router-view name="header"></router-view>

      <div
        :class="{ content: !isFullScreenRoute }"
        @click="toggleSidebar"
      >

        <zoom-center-transition :duration="200" mode="out-in">
          <!-- your content here -->
          <nuxt></nuxt>
        </zoom-center-transition>
      </div>
      <content-footer v-if="!isFullScreenRoute"></content-footer>
    </div>
  </div>
</template>


<script>
  /* eslint-disable no-new */
  import PerfectScrollbar from 'perfect-scrollbar';
  import 'perfect-scrollbar/css/perfect-scrollbar.css';
  import SidebarShare from '@/components/Layout/SidebarSharePlugin';
  function hasElement(className) {
    return document.getElementsByClassName(className).length > 0;
  }

  function initScrollbar(className) {
    if (hasElement(className)) {
      new PerfectScrollbar(`.${className}`);
    } else {
      // try to init it later in case this component is loaded async
      setTimeout(() => {
        initScrollbar(className);
      }, 100);
    }
  }

  import DashboardNavbar from '@/components/Layout/DashboardNavbar.vue';
  import ContentFooter from '@/components/Layout/ContentFooter.vue';
  import DashboardContent from '@/components/Layout/Content.vue';
  import { SlideYDownTransition, ZoomCenterTransition } from 'vue2-transitions';

  import mqtt from 'mqtt'


  export default {
    components: {
      DashboardNavbar,
      ContentFooter,
      DashboardContent,
      SlideYDownTransition,
      ZoomCenterTransition,
      SidebarShare
    },
    data() {
      return {
        sidebarBackground: 'vue', //vue|blue|orange|green|red|primary
        client: null,
        options : {
          port: process.env.mqtt_port,
          host: process.env.mqtt_host,
          endpoint: "/mqtt",
          clientId: 'web_' +this.$store.state.auth.userData.name + '_' + Math.floor(Math.random() * (10000 - 1)) + 1,
          username: '',
          password: '',
          //keepalive: 60,
          reconnectPeriod: 5000,
          //protocolId: 'MQIsdp',
          //protocolVersion: 3,
          clean: true,
          //encoding: 'utf8' 
        }
      };
    },
    computed: {
      isFullScreenRoute() {
        return this.$route.path === '/maps/full-screen'
      }
    },
    methods: {
      async startMqttClient(){
        await this.getMqttCredentials()
      

        const deviceSubscribeTopic = this.$store.state.auth.userData._id + "/+/+/sdata"
        const notifSubscribeTopic = this.$store.state.auth.userData._id + "/+/+/notif"
        const prefix = String(process.env.mqtt_pefix)
        const connectUrl = prefix + this.options.host+':'+ this.options.port + this.options.endpoint
	console.log("CONNECTING TO ->> "+connectUrl)
        try {
          this.client = mqtt.connect(connectUrl,this.options)
        } catch (error) {
          console.log(error);
        }
        
        

          this.client.on('connect', () => {
            console.log('+++++++++CONNECTED TO MQTT+++++++++++++++')
          
            this.client.subscribe(deviceSubscribeTopic,{qos:0}, (e)=>{
                if (e) {
                  console.log("ERROR SUBSCRIBING DEVICES" );
                  return
                }
                console.log("SUBSCRIBING DEVICES: " +  deviceSubscribeTopic);
            })
            this.client.subscribe(notifSubscribeTopic,{qos:0}, (e)=>{
                if (e) {
                  console.log("ERROR SUBSCRIBING NOTIFS" );
                  return
                }
                console.log("SUBSCRIBING NOTIFS: " + notifSubscribeTopic);
            })

          })

          this.client.on('reconnect', (e)=>{
              console.log('+++++++++RECONNECTING MQTT+++++++++++++++');
              this.getMqttCredentialsReconect()
          })

          this.client.on('error', ()=>{
              console.log('+++++++++ERROR MQTT+++++++++++++++');
          })

           this.client.on('message', (topic,message)=>{
            console.log('+++++++++ MESSAGE MQTT-->'+ message.toString() +'+++++++++++++++');
            try {
              const splittedTopic = topic.split("/")
              const msgType = splittedTopic[3];

              if (msgType == "notif") {
                this.$notify({
                  type:"primary",
                  icon:"tim-icons icon-alert-circle-exc",
                  message: message.toString()
                })
                this.$store.dispatch("getNotifications")  
                return
              }else if(msgType=="sdata"){
                $nuxt.$emit(topic,JSON.parse(message.toString()))
                return
              }

            } catch (error) {
              console.log(error);
            }
            

          })

          $nuxt.$on('mqtt-sender',(toSend)=>{
              this.client.publish(toSend.topic,JSON.stringify(toSend.msg))
              console.log("SENDED:topic-> "+ toSend.topic+" message -> "+JSON.stringify(toSend.msg));
          })

      },
      async getMqttCredentials(){
        try {
          const axiosHeaders = {
            headers:{
              token: this.$store.state.auth.token
            }
          }

          const credentials = await this.$axios.post("getmqttcredentials", null, axiosHeaders)
          if(credentials.data.status == "success")
          {this.options.username = credentials.data.username
          this.options.password = credentials.data.password}

        } catch (error) {
          console.log(error);
          if (error.response.status==401) {
            console.log("No Valid Token");
            localStorage.clear();
            const auth = {}
            this.$store.commit("setAuth", auth)
            window.location.href = "/login"
          }
        }
      },

      async getMqttCredentialsReconect(){
         try {
          const axiosHeaders = {
            headers:{
              token: this.$store.state.auth.token
            }
          }

          const credentials = await this.$axios.post("getmqttcredentials", null, axiosHeaders)
          if(credentials.data.status == "success")
          {this.client.options.username = credentials.data.username
          this.client.options.password = credentials.data.password}

        } catch (error) {
          console.log(error);
        }
      },

      toggleSidebar() {
        if (this.$sidebar.showSidebar) {
          this.$sidebar.displaySidebar(false);
        }
      },
      initScrollbar() {
        let docClasses = document.body.classList;
        let isWindows = navigator.platform.startsWith('Win');
        if (isWindows) {
          // if we are on windows OS we activate the perfectScrollbar function
          initScrollbar('sidebar');
          initScrollbar('main-panel');
          initScrollbar('sidebar-wrapper');

          docClasses.add('perfect-scrollbar-on');
        } else {
          docClasses.add('perfect-scrollbar-off');
        }
      },


    },
    mounted() {

      
      this.initScrollbar();
      setTimeout(() => {
        this.startMqttClient()
      }, 1000);
      
    }
  };
</script>
<style lang="scss">
  $scaleSize: 0.95;
  @keyframes zoomIn95 {
    from {
      opacity: 0;
      transform: scale3d($scaleSize, $scaleSize, $scaleSize);
    }
    to {
      opacity: 1;
    }
  }

  .main-panel .zoomIn {
    animation-name: zoomIn95;
  }

  @keyframes zoomOut95 {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
      transform: scale3d($scaleSize, $scaleSize, $scaleSize);
    }
  }

  .main-panel .zoomOut {
    animation-name: zoomOut95;
  }
</style>
