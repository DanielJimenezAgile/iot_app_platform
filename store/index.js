export const state = ()=>({
    auth: null,
    devices: [],
    selectedDevice: {},
    notifications: []
})

export const mutations = {
    setAuth(state, auth){
        state.auth = auth;
    },
    setDevices(state,devices){
        state.devices=devices
    },
    setSelectedDevice(state,device){
      state.selectedDevice = device
    },
    setNotifications(state, notifications){
        state.notifications = notifications
    }


}

export const actions = {
    readToken(){
        let auth = null
        try {
            auth = JSON.parse(localStorage.getItem('auth'))

        } catch (error) {
            console.log("Error leyendo auth:  " + error);
        }
       this.commit('setAuth',auth)
    },
    getDevices(){
        const axiosHeader = {
          headers:{
            token: this.state.auth.token
          }
        }
  
        this.$axios.get('/devices',axiosHeader)
        .then(res=>{
          //this.devices = res.data.data
          res.data.data.forEach((device, index) => {
            if(device.selected){
              this.commit("setSelectedDevice",device)
              $nuxt.$emit('selectedDeviceIndex', index)
            }
          })
          this.commit('setDevices', res.data.data)
          })
        .catch(e =>{
          console.log("Error geting devices--> "+ e);
        })
      },
      getNotifications(){
        const axiosHeader = {
          headers:{
            token: this.state.auth.token
          }
        }
  
        this.$axios.get('/notifications',axiosHeader)
        .then(res=>{
          
          this.commit('setNotifications', res.data.data)
          })
        .catch(e =>{
          console.log("Error geting Notifications--> "+ e);
        })
      },

}