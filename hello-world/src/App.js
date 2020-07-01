import React from 'react';
import './App.css';
const {BN, Long, bytes, units} = require('@zilliqa-js/util');
const {toBech32Address} = require('@zilliqa-js/crypto');
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const { StatusType, MessageType } = require('@zilliqa-js/subscriptions');

export default class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      contractAddress: '',
      setHelloValue: '',
      welcomeMsg:'',
      zilpayConnectStatus:false
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleHelloChange = this.handleHelloChange.bind(this);
    this.setHello = this.setHello.bind(this);
    this.getHello = this.getHello.bind(this);
    this.connectZilpay = this.connectZilpay.bind(this);
    this.checkZilpayConnection = this.checkZilpayConnection.bind(this);
  }

  componentDidMount() {
    this.checkZilpayConnection();
  }


  handleChange(event) {
    this.setState({contractAddress: event.target.value});
  }

  handleSubmit() {
    localStorage.setItem("contract_address", this.state.contractAddress);
  }

  handleHelloChange(event) {
    this.setState({setHelloValue: event.target.value});
  }

  async setHello(){
    if(window.zilPay.wallet.isEnable){
      this.updateWelcomeMsg();
    }
    else{
      const isConnect = await window.zilPay.wallet.connect();
      if (isConnect) {
        console.log("3")
        this.updateWelcomeMsg();
      } else {
      throw new Error('user rejected');
      }
    } 
  }

  async updateWelcomeMsg(){
    const zilliqa = window.zilPay;
    let setHelloValue = this.state.setHelloValue;
    let contractAddress = localStorage.getItem("contract_address");
    const CHAIN_ID = 333;
    const MSG_VERSION = 1;
    const VERSION = bytes.pack(CHAIN_ID, MSG_VERSION);   
    const myGasPrice = units.toQa('1000', units.Units.Li); // Gas Price that will be used by all transactions
    contractAddress = contractAddress.substring(2);
    const ftAddr = toBech32Address(contractAddress);





    try {
        const contract = zilliqa.contracts.at(ftAddr);
        const callTx = await contract.call(
            'setHello',
            [
                {
                    vname: 'msg',
                    type: 'String',
                    value: setHelloValue
                }
            ],
            {
                // amount, gasPrice and gasLimit must be explicitly provided
                version: VERSION,
                amount: new BN(0),
                gasPrice: myGasPrice,
                gasLimit: Long.fromNumber(10000),
            }
        );
  
    } catch (err) {
        console.log(err);
    }
  }

  async getHello(){
    if(window.zilPay.wallet.isEnable){
      this.getWelcomeMsg();
    }
    else{
      const isConnect = await window.zilPay.wallet.connect();
      if (isConnect) {
        this.getWelcomeMsg();
      } else {
      throw new Error('user rejected');
      }
    } 
  }

  async getWelcomeMsg(){
    
    const zilliqa = window.zilPay;
    let contractAddress = localStorage.getItem("contract_address");
    const CHAIN_ID = 333;
    const MSG_VERSION = 1;
    const VERSION = bytes.pack(CHAIN_ID, MSG_VERSION);   
    const myGasPrice = units.toQa('1000', units.Units.Li); // Gas Price that will be used by all transactions
    contractAddress = contractAddress.substring(2);
    const ftAddr = toBech32Address(contractAddress);


    
    try {
        const contract = zilliqa.contracts.at(ftAddr);
        const callTx = await contract.call(
            'getHello',
            [
            ],
            {
                // amount, gasPrice and gasLimit must be explicitly provided
                version: VERSION,
                amount: new BN(0),
                gasPrice: myGasPrice,
                gasLimit: Long.fromNumber(10000),
            }
        );
        console.log(JSON.stringify(callTx.TranID));
        this.eventLogSubscription();

  
    } catch (err) {
        console.log(err);
    }

  }

  async test() {
    const zilliqa = new Zilliqa('https://dev-api.zilliqa.com');
    const subscriber = zilliqa.subscriptionBuilder.buildEventLogSubscriptions(
      'wss://dev-ws.zilliqa.com',
      {
        // smart contract address you want to listen on  
        addresses: [
          '0x2ce491a0fd9e318b39172258101b7c836da7449b',
          '0x167e3980e04eab1e89ff84523ae8c77e008932dc',
        ],
      },
    );
    
    subscriber.emitter.on(StatusType.SUBSCRIBE_EVENT_LOG, (event) => {
      // if subscribe success, it will echo the subscription info
      console.log('get SubscribeEventLog echo: ', event);
    });
    
    subscriber.emitter.on(MessageType.EVENT_LOG, (event) => {
      // do what you want with new event log
      console.log('get new event log: ', JSON.stringify(event));
    });
   
    subscriber.emitter.on(MessageType.UNSUBSCRIBE, (event) => {
      //if unsubscribe success, it will echo the unsubscription info
      console.log('get unsubscribe event: ', event);
    });
  
    await subscriber.start();
  }
  

  async eventLogSubscription() {
    const zilliqa = new Zilliqa('https://dev-api.zilliqa.com');
    const subscriber = zilliqa.subscriptionBuilder.buildEventLogSubscriptions(
      'wss://dev-ws.zilliqa.com',
      {
        // smart contract address you want to listen on  
        addresses: [localStorage.getItem("contract_address")],
      },
    );
    
    subscriber.emitter.on(StatusType.SUBSCRIBE_EVENT_LOG, (event) => {
      // if subscribe success, it will echo the subscription info
      console.log('get SubscribeEventLog echo : ', event);
    });
    
    subscriber.emitter.on(MessageType.EVENT_LOG, (event) => {
      console.log('get new event log: ', JSON.stringify(event));
      // updating the welcome msg when a new event log is received related to getHello() transition
      if(event.hasOwnProperty("value")){
        if(event.value[0].event_logs[0]._eventname =="getHello"){
          let welcomeMsg = event.value[0].event_logs[0].params[0].value;
          this.setState({welcomeMsg: welcomeMsg});
          console.log("welcomeMsg", welcomeMsg);
        }
      }
    });  
    await subscriber.start();
  }

  async connectZilpay(){
    try {
      await window.zilPay.wallet.connect();
      if(window.zilPay.wallet.isConnect){
        this.setState({zilpayConnectStatus:true});
      } else {
      console.warn('ZilPay not installed');
    }
    } catch (error) {}
  }
  async checkZilpayConnection(){
    if (typeof window.zilPay !== 'undefined') {
      if(window.zilPay.wallet.isConnect){
        this.setState({zilpayConnectStatus:true});
      }
      // ZilPay user detected. You can now use the provider.
      if(window.zilPay.wallet.net!="testnet"){
        //Instruct user to change network to testnet
      }
    } 
    else{
      //Instruct the user to download zilpay
    }
  }
  
  render(){
    return (
      <div className="App">
        {this.checkZilpayConnection}
        <div> {`Current Contract Address : ${localStorage.getItem("contract_address")}`} </div>
        <h3>Update Contract Address</h3>
        <form onSubmit={this.handleSubmit}>
        <label>
          New Address <br/>
          <input type="text" onChange={this.handleChange} size="70"/>
        </label><br/>
        <input type="submit" value="Submit" />
        <hr></hr>
      </form>
      <div> Hello World Contract Transitions</div><br/>

        <label>
          Set Hello 
          </label><br/>
          <input type="text" onChange={this.handleHelloChange} size="30"/>
        <br/>
        <button onClick={this.setHello}>Set Hello</button><br/><br/>
        <label>
          Get Hello
        </label><br/>
        <button onClick={this.getHello}>Get Hello</button><br/><br/>
        <div> {`Current Welcome Msg : ${this.state.welcomeMsg}`} </div>
        <hr></hr>
        {!this.state.zilpayConnectStatus && <button onClick={this.connectZilpay}>Connect Zilpay</button>}
        <br/><br/>
      </div>
      
    );
  }

}

