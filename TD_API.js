// Run `npm init`, then `npm install request request-debug request-promise-native --save`
"use strict";

const util = require('util') // for printing objects
const req = require('request-promise-native'); // use Request library + promises to reduce lines of code
//req.debug = true
//require('request-debug')(req);

const teamToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJDQlAiLCJ0ZWFtX2lkIjoiYWIwYWI3MjItNDVhZC0zYzliLThkZGEtZmY1YmY3OGI5NjQ4IiwiZXhwIjo5MjIzMzcyMDM2ODU0Nzc1LCJhcHBfaWQiOiJkOTg5NjhlZi1kMzg5LTRhZDYtYjRiMy0yZjg5MGUyMjlhOTUifQ.eLoF6sJCoLTiNfEsWMvkobJDv7J9NTOJn2-76Q--qVA";
const initialCustomerId = "d98968ef-d389-4ad6-b4b3-2f890e229a95_93a8cf46-185c-4f9b-8cec-5b66c776a1f1";

function options(method, uri, body = null) {
  return {
    json: true,
    body: body,
    uri: 'https://api.td-davinci.com/api/' + uri,
    method: method,
    headers: { 'Authorization': teamToken }
  };
}

(async () => {
  await req(options('GET', 'customers/' + initialCustomerId))
    .then((resp) => {
      const cust = resp.result;
      console.log("\nCustomer\n- Name: " + cust.givenName + " " + cust.surname);
      console.log("- Address: " + util.inspect(cust.addresses.principalResidence));
    }, handleError)

  const [creditCardId, bankAccountId] = await req(options('GET', 'customers/' + initialCustomerId + '/accounts'))
    .then((resp) => {
      return [resp.result.creditCardAccounts[0].id, resp.result.bankAccounts[0].id];
    }, handleError)

  await req(options('GET', 'accounts/' + creditCardId))
    .then((resp) => {
      const cc = resp.result.creditCardAccount;
      console.log("\nCredit Card\n- Number: " + cc.maskedNumber);
      console.log("- Balance: " + cc.balance);
    }, handleError)

  await req(options('GET', 'accounts/' + bankAccountId))
    .then((resp) => {
      const acct = resp.result.bankAccount;
      console.log("\nBank Account\n- Number: " + acct.maskedAccountNumber);
      console.log("- Balance: " + acct.balance);
    }, handleError)

  const tranId = await req(options('GET', 'accounts/' + creditCardId + "/transactions"))
    .then((resp) => {
      return resp.result[0].id;
    }, handleError)

  await req(options('GET', 'transactions/' + tranId))
    .then((resp) => {
      const tran = resp.result;
      console.log("\nCredit Card Transaction\n- $" + tran.currencyAmount);
      console.log("- Timestamp: " + tran.originationDateTime);
      console.log("- Merchant: " + tran.merchantName);
      console.log("- Description: " + tran.description);
      console.log("- Lat/Lon: " + tran.locationLatitude + "/" + tran.locationLongitude);
      console.log("- Tags: " + util.inspect(tran.categoryTags));
    }, handleError)

  const randomNum = Math.floor(Math.random() * 112357) + 1;
  const newTagArray = ["tag" + randomNum.toString()];
  await req(options('PUT', 'transactions/' + tranId + '/tags', newTagArray))
    .then((resp) => {
      console.log("\n***TAGS NOW UPDATED***");
      const tran = resp.result;
      console.log("\nCredit Card Transaction\n- $" + tran.currencyAmount);
      console.log("- Timestamp: " + tran.originationDateTime);
      console.log("- Merchant: " + tran.merchantName);
      console.log("- Description: " + tran.description);
      console.log("- Lat/Lon: " + tran.locationLatitude + "/" + tran.locationLongitude);
      console.log("- Tags: " + util.inspect(tran.categoryTags));
    }, handleError)

  await req(options('GET', 'customers/' + initialCustomerId + '/transactions'))
    .then((resp) => {
      console.log("\nCustomer had " + resp.result.length + " total transactions");
    }, handleError)

  const branchId = await req(options('GET', 'customers/' + initialCustomerId + '/accounts'))
    .then((resp) => {
      const cc = resp.result.creditCardAccounts[0];
      const acct1 = resp.result.bankAccounts[0];
      const acct2 = resp.result.bankAccounts[1];
      console.log("\nCustomer has $" + acct1.balance + " + $" + acct2.balance + " - $" + cc.balance);
      console.log("- Net worth: $" + (acct1.balance + acct2.balance - cc.balance));
      return resp.result.bankAccounts[0].branchNumber;
    }, handleError)

  await req(options('GET', 'branches/' + branchId))
    .then((resp) => {
      console.log("\nCustomer has an account with a TD branch at " + resp.result.address);
    }, handleError)

  const appAccountId = await req(options('GET', 'accounts/self'))
    .then((resp) => {
      console.log("\nYour app has $" + resp.result.balance + " in its account ready to use");
      return resp.result.id;
    }, handleError);

  const xfer = {
    "amount": 1,
    "currency": "CAD",
    "fromAccountID": appAccountId,
    "toAccountID": bankAccountId,
    "receipt": "{ \"Note\": \"Thanks for being such a loyal user of my app!\" }",
  }
  const transferReceiptId = await req(options('POST', 'transfers', xfer))
    .then((resp) => {
      return resp.result.id;
    }, handleError);

  await req(options('GET', 'accounts/self'))
    .then((resp) => {
      console.log("\nYour app now has $" + resp.result.balance + " in its account after a transfer");
    }, handleError);

  await req(options('GET', 'transfers/' + transferReceiptId))
    .then((resp) => {
      console.log("\nReceipt from our money transfer: " + util.inspect(resp.result));
    }, handleError)
})();

function handleError(err) {
  let outErr = err;
  if (err.response) {
    if (err.response.body) {
      outErr = err.response.body;
      console.dir(outErr.errorDetails);
    } else {
      outErr = err.response;
    }
  }
  console.dir(outErr);
  process.exit(1);
}