<template>
  <div>
    <h1>Devices</h1>
    <!-- Form ADD Device -->
    <div class="row">
      <card>
        <h4 class="card-title">Add new device</h4>
        <div class="row">
          <div class="col-4">
            <base-input
              label="Name"
              type="text"
              placeholder="Ex: Home, Office..."
              v-model="newDevice.name"
            />
          </div>
          <div class="col-4">
            <base-input label="ID" type="text" placeholder="Ex: 12312312" v-model="newDevice.dId" />
          </div>
          <div class="col-4">
            <slot name="label"><label>Templete</label></slot>

            <el-select
              v-model="selectedIndexTemplate"
              placeholder="Select Tamplate"
              class="select-primary"
              style="width: 100%"
            >
              <el-option v-for="template,index in templates" :key="index" class="text-dark" :label="template.name" :value="index"/>
             
            </el-select>
          </div>
        </div>

        <div class="row pull-right">
          <div class="col-12">
            <base-button class="mb-3" type="vue" size="lg" @click="createNewDevice()">Add</base-button>
          </div>
        </div>
      </card>
    </div>

    <!-- Form add  -->
    <div class="row">
      <card>
        <div slot="header">
          <h4 class="card-title">Devices list</h4>
        </div>

        <el-table :data="$store.state.devices">
          <el-table-column label="Name" prop="name"></el-table-column>
          <el-table-column label="ID" prop="dId"></el-table-column>
          <el-table-column label="Password" prop="password"></el-table-column>
          <el-table-column
            label="Template"
            prop="templateName"
          ></el-table-column>
          <el-table-column label="Actions">
            <div slot-scope="{ row, $index }">
                <!-- Save indicator -->
                <el-tooltip >
                    <i class="fas fa-database" :class = "{'text-success': row.saverRule.status}"></i>
                </el-tooltip>
                <!-- Saver -->
              <el-tooltip content="Save data">
                <base-switch
                  :value="row.saverRule.status"
                  type="vue"
                  on-text="Save"
                  off-text="Off"
                  @click="updateSaveStatus(row)"
                ></base-switch>
              </el-tooltip>
                <!-- Delete -->
              <el-tooltip
                content="Delete"
                effect="light"
                :open-delay="300"
                placement="top"
              >
                <base-button
                  type="danger"
                  icon
                  size="sm"
                  class="btn-link"
                  @click="deleteDevice(row)"
                >
                  <i class="tim-icons icon-simple-remove"></i>
                </base-button>
              </el-tooltip>
            </div>
          </el-table-column>
        </el-table>
      </card>
      
    </div>

    <div class="row">
        <FormatJson :value="$store.state.devices"></FormatJson>
    </div>
    

  </div>
  
</template>

<script>
import { Table, TableColumn } from "element-ui";
import { Select, Option } from "element-ui";


export default {
  middleware: 'authenticated',
  components: {

    [Table.name]: Table,
    [TableColumn.name]: TableColumn,
    [Option.name]: Option,
    [Select.name]: Select,
  },
  data() {

    return {
     templates : [],
     selectedIndexTemplate:null,
     newDevice : {
        dId:'',
        name:'',
        templateId:'',
        templateName:''
     
     }
    };
  },
  mounted(){
    //this.devices = this.$store.state.devices
    this.$store.dispatch('getDevices')
    this.getTemplate()
  },
  methods: {
    deleteDevice(device) {

       const axiosHeader = {
          headers:{
            token: this.$store.state.auth.token
          }
       }

       this.$axios.delete('/devices?dId='+device.dId,axiosHeader)
        .then(res=>{
           if(res.data.status = "success"){
             console.log("Dispositivo elimindo --> " + res.data.data);
             this.$notify({
                  type:"success",
                  icon:"tim-icons icon-check-2",
                  message: device.name + " deleted"
                })
                this.$store.dispatch('getDevices')
           }
        })
        .catch(e =>{
          console.log("Error geting devices--> "+ e);
          this.$notify({
                  type:"danger",
                  icon:"tim-icons icon-alert-circle-exc",
                  message: "Can't delete " + device.name
                })
        })

      
    },
    createNewDevice(){
      if(!this.newDevice.name || !this.newDevice.dId || this.selectedIndexTemplate==null){
        this.$notify({
                  type:"danger",
                  icon:"tim-icons icon-alert-circle-exc",
                  message: "Can't add: Missing data"
                })
        return
      }
  this.newDevice.templateId = this.templates[this.selectedIndexTemplate]._id
  this.newDevice.templateName = this.templates[this.selectedIndexTemplate].name
        
      const axiosHeader = {
          headers:{
            token: this.$store.state.auth.token
          }
       }  
      const toSend = {
        newDevice : this.newDevice
      }
      this.$axios.post('/devices',toSend,axiosHeader)
        .then(res=>{
           if(res.data.status = "success"){
            this.newDevice.name = '',
            this.newDevice.dId = '',
            this.selectedIndexTemplate=null

             this.$notify({
                  type:"success",
                  icon:"tim-icons icon-check-2",
                  message: "Device Created!"
                })
                setTimeout(() => {
                  this.$store.dispatch('getDevices')
                }, 500);
                
              
           }
        })
        .catch(e =>{
          console.log("Error geting devices--> "+ e);

          if (e.response.data.status == "error" && e.response.data.error.errors.dId.kind=="unique"){
            this.$notify({
                  type:"danger",
                  icon:"tim-icons icon-alert-circle-exc",
                  message: "Id already exist"
                })
          }else{
            this.showNotify("danger","Error")
          }
          
        })

    },

    updateSaveStatus(rule) {
      var ruleCopy = JSON.parse(JSON.stringify(rule.saverRule))

      ruleCopy.status = !ruleCopy.status

      const toSend = {
        rule:ruleCopy
      }

      const axiosHeaders = {
        headers: {
          token: this.$store.state.auth.token
        }
      }

      this.$axios.put("/saver-rule",toSend, axiosHeaders)
      .then((res)=>{
          if(res.data.status == "error"){
              this.$notify({
              type:"danger",
              icon:"tim-icons icon-alert-circle-exc",
              message: "Can't change status!"
            })
            return
          }
          if(res.data.status == "success"){
            this.$store.dispatch("getDevices")
            this.$notify({
              type:"success",
              icon:"tim-icons icon-check-2",
              message: "Status Changed!"
            })
          }
        })
      .catch((e)=>{
          this.$notify({
                type:"danger",
                icon:"tim-icons icon-alert-circle-exc",
                message: "Can't change status! Error--> "+e 
              })
              return
      })
      
    },


    async getTemplate(){
      const axiosHeader = {
          headers:{
            token: this.$store.state.auth.token
          }
       }
       
        try {
          const res = await this.$axios.get('/template',axiosHeader)
          if (res.data.status=="success"){
            console.log(res.data.data);
            this.templates = res.data.data
              
          }

        } catch (error) {
          
          this.$notify({
                  type:"danger",
                  icon:"tim-icons icon-alert-circle-exc",
                  message: "Geting template"
                })
        }

    },
  },
};
</script>