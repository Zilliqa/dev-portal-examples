import React, { useState, useEffect } from "react";
import "./styles.css";
import { Magic } from "magic-sdk";
import { ZilliqaExtension } from "@magic-ext/zilliqa";
const {Zilliqa} = require('@zilliqa-js/zilliqa');
const { BN, Long, bytes, units } = require('@zilliqa-js/util');
let zilliqa = new Zilliqa('https://dev-api.zilliqa.com');

const magic = new Magic("pk_test_EDF0307A9991979E", {
  extensions: {
    zilliqa: new ZilliqaExtension({
      rpcUrl: 'https://dev-api.zilliqa.com'
    })
  }
});

export default function App() {
  const [email, setEmail] = useState("");
  const [publicAddress, setPublicAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [sendZilAmount, setSendZilAmount] = useState(0);
  const [contractTxHash, setContractTxHash] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMetadata, setUserMetadata] = useState({});
  const [txHash, setTxHash] = useState("");
  const [sendingTransaction, setSendingTransaction] = useState(false);
  const [deployingContract, setDeployingContract] = useState(false);

  useEffect(() => {
    magic.user.isLoggedIn().then(async magicIsLoggedIn => {
      setIsLoggedIn(magicIsLoggedIn);
      if (magicIsLoggedIn) {
        const publicAddress = (await magic.zilliqa.getWallet()).bech32Address;
        setPublicAddress(publicAddress);
        setUserMetadata(await magic.user.getMetadata());
      }
    });
  }, [isLoggedIn]);

  const login = async () => {
    await magic.auth.loginWithMagicLink({ email });
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await magic.user.logout();
    setIsLoggedIn(false);
  };

  const handlerSendTransaction = async () => {
    const chainId = 333; // chainId of the developer testnet, chaindId = 1 for mainnet
    const msgVersion = 1; // current msgVersion
    const VERSION = bytes.pack(chainId, msgVersion);

    const myGasPrice = units.toQa('2000', units.Units.Li);

    const params = {
      version: VERSION,
      toAddr: destinationAddress,
      amount: (new BN(units.toQa(sendZilAmount, units.Units.Zil))), // Sending an amount in Zil (1) and converting the amount to Qa
      gasPrice: myGasPrice, // Minimum gasPrice veries. Check the `GetMinimumGasPrice` on the blockchain
      gasLimit: Long.fromNumber(1),
    };

    setSendingTransaction(true);

    const tx = await magic.zilliqa.sendTransaction(
        params,
        false,
    );

    setSendingTransaction(false);

    setTxHash(tx.id);

    console.log('send transaction', tx)
  };

  const handleDeployContract = async () => {
    const wallet = await magic.zilliqa.getWallet();

    const address = wallet.address;

    const code = `scilla_version 0

    (* HelloWorld contract *)

    import ListUtils

    (***************************************************)
    (*               Associated library                *)
    (***************************************************)
    library HelloWorld

    let not_owner_code = Int32 1
    let set_hello_code = Int32 2

    (***************************************************)
    (*             The contract definition             *)
    (***************************************************)

    contract HelloWorld
    (owner: ByStr20)

    field welcome_msg : String = ""

    transition setHello (msg : String)
      is_owner = builtin eq owner _sender;
      match is_owner with
      | False =>
        e = {_eventname : "setHello()"; code : not_owner_code};
        event e
      | True =>
        welcome_msg := msg;
        e = {_eventname : "setHello()"; code : set_hello_code};
        event e
      end
    end


    transition getHello ()
        r <- welcome_msg;
        e = {_eventname: "getHello()"; msg: r};
        event e
    end`;

    const init = [
      // this parameter is mandatory for all init arrays
      {
        vname: '_scilla_version',
        type: 'Uint32',
        value: '0',
      },
      {
        vname: 'owner',
        type: 'ByStr20',
        value: `${address}`,
      },
    ];

    const chainId = 333; // chainId of the developer testnet
    const msgVersion = 1; // current msgVersion
    const VERSION = bytes.pack(chainId, msgVersion);

    const myGasPrice = units.toQa('2000', units.Units.Li);

    const params = {
      version: VERSION,
      gasPrice: myGasPrice,
      gasLimit: Long.fromNumber(10000),
    }
    setDeployingContract(true);

    const result = await magic.zilliqa.deployContract(
        init, code, params, 33, 1000, false
    )

    setDeployingContract(false);

    setContractTxHash(result.id);

    console.log('deploy contract', result);
  };

  const handleCallContract = async () => {

    const newMsg = 'Hello, test call contract' ;

    const chainId = 333; // chainId of the developer testnet
    const msgVersion = 1; // current msgVersion
    const VERSION = bytes.pack(chainId, msgVersion);

    const myGasPrice = units.toQa('2000', units.Units.Li);

    const params = {
      // amount, gasPrice and gasLimit must be explicitly provided
      version: VERSION,
      amount: new BN(0),
      gasPrice: myGasPrice,
      gasLimit: Long.fromNumber(8000),
    }

    const args = [
      {
        vname: 'msg',
        type: 'String',
        value: newMsg,
      },
    ];

    const contractAddress = '0x92867f6C65933bADB3F3e02A36Cf3ad85fE5155b';

    const result = await magic.zilliqa.callContract(
        'setHello', args, params, 33, 1000, false, contractAddress
    );

    console.log('call contract', result)

  };

  return (
    <div className="App">
      {!isLoggedIn ? (
        <div className="container">
          <h1>Please sign up or login</h1>
          <input
            type="email"
            name="email"
            required="required"
            placeholder="Enter your email"
            onChange={event => {
              setEmail(event.target.value);
            }}
          />
          <button onClick={login}>Send</button>
        </div>
      ) : (
        <div>
          <div className="container">
            <h1>Current user: {userMetadata.email}</h1>
            <button onClick={logout}>Logout</button>
          </div>
          <div className="container">
            <h1>Zilliqa address</h1>
            <div className="info">
              <a
                href={`https://viewblock.io/zilliqa/address/${publicAddress}?network=testnet`}
                target="_blank"
              >
                {publicAddress}
              </a>
            </div>
          </div>
          <div className="container">
            <h1>Send Transaction</h1>
            {txHash ? (
              <div>
                <div>Send transaction success</div>
                <div className="info">
                  <a
                    href={`https://viewblock.io/zilliqa/tx/${txHash}?network=testnet`}
                    target="_blank"
                  >
                    {txHash}
                  </a>
                </div>
              </div>
            ) : sendingTransaction ? (<div className="sending-status">
              Sending transaction
            </div>) : (
              <div />
            )}
            <input
              type="text"
              name="destination"
              className="full-width"
              required="required"
              placeholder="Destination address"
              onChange={event => {
                setDestinationAddress(event.target.value);
              }}
            />
            <input
              type="text"
              name="amount"
              className="full-width"
              required="required"
              placeholder="Amount in Zil"
              onChange={event => {
                setSendZilAmount(event.target.value);
              }}
            />
            <button id="btn-send-txn" onClick={handlerSendTransaction}>
              Send Transaction
            </button>
          </div>
          <div className="container">
            <h1>Smart Contract</h1>
            {
              deployingContract ? <div className="sending-status">
                Deploying contract
              </div> : ''
            }
            <div className="info">
              <a
                href={`https://viewblock.io/zilliqa/tx/${contractTxHash}?network=testnet`}
                target="_blank"
              >
                {contractTxHash}
              </a>
            </div>
            <button id="btn-deploy" onClick={handleDeployContract}>
              Deploy Contract
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
