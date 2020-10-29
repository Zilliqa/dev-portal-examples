import React from 'react';
import './App.css';
import { decryptPrivateKey, getAddressFromPrivateKey } from '@zilliqa-js/crypto';

const {Zilliqa} = require('@zilliqa-js/zilliqa');
const zilliqa = new Zilliqa('https://dev-api.zilliqa.com');
const {BN, Long, bytes, units} = require('@zilliqa-js/util');
const {toBech32Address, fromBech32Address} = require('@zilliqa-js/crypto');
const { StatusType, MessageType } = require('@zilliqa-js/subscriptions');

export default class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      tokenContractAddress:"",
      userAddress:"",
      passphrase:"",
      sendingAddress:"",
      sendingAmount:0,
      encryptedWallet: "",
      privateKey:"",
      zilBalance:null,
      tokenBalance:null,
      sendBtnText:"Send"
    };
    this.handleAddressChange = this.handleAddressChange.bind(this);
    this.handlePassphraseChange = this.handlePassphraseChange.bind(this);
    this.handleSendingAddressChange = this.handleSendingAddressChange.bind(this);
    this.handleSendingAmountChange = this.handleSendingAmountChange.bind(this);
    this.onChangeHandler = this.onChangeHandler.bind(this);
    this.handleTokenAddressSubmit = this.handleTokenAddressSubmit.bind(this);
    this.handleKeystoreSubmit = this.handleKeystoreSubmit.bind(this);
    this.fetchZilBalance = this.fetchZilBalance.bind(this);
    this.fetchTokenBalance = this.fetchTokenBalance.bind(this);
    this.sendTransaction = this.sendTransaction.bind(this);
  }

  componentDidMount() {
    this.fetchZilBalance();
    this.fetchTokenBalance();
    this.eventLogSubscription();
  }

  handleAddressChange(event) {
    this.setState({tokenContractAddress: event.target.value});
  }

  handlePassphraseChange(event) {
    this.setState({ passphrase: event.target.value });
  }
  handleSendingAddressChange(event) {
    this.setState({ sendingAddress: event.target.value });
  }

  handleSendingAmountChange(event) {
    this.setState({ sendingAmount: event.target.value });
  }

  onChangeHandler(e){
    // this.setState({
    //   selectedFile: event.target.files[0]
    // })
    let file = e.target.files[0];
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onload = event => {
      this.setState({ encryptedWallet: event.target.result});
    }   
  }

  handleTokenAddressSubmit() {
    localStorage.setItem("token_contract_address", this.state.tokenContractAddress);
  }
  
  handleKeystoreSubmit = async() => {
    try {
      let keystore = JSON.parse(this.state.encryptedWallet);
      const pk = await decryptPrivateKey(this.state.passphrase, keystore);
      if(pk){
      localStorage.setItem("private_key", pk);
      const address =  getAddressFromPrivateKey(pk);
      localStorage.setItem("userAddress", address);
      }else{
        alert("Keystore/Passphrase is invalid")
      }
    } catch (error) {
    }
  }
  fetchZilBalance = async() => {
    //Zilliqa Balance
    try {
      let userAddress = localStorage.getItem("userAddress");
      userAddress = userAddress.substring(2);
      let balanceState = await zilliqa.blockchain.getBalance(userAddress);
      if(balanceState){
        let balance = balanceState.result.balance;
        balance = units.fromQa(new BN(balance), units.Units.Zil);
        this.setState({ zilBalance: balance });
      }
    } catch (error) {
    }
}
fetchTokenBalance = async() => {
  //Token Balance
  try {
    let contractAddress = localStorage.getItem("token_contract_address");
    let smartContractState = await zilliqa.blockchain.getSmartContractState(contractAddress);
    if(smartContractState){
      let balances_map = smartContractState.result.balances_map;
      let userAddress = localStorage.getItem("userAddress");
      userAddress = userAddress.toLowerCase();
      let userTokenBalance = balances_map[userAddress];
      if(userTokenBalance){
        this.setState({ tokenBalance: userTokenBalance });
      }
      else{
        //User has 0 token balance
        this.setState({ tokenBalance: 0 });
      }
      
    }
  } catch (error) {
  }

}

