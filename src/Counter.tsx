import {
  useCurrentAccount,
  useSignAndExecuteTransactionBlock,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import type { SuiObjectData } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Button, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { useNetworkVariable } from "./networkConfig";
import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import React, { useState } from 'react';



const client = new SuiClient({ url: getFullnodeUrl('testnet') });
// declare var TREASURYADDR : string;

// type MyDataType = {
//   "jsonrpc": string,
//   "result": {
//     "loadedChildObjects": [
//       {
//         "objectId": string,
//         "sequenceNumber": string
//       },
//       {
//         "objectId": string,
//         "sequenceNumber": string
//       },
//       {
//         "objectId": string,
//         "sequenceNumber": string
//       }
//     ]
//   },
//   "id": number
// };

export function Counter({ id }: { id: string }) {

  // const [pt, setpt] = useState('');

  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const counterPackageId = useNetworkVariable("counterPackageId");
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();
  const { data, isPending, error, refetch } = useSuiClientQuery("getObject", {
    id,
    options: {
      showContent: true,
      showOwner: true,
    },
  });


  const executeMoveCall = (method: "rebase" | "reset", publicTreasury: string, wrappedCoin: string) => {
    const txb = new TransactionBlock();

    if (method === "reset") {
      txb.moveCall({
        arguments: [txb.object(id), txb.pure.u64(0)],
        target: `${counterPackageId}::counter::set_value`,
      });
    } else {
      // console.log("attmepting", publicTreasury, wrappedCoin);
      // console.log([txb.object("0x6"), txb.object("0x58569de4cbe1208623e235774460569b7708f8e0a8643cbd96a2713fb1b1da03"), txb.object(wrappedCoin) ]);
      txb.moveCall({
        arguments: [ txb.object("0x6"), txb.object("0x2595320055d8a3f2eba51541b78b28e1236209678798e4965fac24c02aead47d"), txb.object(wrappedCoin) ],
        target: `${counterPackageId}::interestcoin::rebase`,
      });
    }

    signAndExecute(
      {
        transactionBlock: txb,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      },
      {
        onSuccess: (tx) => {
          client.waitForTransactionBlock({ digest: tx.digest }).then(() => {
            refetch();
          });
        },
      },
    );
  };

  if (isPending) return <Text>Loading...</Text>;

  if (error) return <Text>Error: {error.message}</Text>;

  if (!data.data) return <Text>Not found</Text>;

//executeMoveCall("rebase", "sdf", "df")
//executeMoveCall("rebase", TREASURYADDR, id)
// function findaddr() {
//   return TREASURYADDR;
// }
  const evalRebase = () => {
    executeMoveCall("rebase", "hi", id);
  }

  return (
    <>
      <Heading size="3">Wrapped Coin ID: {id}</Heading>

      <Flex direction="column" gap="2">
      <Text>Current Amount: {getCounterFields(data.data)?.current_balance}</Text>
        <Flex direction="row" gap="2">

        {/* <TextField.Root id="pt">
        <TextField.Input
          placeholder="Paste in the Public Treasury Address"
          onChange={(e) => setpt(e.target.value)}
        />
      </TextField.Root> */}
          <Button onClick={evalRebase}>
            Rebase
          </Button>
          {/* <Button onClick={getPubTreasury(TREASURYADDR)}>
            Get PublicTreasury
          </Button> */}
        </Flex>
      </Flex>
    </>
  );
}
// function getPubTreasury(digest: string){
// console.log(digest);
//           (client.call("sui_getLoadedChildObjects", [digest]) as Promise<MyDataType>).then((resp) => {
//             console.log(resp);
//             TREASURYADDR = resp.result.loadedChildObjects[2].objectId;
//           });
// }


function getCounterFields(data: SuiObjectData) {
  if (data.content?.dataType !== "moveObject") {
    return null;
  }
  // getPubTreasury(data.digest);
  return data.content.fields;
}