// sendTransaction = async(contractAddress,recipientAddress, sendingAmount) => {
//   let zilliqa;
//   if(this.state.zilPayLogin =='true'){
//     zilliqa = window.zilPay;
//   }
//   else{
//     zilliqa = new Zilliqa('https://dev-api.zilliqa.com');
//     let privkey = localStorage.getItem("private_key");
//     zilliqa.wallet.addByPrivateKey(privkey);
// }

// const CHAIN_ID = 333;
// const MSG_VERSION = 1;
// const VERSION = bytes.pack(CHAIN_ID, MSG_VERSION);


// const myGasPrice = units.toQa('1000', units.Units.Li); // Gas Price that will be used by all transactions
// // let contractAddress = this.state.contractAddress;
// contractAddress = contractAddress.substring(2);
// // let recipientAddress = this.state.recipientAddress;
// recipientAddress = fromBech32Address(recipientAddress);//converting to ByStr20 format
// const ftAddr = toBech32Address(contractAddress);
// try {
//     const contract = zilliqa.contracts.at(ftAddr);
//     const callTx = await contract.call(
//         'Transfer',
//         [
//             {
//                 vname: 'to',
//                 type: 'ByStr20',
//                 value: recipientAddress,
//             },
//             {
//                 vname: 'amount',
//                 type: 'Uint128',
//                 value: sendingAmount,
//             }
//         ],
//         {
//             // amount, gasPrice and gasLimit must be explicitly provided
//             version: VERSION,
//             amount: new BN(0),
//             gasPrice: myGasPrice,
//             gasLimit: Long.fromNumber(10000),
//         }
//     );
//     console.log(JSON.stringify(callTx.receipt, null, 4));

// } catch (err) {
//     console.log(err);
// }
// }