sendTransaction = async() => {
  this.setState({sendBtnText: "Sending..."})
  let contractAddress = localStorage.getItem("token_contract_address");
  let recipientAddress = this.state.sendingAddress;
  let sendingAmount = this.state.sendingAmount;
  let privkey = localStorage.getItem("private_key");
  zilliqa.wallet.addByPrivateKey(privkey);

  const CHAIN_ID = 333;
  const MSG_VERSION = 1;
  const VERSION = bytes.pack(CHAIN_ID, MSG_VERSION);


  const myGasPrice = units.toQa('2000', units.Units.Li); // Gas Price that will be used by all transactions
  contractAddress = contractAddress.substring(2);
  recipientAddress = fromBech32Address(recipientAddress);//converting to ByStr20 format
  const ftAddr = toBech32Address(contractAddress);
try {
    const contract = zilliqa.contracts.at(ftAddr);
    const callTx = await contract.call(
        'Transfer',
        [
            {
                vname: 'to',
                type: 'ByStr20',
                value: recipientAddress,
            },
            {
                vname: 'amount',
                type: 'Uint128',
                value: sendingAmount,
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
    console.log(JSON.stringify(callTx.TranID));
    window.location.reload(false);

} catch (err) {
    console.log(err);
}
}

async eventLogSubscription() {
  if(localStorage.getItem("token_contract_address")){
  const zilliqa = new Zilliqa('https://dev-api.zilliqa.com');
  const subscriber = zilliqa.subscriptionBuilder.buildEventLogSubscriptions(
    'wss://dev-ws.zilliqa.com',
    {
      // smart contract address you want to listen on  
      addresses: [localStorage.getItem("token_contract_address")],
    },
  );
  
  subscriber.emitter.on(StatusType.SUBSCRIBE_EVENT_LOG, (event) => {
    // if subscribe success, it will echo the subscription info
    console.log('get SubscribeEventLog echo : ', event);
  });
  
  subscriber.emitter.on(MessageType.EVENT_LOG, (event) => {
    this.fetchTokenBalance();
  });  
  await subscriber.start();
}
}

  render(){
    return (
      <div className="App">
        <div> {`Current Token Contract Address : ${localStorage.getItem("token_contract_address")||""}`} </div>
        <p>Update Token Contract Address</p>
        <form onSubmit={this.handleTokenAddressSubmit}>
        <label>
          New Address <br/>
          <input type="text" onChange={this.handleAddressChange} size="65" placeholder="Format: 0x47d9CEea9a2DA23dc6b2D96A16F7Fbf884580665"/>
        </label><br/>
        <input type="submit" value="Submit" />
        <hr/>
      </form>
      <p> {`Current User Address : ${localStorage.getItem("userAddress") && toBech32Address(localStorage.getItem("userAddress"))||""}`} <br/>
      ByStr20 Address : {localStorage.getItem("userAddress")}<br/>
      Zilliqa Balance : {this.state.zilBalance}<br/>
      Token Balance : {this.state.tokenBalance}
      </p>
      <p>Upload Keystore File</p>
      <input type="file" name="file" onChange={(event)=>this.onChangeHandler(event)}/>
      <br/>
      <form onSubmit={this.handleKeystoreSubmit}>
        <label>
          Passphrase <br/>
          <input type="password" onChange={this.handlePassphraseChange} size="20"/>
        </label><br/>
        <input type="submit" value="Submit" />
      </form>
      <hr/>
      <p>
     Send Token
      </p>
        <label>
          To <br/>
          <input type="text" onChange={this.handleSendingAddressChange} size="55" placeholder = "Format: zil1rqtyx6k67g0ewhqwfdv8ewkyh7g2y7gyzl4zhf"/>
        </label><br/>
        <label>
          Amount <br/>
          <input type="text" onChange={this.handleSendingAmountChange} size="25" placeholder = "Amount < Token Balance"/>
        </label><br/>
        <button onClick={this.sendTransaction}>{this.state.sendBtnText}</button><br/><br/>
      </div>
      
    );
  }

}
