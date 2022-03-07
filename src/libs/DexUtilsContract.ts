import Web3 from "web3";
import { AbiItem } from "web3-utils";

export default function DexUtils(web3: Web3, contractAddy: string) {
  return new web3.eth.Contract(abi, contractAddy);
}

const abi: AbiItem[] = [
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "getMainPriceViaNativePair",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
