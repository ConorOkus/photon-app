import Clipboard from '@react-native-community/clipboard';
import {ElectrumClient} from '@photon-sdk/photon-lib';

import store from '../store';
import * as nav from './nav';
import * as alert from './alert';
import * as walletLib from './wallet';

export async function initSendAddress() {
  store.send.value = null;
  store.send.address = null;
  await fetchFeeRate();
}

export async function fetchFeeRate() {
  try {
    await ElectrumClient.waitTillConnected();
    const satPerByte = await ElectrumClient.estimateFee(1);
    store.send.feeRate = String(satPerByte);
  } catch (err) {
    console.error(err);
  }
}

export function isAddress(str) {
  return /^[a-zA-Z0-9]{26,90}$/.test(str);
}

export async function pasteAddress() {
  const address = await Clipboard.getString();
  if (!isAddress(address)) {
    return alert.error({message: 'Invalid address!'});
  }
  store.send.address = address;
  nav.goTo('SendAmount');
}

export function setAmount(value) {
  store.send.value = value;
}

export function setFeeRate(feeRate) {
  store.send.feeRate = feeRate;
}

export async function validateAmount() {
  try {
    nav.goTo('SendWait', {
      message: 'Checking...',
    });
    await createTransaction();
    nav.goTo('SendConfirm');
  } catch (err) {
    nav.goTo('SendAmount');
    alert.error({err});
  }
}

export async function createTransaction() {
  let {value, feeRate, address} = store.send;
  value = parseInt(value, 10);
  feeRate = parseInt(feeRate, 10);
  const wallet = walletLib.getWallet();
  await wallet.fetchUtxo();
  const utxo = wallet.getUtxo();
  const target = [{value, address}];
  const changeTo = await wallet.getAddressAsync();
  store.send.newTx = wallet.createTransaction(utxo, target, feeRate, changeTo);
}

export async function validateSend() {
  try {
    nav.goTo('SendSuccess');
    await broadcastTransaction();
    await new Promise(res => setTimeout(res, 5000));
    await walletLib.update();
  } catch (err) {
    nav.goTo('SendConfirm');
    alert.error({err});
  }
}

export async function broadcastTransaction() {
  const {newTx} = store.send;
  const wallet = walletLib.getWallet();
  await wallet.broadcastTx(newTx.tx.toHex());
}